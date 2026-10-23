import type { Country, Meta } from '../types';

export interface Filters {
  country: string;
  region: string;
  category: string;
  workType: string;
  workplace: string;
  minSalary: string;
  sponsorship: string;
}

interface Props {
  meta: Meta;
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
}

const SALARY_STEPS = [50000, 70000, 90000, 120000, 150000];

export default function JobFilters({ meta, value, onChange }: Props) {
  const country = value.country as Country | '';
  return (
    <aside className="card filters" aria-label="Filters">
      <label className="field">
        <span>Country</span>
        <select value={value.country} onChange={(e) => onChange({ country: e.target.value, region: '' })}>
          <option value="">Australia &amp; New Zealand</option>
          {(Object.keys(meta.countries) as Country[]).map((c) => (
            <option key={c} value={c}>
              {meta.countries[c]}
            </option>
          ))}
        </select>
      </label>

      {country && (
        <label className="field">
          <span>{country === 'AU' ? 'State / territory' : 'Region'}</span>
          <select value={value.region} onChange={(e) => onChange({ region: e.target.value })}>
            <option value="">All</option>
            {Object.entries(meta.locations[country]).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Category</span>
        <select value={value.category} onChange={(e) => onChange({ category: e.target.value })}>
          <option value="">All categories</option>
          {meta.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Work type</span>
        <select value={value.workType} onChange={(e) => onChange({ workType: e.target.value })}>
          <option value="">Any</option>
          {Object.entries(meta.workTypes).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Workplace</span>
        <select value={value.workplace} onChange={(e) => onChange({ workplace: e.target.value })}>
          <option value="">Any</option>
          {Object.entries(meta.workplaces).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Minimum salary</span>
        <select value={value.minSalary} onChange={(e) => onChange({ minSalary: e.target.value })}>
          <option value="">Any</option>
          {SALARY_STEPS.map((s) => (
            <option key={s} value={s}>
              ${s / 1000}k+
            </option>
          ))}
        </select>
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.sponsorship === 'true'}
          onChange={(e) => onChange({ sponsorship: e.target.checked ? 'true' : '' })}
        />
        <span>Offers visa sponsorship</span>
      </label>
    </aside>
  );
}
