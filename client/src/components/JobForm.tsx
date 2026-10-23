import { useState, type FormEvent } from 'react';
import type { Country, JobInput, Meta, WorkType, Workplace } from '../types';

interface Props {
  meta: Meta;
  initial?: JobInput;
  submitting?: boolean;
  serverError?: string;
  submitLabel?: string;
  onSubmit: (input: JobInput) => void;
}

const EMPTY: JobInput = {
  title: '',
  description: '',
  category: '',
  country: 'AU',
  region: '',
  city: '',
  workType: 'FULL_TIME',
  workplace: 'ONSITE',
  salaryMin: null,
  salaryMax: null,
  sponsorship: false,
};

function toNumber(s: string): number | null | 'invalid' {
  const trimmed = s.replace(/[$,\s]/g, '');
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : 'invalid';
}

export function validateJob(form: JobInput & { salaryMinText: string; salaryMaxText: string }, meta: Meta) {
  const errors: Record<string, string> = {};
  if (form.title.trim().length < 3) errors.title = 'Enter a job title';
  if (form.description.trim().length < 30) errors.description = 'Describe the role in at least 30 characters';
  if (!form.category) errors.category = 'Choose a category';
  if (!(form.region in meta.locations[form.country])) errors.region = 'Choose a location';
  if (!form.city.trim()) errors.city = 'Enter a city or suburb';
  const min = toNumber(form.salaryMinText);
  const max = toNumber(form.salaryMaxText);
  if (min === 'invalid') errors.salaryMin = 'Use whole dollars, e.g. 85000';
  if (max === 'invalid') errors.salaryMax = 'Use whole dollars, e.g. 95000';
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.salaryMax = 'Maximum must be at least the minimum';
  }
  return { errors, salaryMin: typeof min === 'number' ? min : null, salaryMax: typeof max === 'number' ? max : null };
}

export default function JobForm({ meta, initial = EMPTY, submitting, serverError, submitLabel = 'Save', onSubmit }: Props) {
  const [form, setForm] = useState({
    ...initial,
    salaryMinText: initial.salaryMin?.toString() ?? '',
    salaryMaxText: initial.salaryMax?.toString() ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateJob(form, meta);
    setErrors(result.errors);
    if (Object.keys(result.errors).length > 0) return;
    // Pick fields explicitly: `initial` may be a full job record with ids and timestamps
    onSubmit({
      title: form.title.trim(),
      description: form.description,
      category: form.category,
      country: form.country,
      region: form.region,
      city: form.city.trim(),
      workType: form.workType,
      workplace: form.workplace,
      salaryMin: result.salaryMin,
      salaryMax: result.salaryMax,
      sponsorship: form.sponsorship,
    });
  }

  const err = (k: string) => errors[k] && <small className="error">{errors[k]}</small>;

  return (
    <form className="form card" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Job title</span>
        <input value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} />
        {err('title')}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} aria-invalid={!!errors.category}>
            <option value="">Select…</option>
            {meta.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {err('category')}
        </label>
        <label className="field">
          <span>Country</span>
          <select
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value as Country, region: '' }))}
          >
            {(Object.keys(meta.countries) as Country[]).map((c) => (
              <option key={c} value={c}>
                {meta.countries[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>{form.country === 'AU' ? 'State / territory' : 'Region'}</span>
          <select value={form.region} onChange={(e) => set('region', e.target.value)} aria-invalid={!!errors.region}>
            <option value="">Select…</option>
            {Object.entries(meta.locations[form.country]).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          {err('region')}
        </label>
        <label className="field">
          <span>City / suburb</span>
          <input value={form.city} maxLength={80} onChange={(e) => set('city', e.target.value)} aria-invalid={!!errors.city} />
          {err('city')}
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Work type</span>
          <select value={form.workType} onChange={(e) => set('workType', e.target.value as WorkType)}>
            {Object.entries(meta.workTypes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Workplace</span>
          <select value={form.workplace} onChange={(e) => set('workplace', e.target.value as Workplace)}>
            {Object.entries(meta.workplaces).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Salary from (annual, optional)</span>
          <input inputMode="numeric" value={form.salaryMinText} onChange={(e) => set('salaryMinText', e.target.value)} aria-invalid={!!errors.salaryMin} />
          {err('salaryMin')}
        </label>
        <label className="field">
          <span>Salary to (annual, optional)</span>
          <input inputMode="numeric" value={form.salaryMaxText} onChange={(e) => set('salaryMaxText', e.target.value)} aria-invalid={!!errors.salaryMax} />
          {err('salaryMax')}
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <textarea rows={10} value={form.description} onChange={(e) => set('description', e.target.value)} aria-invalid={!!errors.description} />
        {err('description')}
      </label>

      <label className="checkbox">
        <input type="checkbox" checked={form.sponsorship} onChange={(e) => set('sponsorship', e.target.checked)} />
        <span>Visa sponsorship available for this role</span>
      </label>

      {serverError && <p className="error" role="alert">{serverError}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
