import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@example.com', password: 'Admin1234!' },
  employer: { email: 'employer@example.com', password: 'Employer1234!' },
  seeker: { email: 'seeker@example.com', password: 'Seeker1234!' },
};

// All companies are fictional
const companies = [
  { name: 'Southern Cross Software', location: 'Sydney, NSW', website: 'https://example.com/southern-cross', description: 'We build scheduling software used by 2,000+ clinics across Australia.' },
  { name: 'Harbour Health Group', location: 'Melbourne, VIC', website: null, description: 'Community healthcare provider with 40 clinics in Victoria and NSW.' },
  { name: 'Kererū Fintech', location: 'Auckland', website: 'https://example.com/kereru', description: 'Payments infrastructure for small businesses in Aotearoa New Zealand.' },
  { name: 'Outback Freight Co.', location: 'Brisbane, QLD', website: null, description: 'Road and rail logistics connecting regional Queensland.' },
  { name: 'Pōhutukawa Digital', location: 'Wellington', website: 'https://example.com/pohutukawa', description: 'Digital agency crafting accessible websites for government and NGOs.' },
];

type JobSeed = Omit<Prisma.JobCreateManyInput, 'companyId' | 'description'> & { company: number; daysAgo: number };

const jobs: JobSeed[] = [
  { company: 0, daysAgo: 1, title: 'Graduate Software Engineer', category: 'Software Engineering', country: 'AU', region: 'NSW', city: 'Sydney', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 75000, salaryMax: 90000, sponsorship: false },
  { company: 0, daysAgo: 3, title: 'Senior React Developer', category: 'Software Engineering', country: 'AU', region: 'NSW', city: 'Sydney', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 150000, salaryMax: 180000, sponsorship: true },
  { company: 0, daysAgo: 6, title: 'QA Automation Engineer', category: 'Software Engineering', country: 'AU', region: 'NSW', city: 'Sydney', workType: 'CONTRACT', workplace: 'REMOTE', salaryMin: 110000, salaryMax: 130000, sponsorship: false },
  { company: 0, daysAgo: 12, title: 'Product Designer', category: 'Design', country: 'AU', region: 'NSW', city: 'Sydney', workType: 'FULL_TIME', workplace: 'ONSITE', salaryMin: 105000, salaryMax: 125000, sponsorship: false },
  { company: 0, daysAgo: 20, title: 'IT Support Officer', category: 'IT Support', country: 'AU', region: 'NSW', city: 'Parramatta', workType: 'PART_TIME', workplace: 'ONSITE', salaryMin: 65000, salaryMax: 72000, sponsorship: false },
  { company: 1, daysAgo: 2, title: 'Registered Nurse — Community Care', category: 'Healthcare', country: 'AU', region: 'VIC', city: 'Melbourne', workType: 'FULL_TIME', workplace: 'ONSITE', salaryMin: 85000, salaryMax: 98000, sponsorship: true },
  { company: 1, daysAgo: 5, title: 'Medical Receptionist', category: 'Administration', country: 'AU', region: 'VIC', city: 'Geelong', workType: 'CASUAL', workplace: 'ONSITE', salaryMin: null, salaryMax: null, sponsorship: false },
  { company: 1, daysAgo: 9, title: 'Data Analyst — Patient Outcomes', category: 'Data & Analytics', country: 'AU', region: 'VIC', city: 'Melbourne', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 100000, salaryMax: 120000, sponsorship: false },
  { company: 1, daysAgo: 15, title: 'Payroll Officer', category: 'Accounting & Finance', country: 'AU', region: 'NSW', city: 'Newcastle', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 70000, salaryMax: 80000, sponsorship: false },
  { company: 2, daysAgo: 1, title: 'Backend Engineer (Node.js)', category: 'Software Engineering', country: 'NZ', region: 'AKL', city: 'Auckland', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 120000, salaryMax: 150000, sponsorship: true },
  { company: 2, daysAgo: 4, title: 'Junior Full Stack Developer', category: 'Software Engineering', country: 'NZ', region: 'AKL', city: 'Auckland', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 70000, salaryMax: 85000, sponsorship: false },
  { company: 2, daysAgo: 8, title: 'Customer Success Specialist', category: 'Customer Service', country: 'NZ', region: 'AKL', city: 'Auckland', workType: 'FULL_TIME', workplace: 'ONSITE', salaryMin: 60000, salaryMax: 68000, sponsorship: false },
  { company: 2, daysAgo: 18, title: 'Financial Accountant', category: 'Accounting & Finance', country: 'NZ', region: 'AKL', city: 'Auckland', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 90000, salaryMax: 105000, sponsorship: false },
  { company: 3, daysAgo: 2, title: 'Warehouse Team Leader', category: 'Trades & Construction', country: 'AU', region: 'QLD', city: 'Brisbane', workType: 'FULL_TIME', workplace: 'ONSITE', salaryMin: 72000, salaryMax: 80000, sponsorship: false },
  { company: 3, daysAgo: 7, title: 'Forklift Operator (Casual)', category: 'Trades & Construction', country: 'AU', region: 'QLD', city: 'Townsville', workType: 'CASUAL', workplace: 'ONSITE', salaryMin: null, salaryMax: null, sponsorship: false },
  { company: 3, daysAgo: 10, title: 'Logistics Data Engineer', category: 'Data & Analytics', country: 'AU', region: 'QLD', city: 'Brisbane', workType: 'FULL_TIME', workplace: 'REMOTE', salaryMin: 130000, salaryMax: 155000, sponsorship: true },
  { company: 3, daysAgo: 25, title: 'Sales Representative — Regional', category: 'Sales', country: 'AU', region: 'WA', city: 'Perth', workType: 'FULL_TIME', workplace: 'ONSITE', salaryMin: 80000, salaryMax: 95000, sponsorship: false },
  { company: 4, daysAgo: 3, title: 'Front-end Developer (Accessibility)', category: 'Software Engineering', country: 'NZ', region: 'WGN', city: 'Wellington', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 95000, salaryMax: 115000, sponsorship: false },
  { company: 4, daysAgo: 6, title: 'Digital Marketing Coordinator', category: 'Marketing', country: 'NZ', region: 'WGN', city: 'Wellington', workType: 'PART_TIME', workplace: 'REMOTE', salaryMin: 55000, salaryMax: 62000, sponsorship: false },
  { company: 4, daysAgo: 11, title: 'UX Researcher', category: 'Design', country: 'NZ', region: 'CAN', city: 'Christchurch', workType: 'CONTRACT', workplace: 'HYBRID', salaryMin: 100000, salaryMax: 120000, sponsorship: false },
  { company: 4, daysAgo: 14, title: 'Barista — Studio Café', category: 'Hospitality', country: 'NZ', region: 'OTA', city: 'Queenstown', workType: 'CASUAL', workplace: 'ONSITE', salaryMin: null, salaryMax: null, sponsorship: false },
  { company: 4, daysAgo: 22, title: 'Product Manager — Gov Services', category: 'Product Management', country: 'NZ', region: 'WGN', city: 'Wellington', workType: 'FULL_TIME', workplace: 'HYBRID', salaryMin: 130000, salaryMax: 150000, sponsorship: false },
];

