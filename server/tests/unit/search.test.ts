import { describe, expect, it } from 'vitest';
import { jobSearchSchema } from '../../src/schemas.js';
import { buildJobOrder, buildJobWhere } from '../../src/lib/search.js';

const where = (query: Record<string, string>) => buildJobWhere(jobSearchSchema.parse(query));

describe('job search', () => {
  it('only ever returns open jobs', () => {
    expect(where({}).status).toBe('OPEN');
  });

  it('ignores empty query-string values', () => {
    expect(where({ country: '', workType: '', q: '' })).toEqual({
      status: 'OPEN',
      country: undefined,
      region: undefined,
      category: undefined,
      workType: undefined,
      workplace: undefined,
      sponsorship: undefined,
      AND: undefined,
    });
  });

  it('searches title, description and company name case-insensitively', () => {
    const w = where({ q: 'react' });
    expect(w.AND).toEqual([
      {
        OR: [
          { title: { contains: 'react', mode: 'insensitive' } },
          { description: { contains: 'react', mode: 'insensitive' } },
          { company: { name: { contains: 'react', mode: 'insensitive' } } },
        ],
      },
    ]);
  });

  it('matches salary ranges that reach the requested minimum', () => {
    const w = where({ minSalary: '100000' });
    expect(w.AND).toEqual([
      { OR: [{ salaryMax: { gte: 100000 } }, { salaryMax: null, salaryMin: { gte: 100000 } }] },
    ]);
  });

  it('only filters on sponsorship when requested', () => {
    expect(where({ sponsorship: 'true' }).sponsorship).toBe(true);
    expect(where({ sponsorship: 'false' }).sponsorship).toBeUndefined();
  });

  it('sorts by salary with unlisted salaries last', () => {
    expect(buildJobOrder('salary')[0]).toEqual({ salaryMax: { sort: 'desc', nulls: 'last' } });
  });
});
