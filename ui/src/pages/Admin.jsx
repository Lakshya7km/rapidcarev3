import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { clearStored, getStored, setStored } from '../lib/storage.js';

function SectionTabs({ active, setActive }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/images/logo.png" alt="Logo" style={{ height: 30 }} />
        <h3 className="text-primary mb-0 ml-2" style={{ fontSize: '1.1rem' }}>RapidCare</h3>
      </div>
      <nav className="sidebar-nav">
        <a className={`nav-item ${active === 'overview' ? 'active' : ''}`} onClick={() => setActive('overview')}>
          <span>📊</span> System Cluster
        </a>
        <a className={`nav-item ${active === 'register-hospital' ? 'active' : ''}`} onClick={() => setActive('register-hospital')}>
          <span>🏥</span> Node Registration
        </a>
        <a className={`nav-item ${active === 'dbms' ? 'active' : ''}`} onClick={() => setActive('dbms')}>
          <span>🗄️</span> Master DBMS
        </a>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <a
            className="nav-item text-danger font-bold"
            onClick={() => {
              clearStored();
              window.location.href = '/';
            }}
          >
            <span>🚪</span> Terminal Exit
          </a>
        </div>
      </nav>
    </aside>
  );
}

function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setMsg('');
    setLoading(true);
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: { username, password }
      });
      setStored('jwt', data.token);
      setStored('role', 'superadmin');
      onLoggedIn();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createInitial = async () => {
    const u = window.prompt('Enter Username:');
    const p = window.prompt('Enter Password:');
    if (!u || !p) return;
    try {
      const data = await api('/api/admin/create-initial', { method: 'POST', body: { username: u, password: p } });
      window.alert(data.message || 'Done');
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card glass shadow-lg" style={{ width: '100%', maxWidth: 400, borderTop: '4px solid var(--primary-color)' }}>
        <div className="card-header text-center border-0 pb-0">
          <h2 className="text-primary font-bold">System Authority</h2>
          <p className="text-muted">Super Admin Terminal Access</p>
        </div>
        <div className="p-4">
          <div className="form-group">
            <label className="form-label uppercase text-xs font-bold text-muted">Admin Identifier</label>
            <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Administrator" />
          </div>
          <div className="form-group">
            <label className="form-label uppercase text-xs font-bold text-muted">Security Key</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button onClick={login} disabled={loading} className="btn btn-primary btn-block py-2 font-bold">
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
          <div className="mt-3 text-danger text-center text-xs font-bold">{msg}</div>
          <div className="text-center mt-4">
            <button onClick={createInitial} className="btn btn-xs btn-link text-muted font-bold uppercase" style={{ fontSize: '0.65rem' }}>
              Provision Initial Authority
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    api('/api/admin/stats')
      .then((data) => {
        if (mounted) setStats(data);
      })
      .catch(() => {
        if (mounted) setStats(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!stats) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="font-bold mb-1">System Topology</h2>
          <p className="text-muted text-sm">Cluster health and resource monitoring</p>
        </div>
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-bold mb-1">System Topology</h2>
        <p className="text-muted text-sm">Cluster health and resource monitoring</p>
      </div>
      <div className="grid grid-cols-4 gap-md mb-5">
        <div className="card text-center"><h3>{stats.hospitals}</h3><small>Hospitals</small></div>
        <div className="card text-center"><h3>{stats.doctors}</h3><small>Doctors</small></div>
        <div className="card text-center"><h3>{stats.ambulances}</h3><small>Ambulances</small></div>
        <div className="card text-center"><h3>{stats.activeEmergencies}</h3><small>Active Emergencies</small></div>
      </div>
    </div>
  );
}

function RegisterHospital() {
  const [form, setForm] = useState({
    hospitalId: '',
    name: '',
    password: '',
    contact: '',
    addressCity: '',
    lat: '',
    lng: ''
  });
  const [msg, setMsg] = useState('');

  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setMsg('');
    try {
      const body = {
        hospitalId: form.hospitalId.trim(),
        name: form.name.trim(),
        password: form.password,
        contact: form.contact.trim(),
        address: { city: form.addressCity.trim() },
        lat: form.lat === '' ? undefined : Number(form.lat),
        lng: form.lng === '' ? undefined : Number(form.lng)
      };

      const data = await api('/api/admin/register-hospital', { method: 'POST', body });
      if (data.tempPassword) {
        setMsg(`Hospital registered. Temporary password: ${data.tempPassword}`);
      } else {
        setMsg('Hospital registered successfully');
      }
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-bold mb-1">Provision New Node</h2>
        <p className="text-muted text-sm">Onboard hospital facility to the network</p>
      </div>

      <div className="card border-0 shadow-sm" style={{ maxWidth: 900 }}>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-md">
            <div className="form-group">
              <label className="text-xs uppercase font-bold text-muted">Unique Hospital ID</label>
              <input className="form-control" value={form.hospitalId} onChange={(e) => onChange('hospitalId', e.target.value)} placeholder="AIIMS-RPR" />
            </div>
            <div className="form-group">
              <label className="text-xs uppercase font-bold text-muted">Legal Facility Name</label>
              <input className="form-control" value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="General Medical Center" />
            </div>
            <div className="form-group">
              <label className="text-xs uppercase font-bold text-muted">Portal Authorization Key</label>
              <input type="password" className="form-control" value={form.password} onChange={(e) => onChange('password', e.target.value)} placeholder="Leave empty to auto-generate" />
            </div>
            <div className="form-group">
              <label className="text-xs uppercase font-bold text-muted">Emergency Dispatch Contact</label>
              <input className="form-control" value={form.contact} onChange={(e) => onChange('contact', e.target.value)} placeholder="+91 XXXX XXX XXX" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs uppercase font-bold text-muted">City</label>
              <input className="form-control" value={form.addressCity} onChange={(e) => onChange('addressCity', e.target.value)} placeholder="Raipur" />
            </div>
            <div className="form-group">
              <label className="text-xs uppercase font-bold text-muted">Geospatial Latitude</label>
              <input type="number" step="any" className="form-control" value={form.lat} onChange={(e) => onChange('lat', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="text-xs uppercase font-bold text-muted">Geospatial Longitude</label>
              <input type="number" step="any" className="form-control" value={form.lng} onChange={(e) => onChange('lng', e.target.value)} />
            </div>
          </div>

          <button onClick={submit} className="btn btn-primary mt-4 px-5 font-bold">Verify & Register Node</button>
          {msg ? <div className="mt-3">{msg}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Dbms() {
  const collections = useMemo(
    () => [
      { key: 'hospitals', label: '🏥 Hospitals' },
      { key: 'doctors', label: '👨‍⚕️ Doctors' },
      { key: 'ambulances', label: '🚑 Ambulances' },
      { key: 'beds', label: '🛏️ Beds' },
      { key: 'emergencies', label: '🚨 Emergencies' },
      { key: 'nurses', label: '👩‍⚕️ Nurses' },
      { key: 'announcements', label: '📢 Announcements' },
      { key: 'bloodbank', label: '🩸 Blood Bank' },
      { key: 'calllogs', label: '📞 Call Logs' },
      { key: 'superadmin', label: '🛡️ Super Admins' }
    ],
    []
  );

  const [col, setCol] = useState('hospitals');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editJson, setEditJson] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api(`/api/master/${col}`);
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col]);

  const headers = rows[0] ? Object.keys(rows[0]).filter((k) => k !== '__v') : [];

  const openEdit = (row) => {
    setEditId(row._id || '');
    setEditJson(JSON.stringify(row, null, 2));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    let body;
    try {
      body = JSON.parse(editJson);
    } catch (e) {
      window.alert('Invalid JSON: ' + e.message);
      return;
    }

    try {
      await api(`/api/master/${col}/${editId}`, { method: 'PUT', body });
      setEditOpen(false);
      await load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record permanently?')) return;
    try {
      await api(`/api/master/${col}/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-bold mb-0">Master Data Terminal</h2>
          <p className="text-muted text-sm">Direct object management across all clusters</p>
        </div>
        <div className="flex gap-sm">
          <select className="form-control font-bold" style={{ minWidth: 200 }} value={col} onChange={(e) => setCol(e.target.value)}>
            {collections.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <button onClick={load} className="btn btn-outline btn-sm font-bold">Sync</button>
        </div>
      </div>

      <div className="card border-0 shadow-sm p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 text-center text-muted col-span-full">Syncing objects...</div>
        ) : null}
        {error ? (
          <div className="p-3 text-danger">Error loading data: {error}</div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="p-5 text-center text-muted font-medium">No records found</div>
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-auto">
            <table className="table mb-0" style={{ minWidth: 1000 }}>
              <thead className="bg-light">
                <tr className="text-xs uppercase font-bold text-muted">
                  {headers.map((h) => (
                    <th key={h} className="py-3 px-4">{h}</th>
                  ))}
                  <th className="py-3 px-4">CONTROL</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rows.map((r) => (
                  <tr key={r._id || JSON.stringify(r)} className="border-bottom border-light">
                    {headers.map((h) => {
                      const val = r[h];
                      return (
                        <td key={h} className="py-3 px-4">
                          {typeof val === 'object' && val !== null
                            ? <span className="text-xs text-muted font-mono">{JSON.stringify(val).slice(0, 60)}...</span>
                            : String(val)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 flex gap-xs">
                      <button onClick={() => openEdit(r)} className="btn btn-xs btn-outline-info rounded px-2">Edit</button>
                      <button onClick={() => del(r._id)} className="btn btn-xs btn-outline-danger rounded px-2">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {editOpen ? (
        <div
          className="modal"
          style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="bg-white p-4 rounded shadow-lg" style={{ width: '90%', maxWidth: 600 }}>
            <h3 className="mb-3">Edit Record</h3>
            <div className="form-group">
              <label>JSON Data</label>
              <textarea
                className="form-control"
                rows={15}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
              />
              <small className="text-muted">Edit fields below and save. IDs are protected server-side.</small>
            </div>
            <div className="flex justify-end gap-sm mt-4">
              <button onClick={() => setEditOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={saveEdit} className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState('overview');

  useEffect(() => {
    const token = getStored('jwt');
    if (getStored('role') === 'superadmin' && token) setLoggedIn(true);
  }, []);

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;

  return (
    <div className="admin-container">
      <SectionTabs active={active} setActive={setActive} />
      <main className="main-content">
        {active === 'overview' ? <Overview /> : null}
        {active === 'register-hospital' ? <RegisterHospital /> : null}
        {active === 'dbms' ? <Dbms /> : null}
      </main>
    </div>
  );
}
