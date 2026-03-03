import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { clearStored, getStored, setStored } from '../lib/storage.js';
import { getSocket } from '../lib/socket.js';

function Login({ onLoggedIn }) {
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setMsg('');
    setLoading(true);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { role: 'hospital', username: hospitalId.trim(), password }
      });
      setStored('jwt', data.token);
      setStored('role', 'hospital');
      setStored('hospitalId', hospitalId.trim());
      onLoggedIn(hospitalId.trim());
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass shadow-lg" style={{ width: '100%', maxWidth: 420, borderTop: '4px solid var(--primary-color)' }}>
        <div className="card-header text-center border-0 pb-0">
          <img src="/images/reception.png" alt="Reception" style={{ width: 64, height: 64, marginBottom: '1rem' }} />
          <h3 className="text-primary">Reception Portal</h3>
          <p className="text-muted">Login with Hospital ID</p>
        </div>
        <div className="p-4">
          <div className="form-group">
            <label className="form-label">Hospital ID</label>
            <input className="form-control" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} placeholder="e.g., AIIMS-RPR" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button onClick={login} disabled={loading} className="btn btn-primary btn-block">
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

function TabLink({ active, label, icon, onClick }) {
  return (
    <a className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{icon}</span> {label}
    </a>
  );
}

