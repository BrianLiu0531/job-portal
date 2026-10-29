import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useMeta } from '../../lib/meta';
import type { SeekerProfile, WorkRights } from '../../types';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const { data: meta } = useMeta();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => api<SeekerProfile>('/seeker/profile') });

  const [form, setForm] = useState({ name: '', headline: '', location: '', about: '', skills: '', workRights: '', resumeUrl: '', resumeText: '' });
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name,
      headline: profile.headline ?? '',
      location: profile.location ?? '',
      about: profile.about ?? '',
      skills: profile.skills.join(', '),
      workRights: profile.workRights ?? '',
      resumeUrl: profile.resumeUrl ?? '',
      resumeText: profile.resumeText ?? '',
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      api<SeekerProfile>('/seeker/profile', {
        method: 'PUT',
        json: {
          ...form,
          skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
          workRights: (form.workRights || null) as WorkRights | null,
        },
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(['profile'], data);
      await refresh();
    },
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    save.reset();
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  if (!profile || !meta) return <p className="muted">Loading…</p>;

  return (
    <div className="stack narrow">
      <div>
        <h1>Your profile</h1>
        <p className="muted">Employers see this when you apply.</p>
      </div>
      <form
        className="card form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="field">
          <span>Name</span>
          <input required value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span>Headline</span>
          <input value={form.headline} maxLength={120} placeholder="e.g. Junior developer · React & Node.js" onChange={set('headline')} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Location</span>
            <input value={form.location} maxLength={80} placeholder="e.g. Melbourne, VIC" onChange={set('location')} />
          </label>
          <label className="field">
            <span>Work rights</span>
            <select value={form.workRights} onChange={set('workRights')}>
              <option value="">Prefer not to say</option>
              {Object.entries(meta.workRights).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Skills (comma separated)</span>
          <input value={form.skills} placeholder="React, TypeScript, SQL" onChange={set('skills')} />
        </label>
        <label className="field">
          <span>Résumé link</span>
          <input type="url" value={form.resumeUrl} placeholder="https://…" onChange={set('resumeUrl')} />
        </label>
        <label className="field">
          <span>About you</span>
          <textarea rows={5} maxLength={2000} value={form.about} onChange={set('about')} />
        </label>
        <label className="field">
          <span>Résumé text (private)</span>
          <textarea
            rows={8}
            maxLength={15000}
            value={form.resumeText}
            placeholder="Paste your résumé as plain text"
            onChange={set('resumeText')}
          />
          <small className="muted">Only used for “Check my fit” on job listings. Employers don’t see it.</small>
        </label>
        {save.error && <p className="error" role="alert">{errorMessage(save.error)}</p>}
        {save.isSuccess && <p className="success" role="status">Profile saved</p>}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
