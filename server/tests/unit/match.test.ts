import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisUnavailableError, claudeAnalyzer, eligibility, inputHash, keywordMatch, type MatchInput } from '../../src/lib/match.js';

const input: MatchInput = {
  profile: {
    headline: 'Junior developer',
    location: 'Melbourne, VIC',
    about: null,
    skills: ['React', 'TypeScript', 'C#', 'Node.js', 'Go'],
    workRights: 'CITIZEN_PR',
    resumeText: null,
  },
  job: {
    title: 'Front-end Developer',
    description: 'We build with React and TypeScript, with some Node.js services. Golang is a bonus.',
    category: 'Software Engineering',
    city: 'Melbourne',
    region: 'VIC',
    country: 'AU',
    workType: 'FULL_TIME',
    workplace: 'HYBRID',
    sponsorship: false,
  },
};
const withProfile = (p: Partial<MatchInput['profile']>) => ({ ...input, profile: { ...input.profile, ...p } });
const withJob = (j: Partial<MatchInput['job']>) => ({ ...input, job: { ...input.job, ...j } });

describe('eligibility', () => {
  it('flags a sponsorship mismatch, but not when the job sponsors', () => {
    expect(eligibility(withProfile({ workRights: 'REQUIRES_SPONSORSHIP' }))).toEqual([expect.stringContaining('sponsorship')]);
    expect(eligibility({ ...withProfile({ workRights: 'REQUIRES_SPONSORSHIP' }), job: { ...input.job, sponsorship: true } })).toEqual([]);
  });

  it('notes visa conditions and on-site location', () => {
    expect(eligibility(withProfile({ workRights: 'STUDENT' }))[0]).toMatch(/Student visas/);
    expect(eligibility(withProfile({ workRights: 'WORKING_HOLIDAY' }))[0]).toMatch(/6 months/);
    expect(eligibility(withJob({ workplace: 'ONSITE', city: 'Brisbane' }))[0]).toMatch(/on-site in Brisbane/);
    expect(eligibility(withJob({ workplace: 'ONSITE' }))).toEqual([]); // same city
  });
});

describe('keywordMatch', () => {
  it('matches whole skills, including punctuation like C# and Node.js', () => {
    const r = keywordMatch(input);
    expect(r.matchedSkills).toEqual(['React', 'TypeScript', 'Node.js']);
    // "Go" must not match "Golang", and C# isn't mentioned
    expect(r.gaps[0]).toContain('C#, Go');
    expect(r.score).toBe(60);
  });

  it('scores 0 without skills', () => {
    expect(keywordMatch(withProfile({ skills: [] })).score).toBe(0);
  });
});

describe('inputHash', () => {
  it('changes with the profile, the job and the model', () => {
    const base = inputHash(input, 'm1');
    expect(inputHash(input, 'm1')).toBe(base);
    expect(inputHash(withProfile({ skills: ['React'] }), 'm1')).not.toBe(base);
    expect(inputHash(withJob({ description: 'changed' }), 'm1')).not.toBe(base);
    expect(inputHash(input, 'm2')).not.toBe(base);
  });
});

function fakeClient(response: Partial<Anthropic.Beta.BetaMessage> | Error) {
  const create = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return { stop_reason: 'end_turn', content: [], ...response };
  });
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}
const text = (t: string) => [{ type: 'text', text: t, citations: null }] as Anthropic.Beta.BetaContentBlock[];
const valid = {
  score: 140,
  summary: 'Strong fit.',
  matchedSkills: ['React'],
  missingSkills: [],
  strengths: ['a', 'b', 'c', 'd', 'e'],
  gaps: [],
  coverLetterTips: [],
};

describe('claudeAnalyzer', () => {
  it('sends structured-output and fallback options, and hides work rights from the model', async () => {
    const { client, create } = fakeClient({ content: text(JSON.stringify(valid)) });
    const r = await claudeAnalyzer(client, 'claude-opus-5-5').analyze(withProfile({ workRights: 'REQUIRES_SPONSORSHIP' }));
    expect(r.score).toBe(100); // clamped
    expect(r.strengths).toHaveLength(4); // trimmed
    const [params] = create.mock.calls[0] as unknown as [Record<string, any>];
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params.fallbacks).toBe('default');
    const prompt = params.messages[0].content as string;
    expect(prompt).not.toContain('workRights');
    expect(prompt).not.toContain('sponsorship');
    expect(prompt).toContain('Front-end Developer');
  });

  it.each([
    ['a refusal', { stop_reason: 'refusal', content: [] }],
    ['a truncated response', { stop_reason: 'max_tokens', content: text('{"score":') }],
    ['invalid JSON', { content: text('not json') }],
    ['the wrong shape', { content: text('{"score":"high"}') }],
    ['no text block', { content: [] }],
  ] as const)('reports %s as unavailable', async (_name, response) => {
    const { client } = fakeClient(response as Partial<Anthropic.Beta.BetaMessage>);
    await expect(claudeAnalyzer(client, 'm').analyze(input)).rejects.toBeInstanceOf(AnalysisUnavailableError);
  });

  it('maps API errors to unavailable', async () => {
    const err = new Anthropic.RateLimitError(429, { type: 'error' }, 'slow down', new Headers());
    const { client } = fakeClient(err);
    await expect(claudeAnalyzer(client, 'm').analyze(input)).rejects.toBeInstanceOf(AnalysisUnavailableError);
  });
});