export default function Reception() {
  const [hospitalId, setHospitalId] = useState('');
  const [active, setActive] = useState('dashboard');

  const [hospital, setHospital] = useState(null);
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [bloodbank, setBloodbank] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [callLogs, setCallLogs] = useState([]);

  const [err, setErr] = useState('');

  useEffect(() => {
    const token = getStored('jwt');
    const role = getStored('role');
    const hid = getStored('hospitalId');
    if (token && role === 'hospital' && hid) {
      setHospitalId(hid);
    }
  }, []);

  const logout = () => {
    clearStored();
    window.location.href = '/';
  };

  const loadAll = async () => {
    if (!hospitalId) return;
    setErr('');
    try {
      const [h, b, d, a, e] = await Promise.all([
        api(`/api/hospital/${hospitalId}`),
        api(`/api/beds/${hospitalId}`),
        api(`/api/doctors/${hospitalId}`),
        api(`/api/ambulances/${hospitalId}`),
        api(`/api/emergency/${hospitalId}`)
      ]);
      setHospital(h);
      setBeds(Array.isArray(b) ? b : []);
      setDoctors(Array.isArray(d) ? d : []);
      setAmbulances(Array.isArray(a) ? a : []);
      setEmergencies(Array.isArray(e) ? e : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadHospital = async () => {
    if (!hospitalId) return;
    try {
      const h = await api(`/api/hospital/${hospitalId}`);
      setHospital(h);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadBeds = async () => {
    if (!hospitalId) return;
    try {
      const b = await api(`/api/beds/${hospitalId}`);
      setBeds(Array.isArray(b) ? b : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadDoctors = async () => {
    if (!hospitalId) return;
    try {
      const d = await api(`/api/doctors/${hospitalId}`);
      setDoctors(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadAmbulances = async () => {
    if (!hospitalId) return;
    try {
      const a = await api(`/api/ambulances/${hospitalId}`);
      setAmbulances(Array.isArray(a) ? a : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadEmergencies = async () => {
    if (!hospitalId) return;
    try {
      const e = await api(`/api/emergency/${hospitalId}`);
      setEmergencies(Array.isArray(e) ? e : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadBloodbank = async () => {
    if (!hospitalId) return;
    try {
      const list = await api(`/api/hospital/${hospitalId}/bloodbank`);
      setBloodbank(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadAnnouncements = async () => {
    if (!hospitalId) return;
    try {
      const list = await api(`/api/hospital/${hospitalId}/announcements`);
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadCallLogs = async () => {
    if (!hospitalId) return;
    try {
      const list = await api(`/api/hospital/${hospitalId}/call-log`);
      setCallLogs(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    if (!hospitalId) return;
    loadAll();

    const socket = getSocket();
    socket.emit('joinHospitalRoom', hospitalId);

    const onBed = () => {
      loadBeds();
      if (active === 'dashboard') loadAll();
    };
    const onEmergency = () => {
      loadEmergencies();
      if (active === 'dashboard') loadAll();
    };
    const onDoctorAttendance = () => {
      loadDoctors();
      if (active === 'dashboard') loadAll();
    };
    const onAmb = () => {
      loadAmbulances();
      if (active === 'dashboard') loadAll();
    };

    socket.on('bed:update', onBed);
    socket.on('emergency:new:public', onEmergency);
    socket.on('emergency:new:ambulance', onEmergency);
    socket.on('emergency:update', onEmergency);
    socket.on('doctor:attendance', onDoctorAttendance);
    socket.on('ambulance:statusUpdate', onAmb);

    return () => {
      socket.off('bed:update', onBed);
      socket.off('emergency:new:public', onEmergency);
      socket.off('emergency:new:ambulance', onEmergency);
      socket.off('emergency:update', onEmergency);
      socket.off('doctor:attendance', onDoctorAttendance);
      socket.off('ambulance:statusUpdate', onAmb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  useEffect(() => {
    if (!hospitalId) return;
    if (active === 'dashboard') loadAll();
    if (active === 'hospital') loadHospital();
    if (active === 'beds') loadBeds();
    if (active === 'doctors') loadDoctors();
    if (active === 'ambulances') loadAmbulances();
    if (active === 'emergencies') loadEmergencies();
    if (active === 'bloodbank') loadBloodbank();
    if (active === 'announcements') loadAnnouncements();
    if (active === 'calls') loadCallLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hospitalId]);

  const stats = useMemo(() => {
    const vacantBeds = beds.filter((b) => b.status !== 'Occupied').length;
    const occupiedBeds = beds.filter((b) => b.status === 'Occupied').length;
    const availableDocs = doctors.filter((d) => d.availability === 'Available').length;
    const onDutyAmb = ambulances.filter((a) => (a.status || '').toLowerCase().includes('on')).length;
    const pendingEm = emergencies.filter((e) => (e.status || '').toLowerCase() === 'pending').length;
    return { vacantBeds, occupiedBeds, availableDocs, onDutyAmb, pendingEm };
  }, [beds, doctors, ambulances, emergencies]);

  const toggleBed = async (bed) => {
    if (!bed?.bedId) return;
    const newStatus = bed.status === 'Occupied' ? 'Vacant' : 'Occupied';
    try {
      await api(`/api/beds/${bed.bedId}`, { method: 'PUT', body: { status: newStatus } });
      await loadBeds();
    } catch (e) {
      setErr(e.message);
    }
  };

  const replyEmergency = async (em) => {
    if (!em?._id) return;
    const status = window.prompt('Reply status (Accepted / Rejected / Transferred / Pending):', em.status || 'Accepted');
    if (!status) return;
    const message = window.prompt('Reply message:', 'Reception received. Please standby.') || 'Reception received.';
    const reason = window.prompt('Reason (optional):', '') || '';

    try {
      await api(`/api/emergency/${em._id}/reply`, {
        method: 'PUT',
        body: {
          status,
          message,
          reason,
          repliedBy: hospitalId,
          repliedAt: new Date().toISOString()
        }
      });
      await loadEmergencies();
    } catch (e) {
      setErr(e.message);
    }
  };

  const updateHospitalInfo = async () => {
    if (!hospitalId) return;
    const name = window.prompt('Hospital name:', hospital?.name || '') ?? null;
    if (name === null) return;
    const contact = window.prompt('Contact:', hospital?.contact || '') ?? null;
    if (contact === null) return;
    try {
      await api(`/api/hospital/${hospitalId}`, { method: 'PUT', body: { name, contact } });
      await loadHospital();
    } catch (e) {
      setErr(e.message);
    }
  };

  const upsertBlood = async () => {
    const bloodGroup = window.prompt('Blood group (e.g. O+, A-):', '') || '';
    if (!bloodGroup.trim()) return;
    const units = window.prompt('Units:', '0');
    if (units === null) return;
    try {
      await api(`/api/hospital/${hospitalId}/bloodbank`, { method: 'POST', body: { bloodGroup: bloodGroup.trim(), units: Number(units) } });
      await loadBloodbank();
    } catch (e) {
      setErr(e.message);
    }
  };

  const createAnnouncement = async () => {
    const message = window.prompt('Announcement message:', '') || '';
    if (!message.trim()) return;
    const severity = window.prompt('Severity (Info/Warning/Critical):', 'Info') || 'Info';
    const durationHours = window.prompt('Duration hours:', '24');
    if (durationHours === null) return;
    try {
      await api(`/api/hospital/${hospitalId}/announcements`, { method: 'POST', body: { message: message.trim(), severity, durationHours: Number(durationHours) } });
      await loadAnnouncements();
    } catch (e) {
      setErr(e.message);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!id) return;
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api(`/api/hospital/${hospitalId}/announcements/${id}`, { method: 'DELETE' });
      await loadAnnouncements();
    } catch (e) {
      setErr(e.message);
    }
  };

  const refresh = () => {
    if (active === 'dashboard') loadAll();
    if (active === 'hospital') loadHospital();
    if (active === 'beds') loadBeds();
    if (active === 'doctors') loadDoctors();
    if (active === 'ambulances') loadAmbulances();
    if (active === 'emergencies') loadEmergencies();
    if (active === 'bloodbank') loadBloodbank();
    if (active === 'announcements') loadAnnouncements();
    if (active === 'calls') loadCallLogs();
  };

  if (!hospitalId) return <Login onLoggedIn={(hid) => setHospitalId(hid)} />;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" style={{ height: 32 }} />
          <div>
            <h3 className="text-primary mb-0" style={{ fontSize: '1.2rem' }}>RapidCare</h3>
            <small className="text-muted">Reception Panel</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <TabLink active={active === 'dashboard'} icon="📊" label="Dashboard" onClick={() => setActive('dashboard')} />
          <TabLink active={active === 'hospital'} icon="🏥" label="Hospital" onClick={() => setActive('hospital')} />
          <TabLink active={active === 'beds'} icon="🛏️" label="Beds" onClick={() => setActive('beds')} />
          <TabLink active={active === 'doctors'} icon="👨‍⚕️" label="Doctors" onClick={() => setActive('doctors')} />
          <TabLink active={active === 'ambulances'} icon="🚑" label="Ambulances" onClick={() => setActive('ambulances')} />
          <TabLink active={active === 'emergencies'} icon="🚨" label="Emergencies" onClick={() => setActive('emergencies')} />
          <TabLink active={active === 'bloodbank'} icon="🩸" label="Blood Bank" onClick={() => setActive('bloodbank')} />
          <TabLink active={active === 'announcements'} icon="📢" label="Announcements" onClick={() => setActive('announcements')} />
          <TabLink active={active === 'calls'} icon="📞" label="Call Logs" onClick={() => setActive('calls')} />

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <a className="nav-item text-danger" onClick={logout}>
              <span>🚪</span> Logout
            </a>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="mb-0">{hospital?.name || hospitalId}</h2>
            <div className="text-muted text-sm">Reception Dashboard</div>
          </div>
          <button onClick={refresh} className="btn btn-outline btn-sm">🔄 Refresh</button>
        </div>

        {err ? <div className="alert alert-danger">{err}</div> : null}

        {active === 'dashboard' ? (
          <div className="animate-fade-in">
            <div className="grid grid-cols-5 grid-auto-fit gap-md mb-4">
              <div className="card p-3"><div className="text-muted text-xs">Vacant Beds</div><div className="font-bold" style={{ fontSize: '1.4rem' }}>{stats.vacantBeds}</div></div>
              <div className="card p-3"><div className="text-muted text-xs">Occupied Beds</div><div className="font-bold" style={{ fontSize: '1.4rem' }}>{stats.occupiedBeds}</div></div>
              <div className="card p-3"><div className="text-muted text-xs">Available Doctors</div><div className="font-bold" style={{ fontSize: '1.4rem' }}>{stats.availableDocs}</div></div>
              <div className="card p-3"><div className="text-muted text-xs">On-duty Ambulances</div><div className="font-bold" style={{ fontSize: '1.4rem' }}>{stats.onDutyAmb}</div></div>
              <div className="card p-3"><div className="text-muted text-xs">Pending Emergencies</div><div className="font-bold" style={{ fontSize: '1.4rem' }}>{stats.pendingEm}</div></div>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <div className="card">
                <div className="card-header">
                  <h3 className="mb-0">Recent Emergencies</h3>
                </div>
                <div className="p-3">
                  {(emergencies || []).slice(0, 5).map((e) => (
                    <div key={e._id} style={{ borderBottom: '1px solid var(--border-color)', padding: '0.5rem 0' }}>
                      <div className="font-bold">{e.patient?.name || 'Patient'} <span className="text-muted">({e.submittedBy})</span></div>
                      <div className="text-muted text-sm">{e.emergencyType || ''} | {e.status}</div>
                    </div>
                  ))}
                  {emergencies.length === 0 ? <div className="text-center text-muted">No emergencies</div> : null}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="mb-0">Quick Links</h3>
                </div>
                <div className="p-3 flex gap-sm flex-wrap">
                  <button className="btn btn-sm btn-outline" onClick={() => setActive('beds')}>Manage Beds</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setActive('doctors')}>Manage Doctors</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setActive('ambulances')}>Manage Ambulances</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setActive('emergencies')}>Emergency Inbox</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'hospital' ? (
          <div className="animate-fade-in">
            <div className="card" style={{ maxWidth: 900 }}>
              <div className="card-header flex justify-between items-center">
                <h3 className="mb-0">Hospital Info</h3>
                <button className="btn btn-sm btn-primary" onClick={updateHospitalInfo}>Edit</button>
              </div>
              <div className="p-3 text-sm grid grid-cols-2 gap-md">
                <div><strong>ID:</strong> {hospitalId}</div>
                <div><strong>Name:</strong> {hospital?.name || '—'}</div>
                <div><strong>Contact:</strong> {hospital?.contact || '—'}</div>
                <div><strong>City:</strong> {hospital?.address?.city || '—'}</div>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'beds' ? (
          <div className="animate-fade-in">
            <div className="card border-0 shadow-sm">
              <div className="card-header flex justify-between items-center">
                <h3 className="mb-0">Beds</h3>
                <div className="flex gap-sm">
                  <button className="btn btn-sm btn-outline" onClick={() => window.open(`/api/beds/pdf/mass/${hospitalId}`, '_blank')}>Print Mass QR (PDF)</button>
                </div>
              </div>
              <div className="p-3 overflow-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-2 text-left">Bed</th>
                      <th className="p-2 text-left">Ward</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beds.map((b) => (
                      <tr key={b._id || b.bedId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="p-2">{b.bedId}</td>
                        <td className="p-2">{b.wardNumber}</td>
                        <td className="p-2">{b.bedType}</td>
                        <td className="p-2"><span className="badge" style={{ background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529' }}>{b.status}</span></td>
                        <td className="p-2">
                          <button className="btn btn-sm btn-outline" onClick={() => toggleBed(b)}>{b.status === 'Occupied' ? '🤝 Discharge' : '🛌 Occupy'}</button>
                          <a href={`/api/beds/pdf/${encodeURIComponent(b.bedId)}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ marginLeft: 8 }}>QR</a>
                        </td>
                      </tr>
                    ))}
                    {beds.length === 0 ? <tr><td className="p-3 text-center text-muted" colSpan={5}>No beds found.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'doctors' ? (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header">
                <h3 className="mb-0">Doctors</h3>
              </div>
              <div className="p-3 overflow-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-2 text-left">Doctor</th>
                      <th className="p-2 text-left">Speciality</th>
                      <th className="p-2 text-left">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr key={d._id || d.doctorId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="p-2">{d.name || d.doctorId}</td>
                        <td className="p-2">{d.speciality || '—'}</td>
                        <td className="p-2">{d.availability || '—'}</td>
                      </tr>
                    ))}
                    {doctors.length === 0 ? <tr><td className="p-3 text-center text-muted" colSpan={3}>No doctors found.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'ambulances' ? (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header">
                <h3 className="mb-0">Ambulances</h3>
              </div>
              <div className="p-3 overflow-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-2 text-left">Ambulance ID</th>
                      <th className="p-2 text-left">Vehicle</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambulances.map((a) => (
                      <tr key={a._id || a.ambulanceId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="p-2">{a.ambulanceId}</td>
                        <td className="p-2">{a.vehicleNumber || a.ambulanceNumber || '—'}</td>
                        <td className="p-2">{a.status || '—'}</td>
                      </tr>
                    ))}
                    {ambulances.length === 0 ? <tr><td className="p-3 text-center text-muted" colSpan={3}>No ambulances found.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'emergencies' ? (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h3 className="mb-0">Emergencies Inbox</h3>
              </div>
              <div className="p-3 grid grid-cols-1 gap-md">
                {emergencies.map((e) => (
                  <div key={e._id} className="card p-3" style={{ border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{e.patient?.name || 'Patient'} <span className="text-muted">({e.submittedBy})</span></div>
                        <div className="text-muted text-sm">{e.patient?.contactMobile || ''} | {e.patient?.address || ''}</div>
                        <div className="text-sm"><strong>Type:</strong> {e.emergencyType || '—'}</div>
                        <div className="text-sm"><strong>Status:</strong> {e.status || '—'}</div>
                      </div>
                      <button className="btn btn-sm btn-outline" onClick={() => replyEmergency(e)}>Reply</button>
                    </div>
                    {e.symptoms ? <div className="text-sm mt-2"><strong>Symptoms:</strong> {e.symptoms}</div> : null}
                    {e.reason ? <div className="text-sm"><strong>Reason:</strong> {e.reason}</div> : null}
                    {e.replyMessage ? <div className="text-sm mt-2"><strong>Last Reply:</strong> {e.replyMessage}</div> : null}
                  </div>
                ))}
                {emergencies.length === 0 ? <div className="text-center text-muted p-4">No emergencies</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {active === 'bloodbank' ? (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h3 className="mb-0">Blood Bank</h3>
                <button className="btn btn-sm btn-primary" onClick={upsertBlood}>Update</button>
              </div>
              <div className="p-3 overflow-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-2 text-left">Group</th>
                      <th className="p-2 text-left">Units</th>
                      <th className="p-2 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloodbank.map((b) => (
                      <tr key={b._id || b.bloodGroup} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="p-2">{b.bloodGroup}</td>
                        <td className="p-2">{b.units}</td>
                        <td className="p-2">{b.lastUpdated ? new Date(b.lastUpdated).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {bloodbank.length === 0 ? <tr><td className="p-3 text-center text-muted" colSpan={3}>No blood bank entries.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'announcements' ? (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h3 className="mb-0">Announcements</h3>
                <button className="btn btn-sm btn-primary" onClick={createAnnouncement}>New</button>
              </div>
              <div className="p-3 grid grid-cols-1 gap-sm">
                {announcements.map((a) => (
                  <div key={a._id} className="card p-3" style={{ border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{a.severity || 'Info'}</div>
                        <div className="text-sm">{a.message}</div>
                        <div className="text-xs text-muted">Expires: {a.expiresAt ? new Date(a.expiresAt).toLocaleString() : '—'}</div>
                      </div>
                      <button className="btn btn-sm btn-outline text-danger border-danger" onClick={() => deleteAnnouncement(a._id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 ? <div className="text-center text-muted p-4">No announcements</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {active === 'calls' ? (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header">
                <h3 className="mb-0">Call Logs</h3>
              </div>
              <div className="p-3 overflow-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-2 text-left">Caller</th>
                      <th className="p-2 text-left">Mobile</th>
                      <th className="p-2 text-left">Reason</th>
                      <th className="p-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.map((c) => (
                      <tr key={c._id || String(c.calledAt)} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="p-2">{c.callerName || '—'}</td>
                        <td className="p-2">{c.callerMobile || '—'}</td>
                        <td className="p-2">{c.reason || '—'}</td>
                        <td className="p-2">{c.calledAt ? new Date(c.calledAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {callLogs.length === 0 ? <tr><td className="p-3 text-center text-muted" colSpan={4}>No call logs.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
