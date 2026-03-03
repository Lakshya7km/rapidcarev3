import React, { useMemo, useState } from 'react';
import { io } from 'socket.io-client';

function getStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getStored('jwt');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function LoginCard({ title, subtitle, role, placeholder, redirectTo, buttonClass }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { role, username: username.trim(), password }
      });
      setStored('jwt', data.token);
      setStored('role', role);
      if (role === 'hospital') setStored('hospitalId', username.trim());
      if (role === 'doctor') setStored('doctor', JSON.stringify(data.doctor || {}));
      if (role === 'ambulance') setStored('ambulance', JSON.stringify(data.ambulance || {}));
      if (role === 'nurse') setStored('nurse', JSON.stringify(data.nurse || {}));
      window.location.href = redirectTo;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card glass border-0 shadow-lg hover-up">
      <div className="p-4">
        <div className="flex items-center gap-md mb-4">
          <div className="stat-icon" style={{ background: 'rgba(11, 110, 253, 0.1)', color: 'var(--primary-color)' }}>🔐</div>
          <div>
            <h4 className="font-bold mb-0">{title}</h4>
            <p className="text-xs text-muted font-bold uppercase">{subtitle}</p>
          </div>
        </div>

        <div className="form-group mb-2">
          <label className="text-xs font-bold uppercase text-muted">User</label>
          <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={placeholder} />
        </div>
        <div className="form-group mb-3">
          <label className="text-xs font-bold uppercase text-muted">Password</label>
          <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button className={`btn btn-block py-2 font-bold ${buttonClass}`} onClick={onLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Join Terminal'}
        </button>

        {error ? (
          <div className="alert alert-danger mt-3 text-xs font-bold">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function Landing() {
  useMemo(() => io({ autoConnect: true }), []);

  return (
    <>
      <nav className="navbar">
        <div className="container nav-container">
          <div className="flex items-center gap-sm">
            <img src="/images/logo.png" alt="RapidCare Logo" className="logo" />
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>RapidCare</span>
          </div>
          <div>
            <a href="/public" className="btn btn-danger btn-sm">
              <span style={{ marginRight: 5 }}>🚨</span> Emergency
            </a>
          </div>
        </div>
      </nav>

      <section className="hero animate-fade-in">
        <div className="container">
          <h1>Advanced Emergency Response</h1>
          <p>Real-time hospital management, bed tracking, and emergency coordination system.</p>
          <div className="flex justify-center gap-md mt-4">
            <a href="/public" className="btn btn-success" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
              Find Hospitals & Beds
            </a>
            <a href="#login-section" className="btn btn-outline" style={{ color: 'white', borderColor: 'white' }}>
              Staff Login
            </a>
          </div>
        </div>
      </section>

      <div className="container mt-5 pt-5" id="login-section">
        <div className="text-center mb-5">
          <h2 className="font-bold mb-2">Internal Staff Access</h2>
          <p className="text-muted">Direct terminals for medical and administrative operations</p>
        </div>

        <div className="grid grid-cols-3 grid-auto-fit gap-lg">
          <LoginCard title="Reception" subtitle="Operations" role="hospital" placeholder="AIIMS-RPR" redirectTo="/reception" buttonClass="btn-primary" />
          <LoginCard title="Doctor" subtitle="Clinical Control" role="doctor" placeholder="DOC-AIIMS-01" redirectTo="/doctor" buttonClass="btn-success" />
          <LoginCard title="Dispatcher" subtitle="Emergency Fleet" role="ambulance" placeholder="AMB-AIIMS-01" redirectTo="/ambulance" buttonClass="btn-danger" />
          <LoginCard title="Nurse" subtitle="Ward Analytics" role="nurse" placeholder="NUR-001" redirectTo="/nurse" buttonClass="btn-info text-white" />
          <LoginCard title="Authority" subtitle="System Master" role="superadmin" placeholder="Administrator" redirectTo="/admin" buttonClass="btn-dark" />
        </div>
      </div>

      <footer className="text-center mt-4" style={{ padding: '2rem', background: '#fff', borderTop: '1px solid var(--border-color)' }}>
        <p className="text-muted mb-0">&copy; 2025 RapidCare. All rights reserved.</p>
      </footer>
    </>
  );
}
