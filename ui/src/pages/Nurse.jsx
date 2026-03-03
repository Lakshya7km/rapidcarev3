import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { clearStored, getStored, setStored } from '../lib/storage.js';
import { getSocket } from '../lib/socket.js';

function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setMsg('');
    setLoading(true);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { role: 'nurse', username: username.trim(), password }
      });
      setStored('jwt', data.token);
      setStored('role', 'nurse');
      setStored('nurse', JSON.stringify(data.nurse || {}));
      onLoggedIn(data.nurse || {});
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass shadow-lg" style={{ width: '100%', maxWidth: 400, borderTop: '4px solid var(--info-color)' }}>
        <div className="card-header text-center border-0 pb-0">
          <h2 className="text-info font-bold">Nurse Access</h2>
          <p className="text-muted">Medical Bed Management Terminal</p>
        </div>
        <div className="p-4">
          <div className="form-group">
            <label className="form-label uppercase text-xs font-bold text-muted">Staff ID</label>
            <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="NUR001" />
          </div>
          <div className="form-group">
            <label className="form-label uppercase text-xs font-bold text-muted">Authorization Code</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button onClick={login} disabled={loading} className="btn btn-info btn-block py-2" style={{ color: 'white', fontWeight: 'bold' }}>
            {loading ? 'Signing in...' : 'Enter Terminal'}
          </button>
          {msg ? <div className="alert alert-danger mt-3" style={{ fontSize: '0.85rem' }}>{msg}</div> : null}
          <div className="text-center mt-4">
            <a href="/" className="text-xs text-muted font-bold uppercase" style={{ letterSpacing: 1 }}>
              Exit to Public View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusButton({ status, current, onClick }) {
  const stylesByStatus = {
    Vacant: { borderColor: '#198754', color: '#198754' },
    Occupied: { borderColor: '#dc3545', color: '#dc3545' },
    Maintenance: { borderColor: '#ffc107', color: '#856404' },
    Cleaning: { borderColor: '#6c757d', color: '#6c757d' }
  };

  return (
    <button
      className="bed-status-btn"
      style={{ background: current === status ? 'rgba(11,110,253,0.06)' : 'white', ...stylesByStatus[status] }}
      onClick={onClick}
      type="button"
    >
      {status}
    </button>
  );
}

export default function Nurse() {
  const [nurse, setNurse] = useState(null);
  const [active, setActive] = useState('beds');
  const [beds, setBeds] = useState([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [err, setErr] = useState('');

  const hospitalId = nurse?.hospitalId;

  useEffect(() => {
    const token = getStored('jwt');
    const role = getStored('role');
    const stored = getStored('nurse');
    if (token && role === 'nurse' && stored) {
      try {
        setNurse(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const loadBeds = async () => {
    setErr('');
    setLoadingBeds(true);
    try {
      const list = await api('/api/nurse/beds');
      setBeds(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingBeds(false);
    }
  };

  useEffect(() => {
    if (!nurse) return;
    loadBeds();
    const socket = getSocket();
    if (nurse.hospitalId) socket.emit('joinHospitalRoom', nurse.hospitalId);

    const onBedUpdate = (payload) => {
      if (!payload?.bed) return;
      setBeds((prev) => prev.map((b) => (b.bedId === payload.bed.bedId ? payload.bed : b)));
    };

    socket.on('bed:update', onBedUpdate);
    return () => {
      socket.off('bed:update', onBedUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nurse?.hospitalId]);

  const updateStatus = async (bedId, status) => {
    try {
      await api('/api/nurse/bed-status', { method: 'PUT', body: { bedId, status } });
      // optimistic: refresh list for correctness
      await loadBeds();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const logout = () => {
    clearStored();
    window.location.href = '/';
  };

  if (!nurse) return <Login onLoggedIn={(n) => setNurse(n)} />;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" style={{ height: 30 }} />
          <h3 className="text-primary mb-0 ml-2" style={{ fontSize: '1.1rem' }}>RapidCare</h3>
        </div>
        <nav className="sidebar-nav">
          <a className={`nav-item ${active === 'beds' ? 'active' : ''}`} onClick={() => setActive('beds')}>
            <span>🛏️</span> Ward Management
          </a>
          <a className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => setActive('profile')}>
            <span>👩‍⚕️</span> Nurse Profile
          </a>
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <a className="nav-item text-danger font-bold" onClick={logout}>
              <span>🚪</span> Terminal Exit
            </a>
          </div>
        </nav>
      </aside>

      <main className="main-content flex-grow">
        {active === 'beds' ? (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-bold mb-0">Ward Status</h2>
                <p className="text-muted text-sm">Real-time bed availability management</p>
              </div>
              <button onClick={loadBeds} className="btn btn-primary shadow-sm" style={{ background: 'var(--info-color)', border: 'none' }}>
                Sync Data
              </button>
            </div>

            {err ? <div className="alert alert-danger">{err}</div> : null}

            <div className="card border-0 shadow-sm">
              <div className="card-header border-0 bg-white flex justify-between items-center py-3">
                <h4 className="font-bold mb-0 text-muted uppercase text-xs" style={{ letterSpacing: 1 }}>
                  All Hospital Beds {hospitalId ? `(${hospitalId})` : ''}
                </h4>
              </div>
              <div className="p-4">
                {loadingBeds ? (
                  <div className="text-center py-5 text-muted">Loading...</div>
                ) : (
                  <div className="grid grid-cols-4 gap-md">
                    {beds.map((b) => (
                      <div key={b._id || b.bedId} className="bed-card">
                        <div className="font-bold">{b.bedId}</div>
                        <div className="text-muted text-xs">Ward {b.wardNumber} | Bed {b.bedNumber}</div>
                        <div className="mt-2">
                          <span className="badge" style={{ background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529' }}>
                            {b.status}
                          </span>
                        </div>

                        <div style={{ width: '100%' }}>
                          <StatusButton status="Vacant" current={b.status} onClick={() => updateStatus(b.bedId, 'Vacant')} />
                          <StatusButton status="Occupied" current={b.status} onClick={() => updateStatus(b.bedId, 'Occupied')} />
                          <StatusButton status="Maintenance" current={b.status} onClick={() => updateStatus(b.bedId, 'Maintenance')} />
                          <StatusButton status="Cleaning" current={b.status} onClick={() => updateStatus(b.bedId, 'Cleaning')} />
                        </div>
                      </div>
                    ))}
                    {beds.length === 0 ? <div className="text-center py-5 col-span-4 text-muted">No beds found.</div> : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {active === 'profile' ? (
          <div className="animate-fade-in">
            <h2 className="font-bold mb-4">Staff Verification</h2>
            <div className="card" style={{ maxWidth: 600 }}>
              <div className="p-4">
                <div className="form-group">
                  <label className="text-xs uppercase font-bold text-muted">Legal Name</label>
                  <input className="form-control" value={nurse.name || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="text-xs uppercase font-bold text-muted">Nurse ID</label>
                  <input className="form-control" value={nurse.nurseId || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="text-xs uppercase font-bold text-muted">Hospital ID</label>
                  <input className="form-control" value={nurse.hospitalId || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="text-xs uppercase font-bold text-muted">Mobile</label>
                  <input className="form-control" value={nurse.mobile || ''} disabled />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
