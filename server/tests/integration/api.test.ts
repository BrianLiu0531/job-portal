import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { env } from '../../src/env.js';
import { AnalysisUnavailableError, setAnalyzer, type Analyzer, type MatchAnalysis } from '../../src/lib/match.js';

const app = createApp();
const PASSWORD = 'password123';
let counter = 0;

async function signUp(role: 'SEEKER' | 'EMPLOYER', companyName = 'Acme Pty Ltd') {
  const agent = request.agent(app);
  const email = `${role.toLowerCase()}${++counter}@example.com`;
  const res = await agent
    .post('/api/auth/register')
    .send({ name: `${role} ${counter}`, email, password: PASSWORD, role, companyName });
  expect(res.status).toBe(201);
  return Object.assign(agent, { userId: res.body.user.id as string, email });
}

async function signUpAdmin() {
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@example.com', role: 'ADMIN', passwordHash: await bcrypt.hash(PASSWORD, 4) },
  });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'admin@example.com', password: PASSWORD }).expect(200);
  return agent;
}

const jobInput = {
  title: 'Junior React Developer',
  description: 'Join our product team building accessible web apps with React and TypeScript.',
  category: 'Software Engineering',
  country: 'AU',
  region: 'NSW',
  city: 'Sydney',
  workType: 'FULL_TIME',
  workplace: 'HYBRID',
  salaryMin: 80000,
  salaryMax: 95000,
  sponsorship: false,
};

async function postJob(employer: request.Agent, overrides: Partial<typeof jobInput> = {}) {
  const res = await employer.post('/api/employer/jobs').send({ ...jobInput, ...overrides });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

beforeAll(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth & roles', () => {
  it('registers an employer together with a company', async () => {
    const employer = await signUp('EMPLOYER', 'Kererū Fintech');
    const me = await employer.get('/api/auth/me').expect(200);
    expect(me.body.user).toMatchObject({ role: 'EMPLOYER', company: { name: 'Kererū Fintech' } });
  });

  it('does not allow self-registration as an admin', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: PASSWORD, role: 'ADMIN' })
      .expect(400);
  });

  it('requires a company name for employers', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Co', email: 'noco@example.com', password: PASSWORD, role: 'EMPLOYER' })
      .expect(400);
    expect(res.body.issues[0].path).toBe('companyName');
  });

  it('enforces role-based access', async () => {
    const seeker = await signUp('SEEKER');
    const employer = await signUp('EMPLOYER');
    await seeker.post('/api/employer/jobs').send(jobInput).expect(403);
    await employer.get('/api/seeker/applications').expect(403);
    await seeker.get('/api/admin/stats').expect(403);
    await request(app).get('/api/seeker/profile').expect(401);
  });
});

