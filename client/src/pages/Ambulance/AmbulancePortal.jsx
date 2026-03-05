import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import socket from '../../lib/socket'
import { LayoutDashboard, PlusCircle, Radio, Truck, LogOut, Phone } from 'lucide-react'

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'request', label: 'New Request', icon: PlusCircle },
    { key: 'status', label: 'Live Status', icon: Radio },
    { key: 'profile', label: 'Profile', icon: Truck },
]

const STATUS_OPTIONS = ['On Duty', 'In Transit', 'Offline']
const STATUS_COLOR = { 'On Duty': '#22c55e', 'In Transit': '#f59e0b', Offline: '#94a3b8' }

export default function AmbulancePortal() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('dashboard')
    const [ambulance, setAmbulance] = useState(null)
    const [emergencies, setEmergencies] = useState([])
    const [hospitals, setHospitals] = useState([])
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')
    const [heartbeatInterval, setHeartbeatInterval] = useState(null)
    const locationWatch = useRef(null)

    const ambulanceId = user?.ambulanceId || user?.ref
    const ownHospitalId = user?.hospitalId || ''

    const [reqForm, setReqForm] = useState({
        patientName: '', age: '', gender: 'Male', emergencyType: 'General',
        condition: 'Stable', equipment: '', symptoms: '', reason: '', ambulanceNotes: '',
        hospitalId: ownHospitalId
    })

    useEffect(() => {
        Promise.all([
            api.get(`/ambulances/${ambulanceId}`),
            api.get(`/emergency?ambulanceId=${ambulanceId}`),
            api.get('/hospitals')
        ]).then(([a, e, h]) => {
            setAmbulance(a.data)
            setEmergencies(e.data)
            setHospitals(h.data)
            // Default target hospital to ambulance's own hospital
            setReqForm(f => ({ ...f, hospitalId: a.data?.hospitalId || ownHospitalId }))
        })
            .finally(() => setLoading(false))

        socket.connect()
        socket.emit('join:ambulance', ambulanceId)

        // GPS heartbeat
        const hb = setInterval(() => {
            navigator.geolocation?.getCurrentPosition(pos => {
                socket.emit('ambulance:location', {
                    ambulanceId, hospitalId: user?.hospitalId,
                    lat: pos.coords.latitude, lng: pos.coords.longitude
                })
            })
        }, 30000)
        setHeartbeatInterval(hb)

        // Real-time emergency updates
        socket.on('emergency:update', (er) => {
            setEmergencies(prev => prev.map(e => e._id === er._id ? er : e))
        })
        // Real-time task/ambulance updates
        socket.on('ambulance:update', (data) => {
            if (data.ambulanceId === ambulanceId) setAmbulance(data)
        })

        // Offline on close
        const offline = () => { api.put(`/ambulances/${ambulanceId}`, { status: 'Offline' }).catch(() => { }) }
        window.addEventListener('beforeunload', offline)
        return () => {
            clearInterval(hb); socket.disconnect()
            window.removeEventListener('beforeunload', offline)
        }
    }, [ambulanceId])

    const setStatus = async (status) => {
        socket.emit('ambulance:status', { ambulanceId, hospitalId: user?.hospitalId, status })
        const r = await api.put(`/ambulances/${ambulanceId}`, { status })
        setAmbulance(r.data); setMsg(`Status: ${status}`)
    }

    const submitRequest = async () => {
        try {
            const r = await api.post('/emergency', { ...reqForm, ambulanceId, source: 'Ambulance' })
            socket.emit('join:hospital', reqForm.hospitalId)
            setEmergencies(prev => [r.data, ...prev])
            setMsg('Emergency request sent to ' + reqForm.hospitalId + '!')
            setTab('status')
            setReqForm({ patientName: '', age: '', gender: 'Male', emergencyType: 'General', condition: 'Stable', equipment: '', symptoms: '', reason: '', ambulanceNotes: '', hospitalId: ambulance?.hospitalId || ownHospitalId })
        } catch (err) { alert(err.response?.data?.message || 'Failed to submit request') }
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    const hospital = hospitals.find(h => h.hospitalId === ambulance?.hospitalId)

    return (
        <div className="page">
            <div className="topbar">
                <div className="topbar-logo">
                    🚑 <span>Ambulance</span>
                    <span className="badge" style={{ background: (STATUS_COLOR[ambulance?.status] || '#94a3b8') + '20', color: STATUS_COLOR[ambulance?.status] || '#94a3b8', marginLeft: 8, fontSize: 11 }}>{ambulance?.status || 'Offline'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <nav id="amb-tab-nav" style={{ display: 'none' }}>
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
                    <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/') }}><LogOut size={18} /></button>
                </div>
            </div>

            <div style={{ padding: '16px', paddingBottom: 80, maxWidth: 900, margin: '0 auto' }}>
                {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}
                {ambulance?.assignedTask && (
                    <div className="task-banner" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: 4 }}>📋 New Task Assigned</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{ambulance.assignedTask}</div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                            const r = await api.put(`/ambulances/${ambulanceId}`, { assignedTask: '' })
                            setAmbulance(r.data); setMsg('Task marked as completed!')
                        }}>Mark Done</button>
                    </div>
                )}

                {/* Dashboard */}
                {tab === 'dashboard' && (
                    <div>
                        <div className="stat-grid">
                            {[
                                { label: 'Base Hospital', val: ambulance?.hospitalId, color: '#0ea5e9' },
                                { label: 'Status', val: ambulance?.status || 'Offline', color: STATUS_COLOR[ambulance?.status] || '#94a3b8' },
                                { label: 'Vehicle', val: ambulance?.vehicleNumber, color: '#8b5cf6' },
                                { label: 'Emergencies', val: emergencies.length, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} className="stat-card" style={{ '--accent': s.color }}>
                                    <div className="stat-val" style={{ fontSize: 14, lineHeight: 1.4 }}>{s.val || '-'}</div>
                                    <div className="stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="card" style={{ marginBottom: 14 }}>
                            <div className="card-header"><span className="card-title">Status Control</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                {STATUS_OPTIONS.map(s => (
                                    <button key={s} className="btn" onClick={() => setStatus(s)}
                                        style={{ background: ambulance?.status === s ? STATUS_COLOR[s] : STATUS_COLOR[s] + '20', color: ambulance?.status === s ? 'white' : STATUS_COLOR[s], border: `2px solid ${STATUS_COLOR[s]}`, fontWeight: 700, borderRadius: 10, fontSize: 12 }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header"><span className="card-title">Crew</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>EMT</div>
                                    <div style={{ fontWeight: 600 }}>{ambulance?.emt?.name || '-'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{ambulance?.emt?.mobile}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>PILOT</div>
                                    <div style={{ fontWeight: 600 }}>{ambulance?.pilot?.name || '-'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{ambulance?.pilot?.mobile}</div>
                                </div>
                            </div>
                        </div>

                        {hospital && (
                            <div className="card" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>🏥 {hospital.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{hospital.contact}</div>
                                </div>
                                <a href={`tel:${hospital.contact}`} className="btn btn-success btn-sm"><Phone size={14} /> Call</a>
                            </div>
                        )}
                    </div>
                )}

                {/* New Request */}
                {tab === 'request' && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Target Hospital</label>
                            <select className="form-select" value={reqForm.hospitalId} onChange={e => setReqForm(f => ({ ...f, hospitalId: e.target.value }))}>
                                <option value="">Select hospital…</option>
                                {hospitals.map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name} ({h.hospitalId}){h.hospitalId === ownHospitalId ? ' ★ Own' : ''}</option>)}
                            </select>
                            {reqForm.hospitalId === ownHospitalId && <div className="form-hint" style={{ color: '#22c55e' }}>✓ Own base hospital pre-selected</div>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Patient Name</label>
                            <input className="form-input" value={reqForm.patientName} onChange={e => setReqForm(f => ({ ...f, patientName: e.target.value }))} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div className="form-group">
                                <label className="form-label">Age</label>
                                <input className="form-input" type="number" value={reqForm.age} onChange={e => setReqForm(f => ({ ...f, age: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="form-select" value={reqForm.gender} onChange={e => setReqForm(f => ({ ...f, gender: e.target.value }))}>
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Patient Condition</label>
                            <select className="form-select" value={reqForm.condition} onChange={e => setReqForm(f => ({ ...f, condition: e.target.value }))}>
                                <option>Critical</option>
                                <option>Serious</option>
                                <option>Stable</option>
                                <option>Minor</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Emergency Type</label>
                            <select className="form-select" value={reqForm.emergencyType} onChange={e => setReqForm(f => ({ ...f, emergencyType: e.target.value }))}>
                                {['General', 'ICU', 'Cardiac', 'Trauma', 'Burns', 'Neuro', 'Maternity', 'Paediatric', 'Ortho'].map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Symptoms</label>
                            <textarea className="form-textarea" value={reqForm.symptoms} onChange={e => setReqForm(f => ({ ...f, symptoms: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ambulance Notes (visible to reception)</label>
                            <textarea className="form-textarea" placeholder="Describe what equipment is being used, patient response, ETA…" value={reqForm.ambulanceNotes} onChange={e => setReqForm(f => ({ ...f, ambulanceNotes: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Equipment Needed at Hospital</label>
                            <input className="form-input" placeholder="e.g. Oxygen, Ventilator, Wheelchair" value={reqForm.equipment} onChange={e => setReqForm(f => ({ ...f, equipment: e.target.value }))} />
                        </div>
                        <button className="btn btn-danger btn-full" style={{ fontSize: 16, padding: 14 }} onClick={submitRequest}>🚨 Send Emergency Alert</button>
                    </div>
                )}

                {/* Live Status */}
                {tab === 'status' && (
                    <div>
                        {emergencies.length === 0 && <div className="empty"><Radio size={40} /><p>No emergency requests</p></div>}
                        {emergencies.map(e => (
                            <div key={e._id} className="card" style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontWeight: 700 }}>{e.patientName}</span>
                                    <span className={`badge ${e.status === 'Accepted' ? 'badge-green' : e.status === 'Pending' ? 'badge-yellow' : e.status === 'Denied' ? 'badge-red' : 'badge-blue'}`}>{e.status}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{e.emergencyType} · {e.hospitalId}</div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{new Date(e.createdAt).toLocaleString()}</div>
                                {e.status === 'Accepted' && hospitals.find(h => h.hospitalId === e.hospitalId) && (
                                    <a href={`tel:${hospitals.find(h => h.hospitalId === e.hospitalId).contact}`} className="btn btn-success btn-sm" style={{ marginTop: 8, width: '100%' }}>
                                        <Phone size={13} /> Call Hospital
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Profile */}
                {tab === 'profile' && ambulance && (
                    <div>
                        <div className="card" style={{ marginBottom: 14 }}>
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <div style={{ fontSize: 48 }}>🚑</div>
                                <div style={{ fontWeight: 800, fontSize: 18 }}>{ambulance.ambulanceId}</div>
                                <div style={{ color: 'var(--text2)' }}>{ambulance.vehicleNumber}</div>
                                <span className="badge badge-blue" style={{ marginTop: 8 }}>{ambulance.hospitalId}</span>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><span className="card-title">Crew Details</span></div>
                            {[{ label: 'EMT', data: ambulance.emt }, { label: 'Pilot', data: ambulance.pilot }].map(({ label, data }) => (
                                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700 }}>{data?.name?.[0]}</div>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>{label}</div>
                                        <div style={{ fontWeight: 600 }}>{data?.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{data?.mobile}</div>
                                    </div>
                                    <a href={`tel:${data?.mobile}`} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}><Phone size={14} /></a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="bottom-nav">
                {TABS.map(t => {
                    const Icon = t.icon
                    return <button key={t.key} className={`bottom-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><Icon size={22} />{t.label}</button>
                })}
            </div>

            <style>{`
                @media(min-width:768px){
                    #amb-tab-nav{display:flex!important;gap:4px;}
                    .page > div:nth-child(2){padding-bottom:20px;}
                }
                .task-banner { animation: pulseBg 2s infinite; }
                @keyframes pulseBg {
                    0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
                    100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
                }
            `}</style>
        </div>
    )
}
