import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Company } from '../../types';

export default function CompanyPage() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: () => api<Company>('/employer/company') });
  const [form, setForm] = useState({ name: '', website: '', location: '', description: '' });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        website: company.website ?? '',
        location: company.location ?? '',
        description: company.description ?? '',
      });
    }
  }, [company]);

  const save = useMutation({
    mutationFn: () => api<Company>('/employer/company', { method: 'PUT', json: form }),
    onSuccess: async (data) => {
      queryClient.setQueryData(['company'], data);
      await refresh();
    },
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    save.reset();
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  if (!company) return <p className="muted">Loading…</p>;

  return (
    <div className="stack narrow">
      <div>
        <h1>Company profile</h1>
        <p className="muted">Shown to candidates on every job you post.</p>
      </div>
      <form
        className="card form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="field">
          <span>Company name</span>
          <input required value={form.name} onChange={set('name')} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Website</span>
            <input type="url" value={form.website} placeholder="https://…" onChange={set('website')} />
          </label>
          <label className="field">
            <span>Head office</span>
            <input value={form.location} placeholder="e.g. Brisbane, QLD" onChange={set('location')} />
          </label>
        </div>
        <label className="field">
          <span>About the company</span>
          <textarea rows={6} maxLength={3000} value={form.description} onChange={set('description')} />
        </label>
        {save.error && <p className="error" role="alert">{errorMessage(save.error)}</p>}
        {save.isSuccess && <p className="success" role="status">Company profile saved</p>}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
