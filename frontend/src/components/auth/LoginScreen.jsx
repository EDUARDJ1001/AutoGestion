import { useState } from 'react';
import { Gauge, LogIn } from 'lucide-react';
import { login } from '../../api/client';
import { saveSession } from '../../utils/session';

function LoginScreen({ notice, onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(credentials);
      const session = { token: data.token, user: data.user };
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Inicio de sesion">
        <div className="brand-mark">
          <Gauge size={34} aria-hidden="true" />
        </div>
        <h1>AutoGestion</h1>
        <p>Acceso operativo del taller</p>

        <form className="login-form" onSubmit={submit}>
          {notice ? <div className="form-notice">{notice}</div> : null}
          <label>
            Usuario
            <input
              autoComplete="username"
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
          <label>
            Contrasena
            <input
              autoComplete="current-password"
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            <LogIn size={18} aria-hidden="true" />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginScreen;
