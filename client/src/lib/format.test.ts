import { formatSalary, locationLabel, postedAgo, salarySuffix } from './format';

describe('formatSalary', () => {
  it.each([
    [80000, 95000, '$80k – $95k'],
    [100000, 100000, '$100k'],
    [70000, null, 'From $70k'],
    [null, 120000, 'Up to $120k'],
    [null, null, null],
  ])('formats %s–%s as %s', (min, max, expected) => {
    expect(formatSalary(min, max)).toBe(expected);
  });

  it('mentions super for Australian roles', () => {
    expect(salarySuffix('AU')).toContain('super');
    expect(salarySuffix('NZ')).toBe('NZD per year');
  });
});

describe('postedAgo', () => {
  const now = new Date('2026-01-31T12:00:00Z');
  it.each([
    ['2026-01-31T08:00:00Z', 'Posted today'],
    ['2026-01-28T12:00:00Z', 'Posted 3d ago'],
    ['2025-12-01T00:00:00Z', 'Posted 30+ days ago'],
  ])('%s → %s', (iso, expected) => {
    expect(postedAgo(iso, now)).toBe(expected);
  });
});

describe('locationLabel', () => {
  it('uses the state code in Australia', () => {
    expect(locationLabel({ city: 'Sydney', region: 'NSW', country: 'AU' })).toBe('Sydney NSW');
  });

  it('avoids repeating the region name in New Zealand', () => {
    const meta = { locations: { NZ: { AKL: 'Auckland', CAN: 'Canterbury' } } } as never;
    expect(locationLabel({ city: 'Auckland', region: 'AKL', country: 'NZ' }, meta)).toBe('Auckland, NZ');
    expect(locationLabel({ city: 'Christchurch', region: 'CAN', country: 'NZ' }, meta)).toBe('Christchurch, Canterbury');
  });
});