describe('job posting & search', () => {
  it('validates region and salary range', async () => {
    const employer = await signUp('EMPLOYER');
    const res = await employer
      .post('/api/employer/jobs')
      .send({ ...jobInput, country: 'NZ', region: 'NSW', salaryMin: 100000, salaryMax: 50000 })
      .expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(['region', 'salaryMax']);
  });

  it('filters by keyword, location, work type, salary and sponsorship', async () => {
    await prisma.job.deleteMany();
    const employer = await signUp('EMPLOYER', 'Southern Cross Software');
    await postJob(employer);
    await postJob(employer, { title: 'Nurse', description: 'Provide compassionate community care to patients across Auckland.', category: 'Healthcare', country: 'NZ', region: 'AKL', city: 'Auckland', workType: 'CASUAL', salaryMin: null as never, salaryMax: null as never, sponsorship: true });
    await postJob(employer, { title: 'Senior Platform Engineer', description: 'Own our cloud infrastructure, Kubernetes clusters and CI pipelines.', salaryMin: 150000, salaryMax: 180000, workplace: 'REMOTE' });

    const search = (q: string) => request(app).get(`/api/jobs?${q}`).expect(200).then((r) => r.body);

    expect((await search('q=react')).total).toBe(1);
    expect((await search('q=southern%20cross')).total).toBe(3); // matches company name
    expect((await search('country=NZ&region=AKL')).items[0].title).toBe('Nurse');
    expect((await search('workType=CASUAL')).total).toBe(1);
    expect((await search('workplace=REMOTE')).total).toBe(1);
    expect((await search('minSalary=120000')).items.map((j: { title: string }) => j.title)).toEqual(['Senior Platform Engineer']);
    expect((await search('sponsorship=true')).total).toBe(1);

    const bySalary = await search('sort=salary');
    expect(bySalary.items.map((j: { title: string }) => j.title)).toEqual(['Senior Platform Engineer', 'Junior React Developer', 'Nurse']);
    expect(bySalary.items[0].description).toBeUndefined(); // list payload omits long text
  });

  it('paginates results', async () => {
    const page = await request(app).get('/api/jobs?pageSize=2&page=2').expect(200);
    expect(page.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page.body.items).toHaveLength(1);
  });

  it('hides closed jobs from the public but not from their owner', async () => {
    const employer = await signUp('EMPLOYER');
    const job = await postJob(employer);
    await employer.patch(`/api/employer/jobs/${job.id}/status`).send({ status: 'CLOSED' }).expect(200);

    await request(app).get(`/api/jobs/${job.id}`).expect(404);
    const own = await employer.get(`/api/jobs/${job.id}`).expect(200);
    expect(own.body).toMatchObject({ status: 'CLOSED', isOwner: true });
  });

  it("prevents editing another employer's job", async () => {
    const owner = await signUp('EMPLOYER');
    const rival = await signUp('EMPLOYER');
    const job = await postJob(owner);
    await rival.put(`/api/employer/jobs/${job.id}`).send(jobInput).expect(404);
    await rival.get(`/api/employer/jobs/${job.id}/applications`).expect(404);
  });
});

describe('applications', () => {
  it('runs the full hiring workflow', async () => {
    const employer = await signUp('EMPLOYER');
    const seeker = await signUp('SEEKER');
    const job = await postJob(employer);

    await seeker
      .put('/api/seeker/profile')
      .send({ name: 'Alex Chen', headline: 'Junior dev', skills: ['React'], workRights: 'WORKING_HOLIDAY' })
      .expect(200);

    const applied = await seeker.post(`/api/jobs/${job.id}/apply`).send({ coverLetter: 'Keen to join!' }).expect(201);
    await seeker.post(`/api/jobs/${job.id}/apply`).send({}).expect(409);

    const detail = await seeker.get(`/api/jobs/${job.id}`).expect(200);
    expect(detail.body.applicationStatus).toBe('APPLIED');

    const list = await employer.get(`/api/employer/jobs/${job.id}/applications`).expect(200);
    expect(list.body.applications[0]).toMatchObject({
      coverLetter: 'Keen to join!',
      nextStatuses: ['REVIEWING', 'INTERVIEW', 'REJECTED'],
      seeker: { name: 'Alex Chen', seekerProfile: { workRights: 'WORKING_HOLIDAY', skills: ['React'] } },
    });

    await employer.patch(`/api/employer/applications/${applied.body.id}`).send({ status: 'OFFERED' }).expect(409);
    await employer.patch(`/api/employer/applications/${applied.body.id}`).send({ status: 'INTERVIEW' }).expect(200);

    const jobs = await employer.get('/api/employer/jobs').expect(200);
    expect(jobs.body[0].applicants).toEqual({ total: 1, new: 0 });

    const mine = await seeker.get('/api/seeker/applications').expect(200);
    expect(mine.body[0]).toMatchObject({ status: 'INTERVIEW', job: { title: 'Junior React Developer' } });

    await seeker.post(`/api/seeker/applications/${applied.body.id}/withdraw`).expect(200);
    await employer.patch(`/api/employer/applications/${applied.body.id}`).send({ status: 'OFFERED' }).expect(409);
  });

  it('rejects applications to closed jobs and from employers', async () => {
    const employer = await signUp('EMPLOYER');
    const seeker = await signUp('SEEKER');
    const job = await postJob(employer);
    await employer.post(`/api/jobs/${job.id}/apply`).send({}).expect(403);

    await employer.patch(`/api/employer/jobs/${job.id}/status`).send({ status: 'CLOSED' }).expect(200);
    await seeker.post(`/api/jobs/${job.id}/apply`).send({}).expect(409);
  });

  it("stops employers updating another company's applications", async () => {
    const owner = await signUp('EMPLOYER');
    const rival = await signUp('EMPLOYER');
    const seeker = await signUp('SEEKER');
    const job = await postJob(owner);
    const applied = await seeker.post(`/api/jobs/${job.id}/apply`).send({}).expect(201);
    await rival.patch(`/api/employer/applications/${applied.body.id}`).send({ status: 'REJECTED' }).expect(404);
  });

  it('saves and unsaves jobs', async () => {
    const employer = await signUp('EMPLOYER');
    const seeker = await signUp('SEEKER');
    const job = await postJob(employer);

    await seeker.put(`/api/jobs/${job.id}/save`).expect(204);
    await seeker.put(`/api/jobs/${job.id}/save`).expect(204); // idempotent
    const saved = await seeker.get('/api/seeker/saved').expect(200);
    expect(saved.body).toHaveLength(1);

    await seeker.delete(`/api/jobs/${job.id}/save`).expect(204);
    expect((await seeker.get('/api/seeker/saved')).body).toHaveLength(0);
  });
});

