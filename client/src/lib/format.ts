import type { Country, Meta } from '../types';

function compact(n: number) {
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}

export function formatSalary(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return min === max ? compact(min) : `${compact(min)} – ${compact(max)}`;
  if (min !== null) return `From ${compact(min)}`;
  if (max !== null) return `Up to ${compact(max)}`;
  return null;
}

/** e.g. "AUD per year + super" — superannuation is quoted on top of base pay in AU. */
export function salarySuffix(country: Country): string {
  return country === 'AU' ? 'AUD per year + super' : 'NZD per year';
}

export function postedAgo(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'Posted today';
  if (days < 30) return `Posted ${days}d ago`;
  return 'Posted 30+ days ago';
}

export function locationLabel(job: { city: string; region: string; country: Country }, meta?: Meta): string {
  if (job.country === 'AU') return `${job.city} ${job.region}`;
  const regionName = meta?.locations.NZ[job.region] ?? job.region;
  return job.city === regionName ? `${job.city}, NZ` : `${job.city}, ${regionName}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