function describeJob(job: JobSeed, company: (typeof companies)[number]) {
  return [
    `${company.name} is looking for a ${job.title} to join our team in ${job.city}.`,
    '',
    'About the role',
    `You will work closely with a friendly, cross-functional team and take ownership of meaningful work from day one. This is a ${job.workplace.toLowerCase()} role.`,
    '',
    'What you will bring',
    '• Strong communication skills and a collaborative attitude',
    '• Relevant experience or a genuine eagerness to learn',
    `• ${job.sponsorship ? 'Visa sponsorship is available for the right candidate' : 'Full working rights in ' + (job.country === 'AU' ? 'Australia' : 'New Zealand')}`,
    '',
    'Why join us',
    '• Flexible hours and a supportive culture',
    '• Learning and development budget',
    `• ${job.country === 'AU' ? 'Superannuation on top of base salary' : 'KiwiSaver employer contributions'}`,
  ].join('\n');
}

const hash = (pw: string) => bcrypt.hash(pw, 12);

async function main() {
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: { name: 'Site Admin', email: DEMO_ACCOUNTS.admin.email, role: 'ADMIN', passwordHash: await hash(DEMO_ACCOUNTS.admin.password) },
  });

  const companyIds: string[] = [];
  for (const [i, c] of companies.entries()) {
    const email = i === 0 ? DEMO_ACCOUNTS.employer.email : `hiring${i}@example.com`;
    const owner = await prisma.user.create({
      data: {
        name: i === 0 ? 'Jordan Lee' : `${c.name} Recruiter`,
        email,
        role: 'EMPLOYER',
        passwordHash: await hash(i === 0 ? DEMO_ACCOUNTS.employer.password : 'Employer1234!'),
        company: { create: c },
      },
      include: { company: true },
    });
    companyIds.push(owner.company!.id);
  }

  const now = Date.now();
  const createdJobs = await prisma.job.createManyAndReturn({
    data: jobs.map(({ company, daysAgo, ...job }) => ({
      ...job,
      companyId: companyIds[company],
      description: describeJob({ company, daysAgo, ...job }, companies[company]),
      createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
    })),
    select: { id: true, title: true },
  });

  const seekerSeeds = [
    { name: 'Alex Chen', email: DEMO_ACCOUNTS.seeker.email, headline: 'Junior full stack developer · React & Node.js', location: 'Sydney, NSW', workRights: 'WORKING_HOLIDAY' as const, skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'] },
    { name: 'Mia Thompson', email: 'mia@example.com', headline: 'Registered nurse with 4 years of community care', location: 'Melbourne, VIC', workRights: 'CITIZEN_PR' as const, skills: ['Patient care', 'Medication management'] },
    { name: 'Tama Ngata', email: 'tama@example.com', headline: 'Backend engineer who loves payments', location: 'Auckland', workRights: 'CITIZEN_PR' as const, skills: ['Node.js', 'Go', 'AWS'] },
    { name: 'Priya Sharma', email: 'priya@example.com', headline: 'Data analyst · SQL, Python, Power BI', location: 'Brisbane, QLD', workRights: 'STUDENT' as const, skills: ['SQL', 'Python', 'Power BI'] },
  ];
  const seekers = [];
  for (const s of seekerSeeds) {
    const { name, email, ...profile } = s;
    seekers.push(
      await prisma.user.create({
        data: {
          name,
          email,
          role: 'SEEKER',
          passwordHash: await hash(email === DEMO_ACCOUNTS.seeker.email ? DEMO_ACCOUNTS.seeker.password : 'Seeker1234!'),
          seekerProfile: { create: profile },
        },
      }),
    );
  }

  const jobId = (title: string) => createdJobs.find((j) => j.title === title)!.id;
  const [alex, mia, tama, priya] = seekers;
  await prisma.application.createMany({
    data: [
      { seekerId: alex.id, jobId: jobId('Graduate Software Engineer'), status: 'INTERVIEW', coverLetter: 'I recently completed several full-stack projects and would love to grow with your team.' },
      { seekerId: alex.id, jobId: jobId('Junior Full Stack Developer'), status: 'REVIEWING', coverLetter: 'Kia ora! I am excited by your mission to support small businesses.' },
      { seekerId: alex.id, jobId: jobId('Front-end Developer (Accessibility)'), status: 'APPLIED' },
      { seekerId: tama.id, jobId: jobId('Graduate Software Engineer'), status: 'APPLIED' },
      { seekerId: priya.id, jobId: jobId('Graduate Software Engineer'), status: 'REVIEWING' },
      { seekerId: priya.id, jobId: jobId('Data Analyst — Patient Outcomes'), status: 'APPLIED' },
      { seekerId: mia.id, jobId: jobId('Registered Nurse — Community Care'), status: 'OFFERED' },
      { seekerId: tama.id, jobId: jobId('Backend Engineer (Node.js)'), status: 'INTERVIEW' },
      { seekerId: tama.id, jobId: jobId('Senior React Developer'), status: 'APPLIED' },
    ],
  });
  await prisma.savedJob.createMany({
    data: [
      { userId: alex.id, jobId: jobId('Senior React Developer') },
      { userId: alex.id, jobId: jobId('Backend Engineer (Node.js)') },
    ],
  });

  console.log(`Seeded ${createdJobs.length} jobs, ${companies.length} companies, ${seekers.length} seekers`);
  for (const [role, creds] of Object.entries(DEMO_ACCOUNTS)) console.log(`  ${role}: ${creds.email} / ${creds.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
