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
        body: { role: 'ambulance', username: username.trim(), password }
      });
      setStored('jwt', data.token);
      setStored('role', 'ambulance');
      setStored('ambulance', JSON.stringify(data.ambulance || {}));
      onLoggedIn(data.ambulance || {});
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass shadow-lg" style={{ width: '100%', maxWidth: 420, borderTop: '4px solid var(--danger-color)' }}>
        <div className="card-header text-center border-0 pb-0">
          <img src="/images/ambulance.png" alt="Ambulance" style={{ width: 64, height: 64, marginBottom: '1rem' }} />
          <h3 className="text-danger">Ambulance Portal</h3>
          <p className="text-muted">Please login to access your dashboard</p>
        </div>
        <div className="p-4">
          <div className="form-group">
            <label className="form-label">Ambulance ID</label>
            <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., AMB001" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button onClick={login} disabled={loading} className="btn btn-danger btn-block">
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {msg ? <div className="alert alert-danger mt-3">{msg}</div> : null}
          <div className="text-center mt-3">
            <a href="/" className="text-sm text-muted">Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-control" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function Ambulance() {
  const [ambulance, setAmbulance] = useState(null);
  const [active, setActive] = useState('dashboard');
  const [hospital, setHospital] = useState(null);
  const [hospitals, setHospitals] = useState([]);

  const [status, setStatus] = useState('On Duty');
  const [requests, setRequests] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [err, setErr] = useState('');

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientAddr, setPatientAddr] = useState('');
  const [emType, setEmType] = useState('');
  const [equipment, setEquipment] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [reason, setReason] = useState('');
  const [targetHospitalId, setTargetHospitalId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hospitalId = ambulance?.hospitalId;

  useEffect(() => {
    const token = getStored('jwt');
    const role = getStored('role');
    const stored = getStored('ambulance');
    if (token && role === 'ambulance' && stored) {
      try {
        const a = JSON.parse(stored);
        setAmbulance(a);
      } catch {
        // ignore
      }
    }
  }, []);

  const logout = async () => {
    try {
      if (ambulance?.ambulanceId) {
        navigator.sendBeacon(
          `/api/ambulances/${ambulance.ambulanceId}`,
          new Blob([JSON.stringify({ status: 'Offline' })], { type: 'application/json' })
        );
      }
    } catch {
      // ignore
    }
    clearStored();
    window.location.href = '/';
  };

  const loadBaseHospital = async (hid) => {
    if (!hid) return;
    try {
      const h = await api(`/api/hospital/${hid}`);
      setHospital(h);
    } catch {
      // ignore
    }
  };

  const loadHospitals = async () => {
    try {
      const list = await api('/api/hospital');
      setHospitals(Array.isArray(list) ? list : []);
    } catch {
      setHospitals([]);
    }
  };

  const loadLiveRequests = async () => {
    if (!hospitalId || !ambulance?.ambulanceId) return;
    try {
      const all = await api(`/api/emergency/ambulance/${hospitalId}`);
      const mine = (Array.isArray(all) ? all : []).filter((r) => r.ambulanceId === ambulance.ambulanceId);
      setRequests(mine);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    if (!ambulance) return;
    setStatus(ambulance.status || 'On Duty');
    loadBaseHospital(ambulance.hospitalId);
    loadHospitals();

    const socket = getSocket();
    if (ambulance.ambulanceId) socket.emit('joinAmbulanceRoom', ambulance.ambulanceId);
    if (ambulance.hospitalId) socket.emit('joinHospitalRoom', ambulance.hospitalId);

    const pushUpdate = (text) => {
      setUpdates((prev) => [{ id: `${Date.now()}_${Math.random()}`, text, at: new Date().toLocaleString() }, ...prev].slice(0, 30));
    };

    const onReply = (payload) => {
      pushUpdate(`Hospital reply: ${payload.status} - ${payload.message}`);
      loadLiveRequests();
    };

    const onUpdate = (payload) => {
      if (payload?.emergencyId) pushUpdate(`Emergency update: ${payload.emergencyId} → ${payload.status || 'Updated'}`);
      loadLiveRequests();
    };

    const onResponse = (payload) => {
      pushUpdate(`Hospital response: ${payload.status || 'Updated'}`);
      loadLiveRequests();
    };

    socket.on('emergency:reply:ambulance', onReply);
    socket.on('emergency:update', onUpdate);
    socket.on('emergency:response', onResponse);

    const heartbeat = setInterval(() => {
      try {
        socket.emit('ambulance:heartbeat', {
          ambulanceId: ambulance.ambulanceId,
          hospitalId: ambulance.hospitalId,
          status: status || 'On Duty',
          location: ambulance.location || null
        });
      } catch {
        // ignore
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      socket.off('emergency:reply:ambulance', onReply);
      socket.off('emergency:update', onUpdate);
      socket.off('emergency:response', onResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambulance?.ambulanceId, ambulance?.hospitalId]);

  useEffect(() => {
    if (!ambulance) return;
    loadLiveRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambulance?.ambulanceId, ambulance?.hospitalId]);

  const changeStatus = async (next) => {
    setStatus(next);
    if (!ambulance?.ambulanceId) return;
    try {
      await api(`/api/ambulances/${ambulance.ambulanceId}`, { method: 'PUT', body: { status: next } });
      const updated = { ...ambulance, status: next };
      setAmbulance(updated);
      setStored('ambulance', JSON.stringify(updated));
      try {
        const socket = getSocket();
        socket.emit('ambulance:statusChange', {
          ambulanceId: ambulance.ambulanceId,
          hospitalId: ambulance.hospitalId,
          status: next,
          location: ambulance.location || null
        });
      } catch {
        // ignore
      }
    } catch (e) {
      window.alert(e.message);
    }
  };

  const submitEmergency = async () => {
    setErr('');
    if (!ambulance?.ambulanceId) return;
    if (!patientName.trim() || !patientMobile.trim() || !patientAddr.trim() || !emType || !symptoms.trim() || !reason.trim() || !targetHospitalId) {
      setErr('Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        hospitalId: targetHospitalId,
        ambulanceId: ambulance.ambulanceId,
        patient: {
          name: patientName.trim(),
          age: patientAge ? Number(patientAge) : undefined,
          gender: patientGender || undefined,
          contactMobile: patientMobile.trim(),
          address: patientAddr.trim()
        },
        emergencyType: emType,
        equipmentRequired: equipment || undefined,
        symptoms: symptoms.trim(),
        reason: reason.trim()
      };

      const res = await api('/api/emergency', { method: 'POST', body: payload });
      if (res?.success) {
        setPatientName('');
        setPatientAge('');
        setPatientGender('');
        setPatientMobile('');
        setPatientAddr('');
        setEmType('');
        setEquipment('');
        setSymptoms('');
        setReason('');
        setTargetHospitalId('');
        setActive('live');
        await loadLiveRequests();
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sendPrepInfo = async (id) => {
    const message = window.prompt('Enter preparation info to send to hospital (optional):') ?? '';
    if (!id) return;
    try {
      const res = await api(`/api/emergency/${id}/prep-info`, { method: 'PUT', body: { message } });
      if (res?.success) {
        await loadLiveRequests();
      }
    } catch (e) {
      window.alert(e.message);
    }
  };

  const baseHospitalName = useMemo(() => hospital?.name || hospitalId || '—', [hospital?.name, hospitalId]);

  if (!ambulance) return <Login onLoggedIn={(a) => setAmbulance(a)} />;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" style={{ height: 32 }} />
          <div>
            <h3 className="text-primary mb-0" style={{ fontSize: '1.2rem' }}>RapidCare</h3>
            <small className="text-muted">Ambulance Panel</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <a className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')}>
            <span>📊</span> Dashboard
          </a>
          <a className={`nav-item ${active === 'new' ? 'active' : ''}`} onClick={() => setActive('new')}>
            <span>🚨</span> New Request
          </a>
          <a className={`nav-item ${active === 'live' ? 'active' : ''}`} onClick={() => setActive('live')}>
            <span>📡</span> Live Status
          </a>
          <a className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => setActive('profile')}>
            <span>🚑</span> Profile
          </a>
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <a className="nav-item text-danger" onClick={logout}>
              <span>🚪</span> Logout
            </a>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        {err ? <div className="alert alert-danger">{err}</div> : null}

        {active === 'dashboard' ? (
          <div className="animate-fade-in">
            <h2 className="mb-3">Welcome, <span>{ambulance.ambulanceId}</span></h2>

            <div className="grid grid-cols-3 grid-auto-fit gap-md mb-4">
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-muted text-sm">Base Hospital</div>
                <h4 className="mb-0">{baseHospitalName}</h4>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-muted text-sm">Duty Status</div>
                <h4 className="mb-0">{status}</h4>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-muted text-sm">Vehicle No.</div>
                <h4 className="mb-0">{ambulance.vehicleNumber || ambulance.ambulanceNumber || '—'}</h4>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-header border-0 pb-0">
                <h3 className="font-bold">Status Control</h3>
                <p className="text-xs text-muted">Update your availability for dispatch</p>
              </div>
              <div className="grid grid-cols-2 gap-md p-3">
                <div className="form-group mb-0">
                  <label className="text-xs font-bold uppercase text-muted">Availability</label>
                  <select className="form-control" value={status} onChange={(e) => changeStatus(e.target.value)}>
                    <option value="On Duty">On Duty</option>
                    <option value="Offline">Offline</option>
                    <option value="In Transit">In Transit</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted">Live Status</label>
                  <div className="status-indicator" style={{ background: status === 'Offline' ? '#f8d7da' : status === 'In Transit' ? '#fff3cd' : '#d1e7dd', color: status === 'Offline' ? '#842029' : status === 'In Transit' ? '#856404' : '#0f5132' }}>
                    {status}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <div className="card">
                <div className="card-header">
                  <h3 className="mb-0">⚡ Quick Actions</h3>
                </div>
                <div className="flex gap-md flex-wrap p-3">
                  <button onClick={() => setActive('new')} className="btn btn-danger flex-1" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🚨</div>
                    Create Emergency Request
                  </button>
                  <button onClick={() => setActive('live')} className="btn btn-primary flex-1" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📡</div>
                    View Live Requests
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="mb-0">👨‍✈️ Crew Information</h3>
                </div>
                <div className="text-sm p-3">
                  <div className="flex justify-between border-bottom py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <strong>EMT</strong>
                    <span className="text-muted">{ambulance.emt?.name ? `${ambulance.emt.name} (${ambulance.emt.emtId})` : '—'}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <strong>Pilot</strong>
                    <span className="text-muted">{ambulance.pilot?.name ? `${ambulance.pilot.name} (${ambulance.pilot.pilotId})` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'new' ? (
          <div className="animate-fade-in">
            <div className="card border-danger" style={{ borderLeft: '4px solid var(--danger-color)', maxWidth: 900, margin: '0 auto' }}>
              <div className="card-header bg-light">
                <h3 className="mb-0 text-danger">🚨 New Emergency Request</h3>
                <p className="text-muted mb-0 text-sm">Submit patient details to alert the hospital reception immediately.</p>
              </div>

              <div className="p-3">
                <div className="grid grid-cols-2 gap-md">
                  <Field label="Patient Name *" value={patientName} onChange={setPatientName} placeholder="Full Name" />
                  <Field label="Age" value={patientAge} onChange={setPatientAge} type="number" placeholder="Years" />
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-control" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Field label="Mobile Number *" value={patientMobile} onChange={setPatientMobile} type="tel" placeholder="Contact Number" />
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Address *</label>
                    <input className="form-control" value={patientAddr} onChange={(e) => setPatientAddr(e.target.value)} placeholder="Current Location / Address" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Emergency Type *</label>
                    <select className="form-control" value={emType} onChange={(e) => setEmType(e.target.value)}>
                      <option value="">Select Type</option>
                      <option value="ICU">ICU</option>
                      <option value="General">General</option>
                      <option value="Cardiac">Cardiac</option>
                      <option value="Trauma">Trauma</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Neurological">Neurological</option>
                      <option value="Maternity">Maternity</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Required Equipment</label>
                    <select className="form-control" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                      <option value="">Select Equipment</option>
                      <option value="Wheelchair">Wheelchair</option>
                      <option value="Stretcher">Stretcher</option>
                      <option value="Oxygen">Oxygen</option>
                      <option value="Defibrillator">Defibrillator</option>
                      <option value="Ventilator">Ventilator</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Symptoms *</label>
                    <textarea className="form-control" rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Describe symptoms..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Reason for Emergency *</label>
                    <textarea className="form-control" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Accident, Illness, etc..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Select Hospital *</label>
                    <select className="form-control" value={targetHospitalId} onChange={(e) => setTargetHospitalId(e.target.value)}>
                      <option value="">Select Hospital</option>
                      {hospitals.map((h) => (
                        <option key={h._id || h.hospitalId} value={h.hospitalId}>{h.name || h.hospitalId}</option>
                      ))}
                    </select>
                    <small className="text-muted">Choose the hospital to send this emergency request to</small>
                  </div>
                </div>

                <button onClick={submitEmergency} disabled={submitting} className="btn btn-danger btn-block mt-3 py-3">
                  {submitting ? 'Submitting...' : '🚀 Send Emergency Alert'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'live' ? (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <h2>📡 Live Requests</h2>
              <button onClick={loadLiveRequests} className="btn btn-outline btn-sm">🔄 Refresh</button>
            </div>

            <div className="grid grid-cols-1 gap-md">
              {requests.map((r) => (
                <div key={r._id} className="card p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{r.patient?.name || 'Patient'}</div>
                      <div className="text-muted text-sm">{r.emergencyType || 'Emergency'} | {r.patient?.contactMobile || ''}</div>
                      <div className="text-muted text-sm">{r.patient?.address || ''}</div>
                    </div>
                    <div>
                      <span className="badge" style={{ background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529' }}>{r.status}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">{r.symptoms ? <div><strong>Symptoms:</strong> {r.symptoms}</div> : null}</div>
                  <div className="mt-3 flex gap-sm flex-wrap">
                    <button onClick={() => sendPrepInfo(r._id)} className="btn btn-sm btn-outline">Send Prep Info</button>
                  </div>
                </div>
              ))}
              {requests.length === 0 ? <div className="text-center text-muted p-4">No requests found.</div> : null}
            </div>

            <div className="card mt-4 bg-light border-0">
              <div className="card-header bg-transparent">
                <h4 className="mb-0 text-muted">Real-time Updates Log</h4>
              </div>
              <div className="text-sm text-muted" style={{ maxHeight: 180, overflowY: 'auto' }}>
                {updates.length === 0 ? <div className="p-2 text-center">Waiting for updates...</div> : null}
                {updates.map((u) => (
                  <div key={u.id} className="p-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="text-xs">{u.at}</div>
                    <div>{u.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {active === 'profile' ? (
          <div className="animate-fade-in">
            <h2 className="font-bold mb-4">Profile</h2>
            <div className="card" style={{ maxWidth: 800 }}>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-md">
                  <div className="form-group"><label className="form-label">Ambulance ID</label><input className="form-control" value={ambulance.ambulanceId || ''} disabled /></div>
                  <div className="form-group"><label className="form-label">Vehicle Number</label><input className="form-control" value={ambulance.vehicleNumber || ambulance.ambulanceNumber || ''} disabled /></div>
                  <div className="form-group"><label className="form-label">Hospital ID</label><input className="form-control" value={ambulance.hospitalId || ''} disabled /></div>
                  <div className="form-group"><label className="form-label">Status</label><input className="form-control" value={status} disabled /></div>
                </div>
                <div className="mt-3">
                  <h4 className="mb-2">Crew</h4>
                  <div className="grid grid-cols-2 gap-md">
                    <div className="card bg-light border-0 p-3">
                      <div className="font-bold">EMT</div>
                      <div className="text-sm text-muted">{ambulance.emt?.name || '—'}</div>
                      <div className="text-sm text-muted">{ambulance.emt?.mobile || ''}</div>
                    </div>
                    <div className="card bg-light border-0 p-3">
                      <div className="font-bold">Pilot</div>
                      <div className="text-sm text-muted">{ambulance.pilot?.name || '—'}</div>
                      <div className="text-sm text-muted">{ambulance.pilot?.mobile || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
