import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { LayoutDashboard, Building2, Database, LogOut, Plus, X, Trash2, RefreshCw } from 'lucide-react'

const TABS = [
    { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { key: 'register', label: 'Register', icon: Building2 },
    { key: 'master', label: 'Master DB', icon: Database },
]

const COLS = ['hospitals', 'doctors', 'nurses', 'ambulances', 'emergencies']

export default function AdminPortal() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('dashboard')
    const [stats, setStats] = useState(null)
    const [dbCol, setDbCol] = useState('hospitals')
    const [dbData, setDbData] = useState([])
    const [dbLoading, setDbLoading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')
    const [regForm, setRegForm] = useState({ hospitalId: '', name: '', contact: '', password: '', address: { street: '', city: '', district: '', state: '' }, googleMapUrl: '' })

    useEffect(() => {
        api.get('/admin/stats').then(r => setStats(r.data)).finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (tab !== 'master') return
        setDbLoading(true)
        api.get(`/admin/master/${dbCol}`).then(r => setDbData(r.data)).finally(() => setDbLoading(false))
    }, [tab, dbCol])

    const register = async () => {
        try {
            const payload = { ...regForm }
            if (payload.googleMapUrl) {
                const m = payload.googleMapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
                if (m) payload.location = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
            }
            await api.post('/admin/register-hospital', payload)
            setMsg('Hospital registered!'); setTab('dashboard')
            api.get('/admin/stats').then(r => setStats(r.data))
        } catch (err) { alert(err.response?.data?.message || 'Registration failed') }
    }

    const deleteRecord = async (id) => {
        try {
            await api.delete(`/admin/master/${dbCol}/${id}`)
            setDbData(d => d.filter(x => x._id !== id))
        } catch (err) { alert(err.response?.data?.message || 'Failed to delete record') }
    }

    const refreshDb = () => {
        setDbLoading(true)
        api.get(`/admin/master/${dbCol}`).then(r => setDbData(r.data)).finally(() => setDbLoading(false))
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div className="page">
            <div className="topbar">
                <div className="topbar-logo">🛡️ <span>Admin Portal</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <nav id="admin-tab-nav" style={{ display: 'none' }}>
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

            <div style={{ padding: '16px', paddingBottom: 80, maxWidth: 1000, margin: '0 auto' }}>
                {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}

                {/* System Overview */}
                {tab === 'dashboard' && stats && (
                    <div>
                        <div style={{ padding: '8px 0 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>System Cluster</div>
                            <div style={{ color: 'var(--text2)', fontSize: 13 }}>National network overview</div>
                        </div>
                        <div className="stat-grid">
                            {[
                                { label: 'Hospitals', val: stats.hospitals, color: '#0ea5e9' },
                                { label: 'Doctors', val: stats.doctors, color: '#22c55e' },
                                { label: 'Ambulances', val: stats.ambulances, color: '#f59e0b' },
                                { label: 'Nurses', val: stats.nurses, color: '#8b5cf6' },
                                { label: 'Active Emergencies', val: stats.activeEmergencies, color: '#ef4444' },
                            ].map(s => (
                                <div key={s.label} className="stat-card" style={{ '--accent': s.color }}>
                                    <div className="stat-val">{s.val}</div>
                                    <div className="stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Register Hospital */}
                {tab === 'register' && (
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Register New Node</div>
                        {/* Two columns on tablet+ */}
                        <div id="admin-reg-grid">
                            {[{ k: 'hospitalId', l: 'Hospital ID' }, { k: 'name', l: 'Hospital Name' }, { k: 'contact', l: 'Contact' }, { k: 'password', l: 'Password' }, { k: 'googleMapUrl', l: 'Google Maps URL (for lat/lng)' }].map(f => (
                                <div className="form-group" key={f.k}>
                                    <label className="form-label">{f.l}</label>
                                    <input className="form-input" value={regForm[f.k] || ''} onChange={e => setRegForm(p => ({ ...p, [f.k]: e.target.value }))} />
                                </div>
                            ))}
                            <div style={{ fontWeight: 600, margin: '8px 0 4px' }}>Address</div>
                            {['street', 'city', 'district', 'state'].map(k => (
                                <div className="form-group" key={k}>
                                    <label className="form-label">{k.charAt(0).toUpperCase() + k.slice(1)}</label>
                                    <input className="form-input" value={regForm.address?.[k] || ''} onChange={e => setRegForm(p => ({ ...p, address: { ...p.address, [k]: e.target.value } }))} />
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary btn-full" onClick={register}><Plus size={16} /> Register Hospital</button>
                    </div>
                )}

                {/* Master DBMS */}
                {tab === 'master' && (
                    <div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {COLS.map(c => (
                                <button key={c} className={`btn btn-sm ${dbCol === c ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDbCol(c)}>
                                    {c}
                                </button>
                            ))}
                            <button className="btn btn-ghost btn-sm" onClick={refreshDb}><RefreshCw size={13} /></button>
                        </div>
                        {dbLoading
                            ? <div className="loader-center"><div className="spinner" /></div>
                            : (
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{dbData.length} records</div>
                                    {dbData.map(row => (
                                        <div key={row._id} className="card" style={{ marginBottom: 8, padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                <div style={{ flex: 1, fontSize: 12, wordBreak: 'break-all' }}>
                                                    {Object.entries(row).filter(([k]) => !['__v', 'password'].includes(k)).slice(0, 5).map(([k, v]) => (
                                                        <div key={k}><strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                                                    ))}
                                                </div>
                                                <button className="btn btn-ghost btn-icon" onClick={() => deleteRecord(row._id)}><Trash2 size={14} color="#ef4444" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {dbData.length === 0 && <div className="empty"><p>No records</p></div>}
                                </div>
                            )
                        }
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
                    #admin-tab-nav{display:flex!important;gap:4px;}
                    #admin-reg-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;}
                    #admin-reg-grid > .form-group{}
                    .page > div:nth-child(2){padding-bottom:20px;}
                }
            `}</style>
        </div>
    )
}