describe('admin', () => {
  it('reports platform stats', async () => {
    const admin = await signUpAdmin();
    const stats = await admin.get('/api/admin/stats').expect(200);
    expect(stats.body.usersByRole.ADMIN).toBe(1);
    expect(stats.body.jobsByStatus.OPEN).toBeGreaterThan(0);
  });

  it('suspends a user, which blocks their session and login immediately', async () => {
    const admin = request.agent(app);
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: PASSWORD }).expect(200);
    const seeker = await signUp('SEEKER');

    await admin.patch(`/api/admin/users/${seeker.userId}`).send({ suspended: true }).expect(200);
    await seeker.get('/api/seeker/profile').expect(403);
    await request(app).post('/api/auth/login').send({ email: seeker.email, password: PASSWORD }).expect(403);

    await admin.patch(`/api/admin/users/${seeker.userId}`).send({ suspended: false }).expect(200);
    await seeker.get('/api/seeker/profile').expect(200);
  });

  it('cannot suspend admins', async () => {
    const admin = request.agent(app);
    const login = await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: PASSWORD });
    await admin.patch(`/api/admin/users/${login.body.user.id}`).send({ suspended: true }).expect(400);
  });

  it('moderates job listings', async () => {
    const admin = request.agent(app);
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: PASSWORD }).expect(200);
    const employer = await signUp('EMPLOYER');
    const job = await postJob(employer, { title: 'Totally legit crypto job' });

    const found = await admin.get('/api/admin/jobs?search=crypto').expect(200);
    expect(found.body.items[0]).toMatchObject({ id: job.id, _count: { applications: 0 } });

    await admin.patch(`/api/admin/jobs/${job.id}`).send({ status: 'CLOSED' }).expect(200);
    const search = await request(app).get('/api/jobs?q=crypto').expect(200);
    expect(search.body.total).toBe(0);
  });
});

