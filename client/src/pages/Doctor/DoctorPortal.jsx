import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { LayoutDashboard, UserRound, ClipboardList, LogOut, Upload, Save, MapPin, CheckCircle, AlertCircle } from 'lucide-react'

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'profile', label: 'My Profile', icon: UserRound },
    { key: 'attendance', label: 'Attendance', icon: ClipboardList },
]

export default function DoctorPortal() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('dashboard')
    const [doctor, setDoctor] = useState(null)
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')
    const [error, setError] = useState('')
    const [profForm, setProfForm] = useState({})
    const [manualForm, setManualForm] = useState({ date: new Date().toISOString().split('T')[0], availability: 'Present', shift: 'Morning' })
    const [geoLoading, setGeoLoading] = useState(false)

    const doctorId = user?.doctorId || user?.ref

    useEffect(() => {
        Promise.all([
            api.get(`/doctors/doctor/${doctorId}`),
            api.get(`/doctors/attendance/${doctorId}`)
        ]).then(([d, a]) => {
            setDoctor(d.data); setProfForm(d.data); setAttendance(a.data)
        }).finally(() => setLoading(false))
    }, [doctorId])

    const saveProfile = async () => {
        const { _id, __v, password, ...update } = profForm
        await api.put(`/doctors/${doctorId}`, update); setMsg('Profile updated!')
    }

    const uploadPhoto = async (e) => {
        const file = e.target.files[0]; if (!file) return
        const fd = new FormData(); fd.append('photo', file)
        const r = await api.post(`/doctors/${doctorId}/photo`, fd)
        setDoctor(r.data.doctor); setMsg('Photo updated!')
    }

    const markManual = async () => {
        await api.post('/doctors/attendance', { doctorId, hospitalId: doctor.hospitalId, ...manualForm, method: 'Manual' })
        const r = await api.get(`/doctors/attendance/${doctorId}`); setAttendance(r.data); setMsg('Attendance marked!')
    }

    const geoCheckin = async (type) => {
        setGeoLoading(true); setError('')
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const endpoint = type === 'in' ? '/doctors/geofence-checkin' : '/doctors/geofence-checkout'
                await api.post(endpoint, { doctorId, lat: pos.coords.latitude, lng: pos.coords.longitude })
                const r = await api.get(`/doctors/attendance/${doctorId}`); setAttendance(r.data)
                setMsg(type === 'in' ? '✅ Check-in recorded!' : '✅ Check-out recorded!')
            } catch (e) { setError(e.response?.data?.message || 'Failed') }
            finally { setGeoLoading(false) }
        }, () => { setError('Location access denied'); setGeoLoading(false) })
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    const today = attendance.find(a => new Date(a.date).toDateString() === new Date().toDateString())

    return (
        <div className="page">
            {/* TOPBAR */}
            <div className="topbar">
                <div className="topbar-logo">👨‍⚕️ <span>{TABS.find(t => t.key === tab)?.label || 'Doctor Portal'}</span></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Desktop tab nav in topbar */}
                    <nav style={{ display: 'none' }} id="doc-tab-nav" className="desktop-tab-nav">
                        {TABS.map(t => {
                            const Icon = t.icon
                            return (
                                <button key={t.key} onClick={() => setTab(t.key)} style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                                    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                                    background: tab === t.key ? 'var(--primary-light)' : 'transparent',
                                    color: tab === t.key ? 'var(--primary)' : 'var(--text2)',
                                    fontWeight: tab === t.key ? 600 : 400,
                                }}>
                                    <Icon size={15} />{t.label}
                                </button>
                            )
                        })}
                    </nav>
                    <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/') }} title="Logout"><LogOut size={18} /></button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ padding: '16px', paddingBottom: 80, maxWidth: 900, margin: '0 auto' }}>
                {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}

                {/* Dashboard */}
                {tab === 'dashboard' && (
                    <div>
                        <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg,#0f172a,#0c2a4a)', color: 'white' }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                {doctor?.photoUrl
                                    ? <img src={doctor.photoUrl} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                    : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>{doctor?.name?.[0]}</div>
                                }
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 17 }}>Good day, {doctor?.name?.split(' ')[1] || doctor?.name}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{doctor?.speciality} · {doctor?.doctorId}</div>
                                    <div style={{ fontSize: 12, color: '#7dd3fc' }}>🏥 {doctor?.hospitalId}</div>
                                </div>
                            </div>
                        </div>
                        <div className="stat-grid">
                            {[
                                { label: 'Hospital', val: doctor?.hospitalId || '-', color: '#0ea5e9' },
                                { label: 'Status', val: doctor?.availability || 'Available', color: '#22c55e' },
                                { label: 'Shift', val: doctor?.shift || 'Morning', color: '#8b5cf6' },
                                { label: 'Days Present', val: attendance.filter(a => a.availability === 'Present').length, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} className="stat-card" style={{ '--accent': s.color }}>
                                    <div className="stat-val" style={{ fontSize: 18 }}>{s.val}</div>
                                    <div className="stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="card">
                            <div className="card-header"><ClipboardList size={16} /><span className="card-title">Recent Attendance</span></div>
                            {attendance.slice(0, 5).map(a => (
                                <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                                    <span>{new Date(a.date).toLocaleDateString()}</span>
                                    <span style={{ color: 'var(--text2)' }}>{a.shift}</span>
                                    <span className={`badge ${a.availability === 'Present' ? 'badge-green' : 'badge-red'}`}>{a.availability}</span>
                                </div>
                            ))}
                            {attendance.length === 0 && <div className="empty"><p>No attendance records</p></div>}
                        </div>
                    </div>
                )}

                {/* Profile */}
                {tab === 'profile' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            {doctor?.photoUrl
                                ? <img src={doctor.photoUrl} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} alt="" />
                                : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto', color: 'var(--primary)', fontWeight: 800 }}>{doctor?.name?.[0]}</div>
                            }
                            <label className="btn btn-outline btn-sm" style={{ marginTop: 12, cursor: 'pointer' }}>
                                <Upload size={14} /> Change Photo
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
                            </label>
                        </div>
                        {[{ k: 'name', l: 'Full Name' }, { k: 'speciality', l: 'Speciality' }, { k: 'qualification', l: 'Qualification' }, { k: 'experience', l: 'Experience' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={profForm[f.k] || ''} onChange={e => setProfForm(p => ({ ...p, [f.k]: e.target.value }))} />
                            </div>
                        ))}
                        <button className="btn btn-primary btn-full" onClick={saveProfile}><Save size={16} /> Save Profile</button>
                    </div>
                )}

                {/* Attendance */}
                {tab === 'attendance' && (
                    <div>
                        {error && <div className="alert alert-error"><AlertCircle size={14} />{error}</div>}

                        {/* GPS Buttons */}
                        <div className="card" style={{ marginBottom: 14 }}>
                            <div className="card-header"><MapPin size={18} color="var(--primary)" /><span className="card-title">GPS Geofence</span></div>
                            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Must be within 100m of your hospital</p>
                            {today && <div className="alert alert-info" style={{ marginBottom: 10 }}>Today: <strong>{today.availability}</strong> · {today.checkIn ? `In: ${new Date(today.checkIn).toLocaleTimeString()}` : ''} {today.checkOut ? `· Out: ${new Date(today.checkOut).toLocaleTimeString()}` : ''}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <button className="btn btn-success" onClick={() => geoCheckin('in')} disabled={geoLoading}>
                                    <CheckCircle size={15} /> {geoLoading ? '…' : 'Check In'}
                                </button>
                                <button className="btn btn-outline" onClick={() => geoCheckin('out')} disabled={geoLoading}>
                                    <CheckCircle size={15} /> {geoLoading ? '…' : 'Check Out'}
                                </button>
                            </div>
                        </div>

                        {/* Manual */}
                        <div className="card" style={{ marginBottom: 14 }}>
                            <div className="card-header"><ClipboardList size={16} /><span className="card-title">Manual Entry</span></div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input className="form-input" type="date" value={manualForm.date} onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={manualForm.availability} onChange={e => setManualForm(f => ({ ...f, availability: e.target.value }))}>
                                        <option>Present</option><option>Absent</option><option>Leave</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Shift</label>
                                    <select className="form-select" value={manualForm.shift} onChange={e => setManualForm(f => ({ ...f, shift: e.target.value }))}>
                                        <option>Morning</option><option>Evening</option><option>Night</option>
                                    </select>
                                </div>
                            </div>
                            <button className="btn btn-primary btn-full" onClick={markManual}>Mark Attendance</button>
                        </div>

                        {/* History */}
                        <div className="card">
                            <div className="card-header"><span className="card-title">Attendance History</span></div>
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>Date</th><th>Status</th><th>Shift</th><th>Hours</th></tr></thead>
                                    <tbody>
                                        {attendance.map(a => (
                                            <tr key={a._id}>
                                                <td>{new Date(a.date).toLocaleDateString()}</td>
                                                <td><span className={`badge ${a.availability === 'Present' ? 'badge-green' : 'badge-red'}`}>{a.availability}</span></td>
                                                <td>{a.shift}</td>
                                                <td>{a.totalHours || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav — mobile */}
            <div className="bottom-nav">
                {TABS.map(t => {
                    const Icon = t.icon
                    return <button key={t.key} className={`bottom-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><Icon size={22} />{t.label}</button>
                })}
            </div>

            <style>{`
                @media(min-width:768px){
                    #doc-tab-nav{ display:flex!important; gap:4px; }
                    .page > div:last-of-type{ padding-bottom:20px; }
                }
            `}</style>
        </div>
    )
}
