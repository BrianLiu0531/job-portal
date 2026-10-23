import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const [role, setRole] = useState<'SEEKER' | 'EMPLOYER'>('SEEKER');
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const { companyName, ...base } = form;
      await register(role === 'EMPLOYER' ? { ...base, role, companyName } : { ...base, role });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card form" onSubmit={submit}>
        <h1>Create your account</h1>
        <div className="segmented" role="radiogroup" aria-label="Account type">
          {(
            [
              ['SEEKER', 'I’m looking for work'],
              ['EMPLOYER', 'I’m hiring'],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={role === value} className={role === value ? 'active' : ''} onClick={() => setRole(value)}>
              {label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Your name</span>
          <input required autoComplete="name" value={form.name} onChange={set('name')} />
        </label>
        {role === 'EMPLOYER' && (
          <label className="field">
            <span>Company name</span>
            <input required autoComplete="organization" value={form.companyName} onChange={set('companyName')} />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <small className="muted">At least 8 characters</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
        <p className="muted small center">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