describe('job matching', () => {
  const analysis: MatchAnalysis = {
    score: 72,
    summary: 'You cover the core stack.',
    matchedSkills: ['React', 'TypeScript'],
    missingSkills: ['GraphQL'],
    strengths: ['Two React projects'],
    gaps: ['No GraphQL'],
    coverLetterTips: ['Mention your accessibility work'],
  };
  function fakeAnalyzer(impl: () => Promise<MatchAnalysis> = async () => analysis) {
    const analyzer: Analyzer = { model: 'test-model', analyze: vi.fn(impl) };
    setAnalyzer(analyzer);
    return analyzer;
  }
  async function seekerWithProfile(profile: Record<string, unknown> = {}) {
    const seeker = await signUp('SEEKER');
    await seeker
      .put('/api/seeker/profile')
      .send({ name: 'Sam', skills: ['React', 'TypeScript'], workRights: 'REQUIRES_SPONSORSHIP', resumeText: 'Built two React apps.', ...profile })
      .expect(200);
    return seeker;
  }

  afterEach(() => setAnalyzer(undefined));

  it('returns the AI analysis with code-checked eligibility, and caches identical requests', async () => {
    const analyzer = fakeAnalyzer();
    const job = await postJob(await signUp('EMPLOYER'));
    const seeker = await seekerWithProfile();

    const first = await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
    expect(first.body).toMatchObject({ ...analysis, source: 'ai', model: 'test-model', cached: false });
    // The job doesn't sponsor visas: decided by code, not by the model
    expect(first.body.eligibility).toEqual([expect.stringContaining('sponsorship')]);

    const again = await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
    expect(again.body).toMatchObject({ score: 72, cached: true });
    expect(analyzer.analyze).toHaveBeenCalledTimes(1);

    // Editing the profile makes it a new question
    await seeker.put('/api/seeker/profile').send({ name: 'Sam', skills: ['React', 'TypeScript', 'GraphQL'] }).expect(200);
    await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
    expect(analyzer.analyze).toHaveBeenCalledTimes(2);
  });

  it('shares one API call between concurrent identical requests', async () => {
    let release!: () => void;
    const analyzer = fakeAnalyzer(() => new Promise((r) => (release = () => r(analysis))));
    const job = await postJob(await signUp('EMPLOYER'));
    const seeker = await seekerWithProfile();

    const both = Promise.all([seeker.post(`/api/seeker/jobs/${job.id}/match`), seeker.post(`/api/seeker/jobs/${job.id}/match`)]);
    await vi.waitFor(() => expect(analyzer.analyze).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 100)); // give the second request time to arrive
    release();
    const [a, b] = await both;
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(analyzer.analyze).toHaveBeenCalledTimes(1);
    expect(await prisma.jobMatch.count({ where: { jobId: job.id } })).toBe(1);
  });

  it('falls back to keyword matching without an API key, over the daily limit, or when the API fails', async () => {
    const job = await postJob(await signUp('EMPLOYER'));
    const seeker = await seekerWithProfile();

    setAnalyzer(null);
    const noKey = await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
    expect(noKey.body).toMatchObject({ source: 'keyword', matchedSkills: ['React', 'TypeScript'], score: 100 });
    expect(noKey.body.notice).toMatch(/isn’t configured/);

    fakeAnalyzer(async () => {
      throw new AnalysisUnavailableError('declined');
    });
    const failed = await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
    expect(failed.body).toMatchObject({ source: 'keyword' });
    expect(failed.body.notice).toMatch(/unavailable/);
    expect(await prisma.jobMatch.count({ where: { jobId: job.id } })).toBe(0); // failures aren't cached or counted

    const limit = env.MATCH_USER_DAILY_LIMIT;
    env.MATCH_USER_DAILY_LIMIT = 1;
    try {
      const analyzer = fakeAnalyzer();
      const other = await postJob(await signUp('EMPLOYER'));
      await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
      const over = await seeker.post(`/api/seeker/jobs/${other.id}/match`).expect(200);
      expect(over.body.source).toBe('keyword');
      expect(over.body.notice).toMatch(/today’s 1 AI analyses/);
      // An analysis the seeker already has is still served from the cache
      const cached = await seeker.post(`/api/seeker/jobs/${job.id}/match`).expect(200);
      expect(cached.body).toMatchObject({ source: 'ai', cached: true });
      expect(analyzer.analyze).toHaveBeenCalledTimes(1);
    } finally {
      env.MATCH_USER_DAILY_LIMIT = limit;
    }
  });

  it('needs a profile, an open job and the seeker role, and keeps the résumé text from employers', async () => {
    fakeAnalyzer();
    const employer = await signUp('EMPLOYER');
    const job = await postJob(employer);
    const empty = await signUp('SEEKER');
    const res = await empty.post(`/api/seeker/jobs/${job.id}/match`).expect(400);
    expect(res.body.error).toMatch(/profile/);
    await employer.post(`/api/seeker/jobs/${job.id}/match`).expect(403);

    const seeker = await seekerWithProfile();
    await seeker.post('/api/seeker/jobs/nope/match').expect(404);
    await seeker.post(`/api/jobs/${job.id}/apply`).send({}).expect(201);
    const list = await employer.get(`/api/employer/jobs/${job.id}/applications`).expect(200);
    expect(list.body.applications[0].seeker.seekerProfile.skills).toEqual(['React', 'TypeScript']);
    expect(list.body.applications[0].seeker.seekerProfile).not.toHaveProperty('resumeText');
  });
});
