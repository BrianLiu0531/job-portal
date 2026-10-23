import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

const DEMOS = [
  { label: 'Job seeker', email: 'seeker@example.com', password: 'Seeker1234!' },
  { label: 'Employer', email: 'employer@example.com', password: 'Employer1234!' },
  { label: 'Admin', email: 'admin@example.com', password: 'Admin1234!' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Navigation after login is handled by the GuestOnly route guard
  async function submit(creds = { email, password }) {
    setBusy(true);
    setError(undefined);
    try {
      await login(creds.email, creds.password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form
        className="card auth-card form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          submit();
        }}
      >
        <h1>Welcome back</h1>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>

        <div className="demo-box">
          <span className="muted small">Explore with a demo account</span>
          <div className="demo-buttons">
            {DEMOS.map((d) => (
              <button key={d.label} type="button" className="btn btn-small" disabled={busy} onClick={() => submit(d)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small center">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
