import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { clearStored, getStored, setStored } from '../lib/storage.js';

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
        body: { role: 'doctor', username: username.trim(), password }
      });
      setStored('jwt', data.token);
      setStored('role', 'doctor');
      setStored('doctor', JSON.stringify(data.doctor || {}));
      onLoggedIn(data.doctor || {});
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
          <img src="/images/doctor.png" alt="Doctor" style={{ width: 64, height: 64, marginBottom: '1rem' }} />
          <h3 className="text-primary">Doctor Portal</h3>
          <p className="text-muted">Please login to access your dashboard</p>
        </div>
        <div className="p-4">
          <div className="form-group">
            <label className="form-label">Doctor ID</label>
            <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., DOC001" />
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

export default function Doctor() {
  const [doctor, setDoctor] = useState(null);
  const [active, setActive] = useState('dashboard');
  const [hospital, setHospital] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [experience, setExperience] = useState('');
  const [photoFile, setPhotoFile] = useState(null);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState('Present');
  const [shift, setShift] = useState('Morning');

  useEffect(() => {
    const token = getStored('jwt');
    const role = getStored('role');
    const stored = getStored('doctor');
    if (token && role === 'doctor' && stored) {
      try {
        setDoctor(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const logout = () => {
    clearStored();
    window.location.href = '/';
  };

  const loadDashboard = async (d) => {
    if (!d?.doctorId) return;
    try {
      const h = await api(`/api/hospital/${d.hospitalId}`);
      setHospital(h);
    } catch {
      setHospital(null);
    }

    try {
      const list = await api(`/api/doctors/attendance/${d.doctorId}`);
      setAttendance(Array.isArray(list) ? list : []);
    } catch {
      setAttendance([]);
    }
  };

  const loadProfile = (d) => {
    setName(d?.name || '');
    setQualification(d?.qualification || '');
    setSpeciality(d?.speciality || '');
    setExperience(d?.experience || '');
    setPhotoFile(null);
  };

  useEffect(() => {
    if (!doctor) return;
    loadDashboard(doctor);
    loadProfile(doctor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor?.doctorId]);

  const saveProfile = async () => {
    if (!doctor?.doctorId) return;
    setErr('');
    setSaving(true);
    try {
      let nextPhotoUrl = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('hospitalId', doctor.hospitalId);

        const token = getStored('jwt') || '';
        const res = await fetch(`/api/doctors/${doctor.doctorId}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ message: 'Photo upload failed' }));
          throw new Error(data.message || 'Photo upload failed');
        }
        const data = await res.json();
        nextPhotoUrl = data?.doctor?.photoUrl || null;
      }

      const body = {
        name,
        qualification,
        speciality,
        experience,
        ...(nextPhotoUrl ? { photoUrl: nextPhotoUrl } : {})
      };

      await api(`/api/doctors/${doctor.doctorId}`, { method: 'PUT', body });
      const updated = await api(`/api/doctors/doctor/${doctor.doctorId}`);
      setDoctor(updated);
      setStored('doctor', JSON.stringify(updated));
      loadProfile(updated);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const markAttendance = async () => {
    if (!doctor?.doctorId) return;
    setErr('');
    try {
      await api('/api/doctors/attendance', {
        method: 'POST',
        body: {
          doctorId: doctor.doctorId,
          date,
          availability,
          shift,
          markedBy: 'Doctor',
          method: 'Manual'
        }
      });
      await loadDashboard(doctor);
    } catch (e) {
      setErr(e.message);
    }
  };

  const geofence = async (mode) => {
    if (!doctor?.doctorId) return;
    if (!navigator.geolocation) {
      setErr('Geolocation is not supported by your browser');
      return;
    }

    setErr('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await api(`/api/doctors/geofence-${mode}`, {
          method: 'POST',
          body: { doctorId: doctor.doctorId, lat: latitude, lng: longitude }
        });

        if (res?.success) {
          const updated = await api(`/api/doctors/doctor/${doctor.doctorId}`);
          setDoctor(updated);
          setStored('doctor', JSON.stringify(updated));
          await loadDashboard(updated);
        } else {
          setErr(res?.message || 'Geofence operation failed');
        }
      } catch (e) {
        setErr(e.message);
      }
    }, (e) => setErr(e.message), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const recent = useMemo(() => (attendance || []).slice(0, 5), [attendance]);

  if (!doctor) return <Login onLoggedIn={(d) => setDoctor(d)} />;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" style={{ height: 32 }} />
          <div>
            <h3 className="text-primary mb-0" style={{ fontSize: '1.2rem' }}>RapidCare</h3>
            <small className="text-muted">Doctor Panel</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <a className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')}>
            <span>📊</span> Dashboard
          </a>
          <a className={`nav-item ${active === 'attendance' ? 'active' : ''}`} onClick={() => setActive('attendance')}>
            <span>📍</span> Attendance
          </a>
          <a className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => setActive('profile')}>
            <span>⚙️</span> Profile
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
            <h2 className="mb-3">Welcome, <span>{doctor.name || doctor.doctorId}</span></h2>

            <div className="grid grid-cols-3 grid-auto-fit gap-md mb-4">
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-muted text-sm">Hospital</div>
                <h4 className="mb-0">{hospital?.name || doctor.hospitalId || '—'}</h4>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-muted text-sm">Availability</div>
                <h4 className="mb-0">{doctor.availability || 'Unknown'}</h4>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-muted text-sm">Shift</div>
                <h4 className="mb-0">{doctor.shift || 'Morning'}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <div className="card">
                <div className="card-header border-0 pb-0">
                  <h3 className="font-bold">Medical Actions</h3>
                </div>
                <div className="flex gap-md p-4">
                  <button onClick={() => setActive('attendance')} className="btn btn-outline flex-1 py-4">
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📍</div>
                    Presence Check
                  </button>
                  <button onClick={() => setActive('profile')} className="btn btn-outline flex-1 py-4">
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>⚙️</div>
                    Configure Profile
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header border-0 pb-0">
                  <h3 className="font-bold">Recent Logs</h3>
                </div>
                <div className="p-3 text-sm">
                  {recent.length ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Shift</th>
                          <th style={{ textAlign: 'left', padding: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.map((a) => (
                          <tr key={a._id || String(a.date)} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: 8 }}>{a.date ? new Date(a.date).toLocaleDateString() : ''}</td>
                            <td style={{ padding: 8 }}>{a.shift}</td>
                            <td style={{ padding: 8 }}>
                              <span className="badge" style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: a.availability === 'Present' ? '#d1e7dd' : '#f8d7da', color: a.availability === 'Present' ? '#0f5132' : '#842029', fontSize: '0.85rem' }}>
                                {a.availability}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center text-muted py-2">No recent records</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'profile' ? (
          <div className="animate-fade-in">
            <div className="card" style={{ maxWidth: 900 }}>
              <div className="card-header flex justify-between items-center">
                <h3 className="mb-0">Profile Management</h3>
                <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-md">
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Profile Photo</label>
                    <div className="flex items-center gap-md">
                      <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #dee2e6', fontSize: '2rem' }}>
                        {doctor.photoUrl ? (
                          <img src={doctor.photoUrl} alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <span>👨‍⚕️</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="file" className="form-control" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                        <small className="text-muted">Upload a new profile photo (Max 5MB)</small>
                      </div>
                    </div>
                  </div>

                  <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Qualification</label><input className="form-control" value={qualification} onChange={(e) => setQualification(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Speciality</label><input className="form-control" value={speciality} onChange={(e) => setSpeciality(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Experience (Years)</label><input className="form-control" value={experience} onChange={(e) => setExperience(e.target.value)} /></div>
                </div>
              </div>
            </div>

            <div className="card bg-light border-0 mt-3" style={{ maxWidth: 900 }}>
              <div className="card-header bg-transparent">
                <h3 className="mb-0 text-muted">🏥 Associated Hospital</h3>
              </div>
              <div className="p-3 text-sm grid grid-cols-2 gap-md">
                <div><strong>Name:</strong> {hospital?.name || '—'}</div>
                <div><strong>City:</strong> {hospital?.address?.city || '—'}</div>
                <div><strong>Contact:</strong> {hospital?.contact || '—'}</div>
                <div><strong>Services:</strong> {(hospital?.services || []).join(', ') || '—'}</div>
              </div>
            </div>
          </div>
        ) : null}

        {active === 'attendance' ? (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 gap-md" style={{ maxWidth: 1000 }}>
              <div className="card">
                <div className="card-header border-0 pb-0">
                  <h3 className="font-bold">Proximity Compliance</h3>
                  <p className="text-xs text-muted">Verify your presence using hospital geofencing (100m range)</p>
                </div>
                <div className="flex gap-md p-4">
                  <button onClick={() => geofence('checkin')} className="btn btn-success flex-1 py-4">Start Duty Shift</button>
                  <button onClick={() => geofence('checkout')} className="btn btn-outline flex-1 py-4 text-danger border-danger">End Duty Shift</button>
                </div>
              </div>

              <div className="card">
                <div className="card-header border-0 pb-0">
                  <h3 className="font-bold">Manual Log Correction</h3>
                </div>
                <div className="p-4 grid grid-cols-4 gap-sm items-end">
                  <div className="form-group mb-0">
                    <label className="form-label">Date</label>
                    <input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Shift</label>
                    <select className="form-control" value={shift} onChange={(e) => setShift(e.target.value)}>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                  <button onClick={markAttendance} className="btn btn-primary">Submit</button>
                </div>
              </div>

              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <h3 className="mb-0">Attendance History</h3>
                  <button onClick={() => loadDashboard(doctor)} className="btn btn-sm btn-outline">Refresh</button>
                </div>
                <div className="overflow-auto" style={{ maxHeight: 400 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-body)', borderBottom: '2px solid var(--border-color)' }}>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">In</th>
                        <th className="p-2 text-left">Out</th>
                        <th className="p-2 text-left">Hours</th>
                        <th className="p-2 text-left">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(attendance || []).map((a) => (
                        <tr key={a._id || String(a.date)} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td className="p-2">{a.date ? new Date(a.date).toLocaleDateString() : ''}</td>
                          <td className="p-2">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="p-2">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="p-2"><strong>{a.totalHours || 0}h</strong></td>
                          <td className="p-2 text-muted text-sm">{a.method || 'Manual'}</td>
                        </tr>
                      ))}
                      {attendance.length === 0 ? (
                        <tr><td className="p-3 text-center text-muted" colSpan={5}>No attendance history.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
