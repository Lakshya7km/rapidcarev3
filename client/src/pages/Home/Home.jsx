import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { Stethoscope, Truck, ShieldCheck, AlertCircle, X, ChevronRight, Phone, Building2, UserRound, Search, MapPin } from 'lucide-react'
import './Home.css'

const FEATURES = [
    { icon: '🏢', title: 'Hospital Operations', desc: 'Streamlined bed management, staff oversight, and emergency coordination.' },
    { icon: '👨‍⚕️', title: 'Clinical Care', desc: 'Digital health records, attendance tracking, and duty assignments.' },
    { icon: '🚑', title: 'Emergency Transit', desc: 'Real-time ambulance tracking and pre-arrival patient data sync.' }
]

const ROLES = [
    { key: 'hospital', label: 'Reception', sub: 'Operations', icon: '🏢', color: '#0d6efd', userLabel: 'Node ID', userPlace: 'HOSP-001', passLabel: 'Security Code', passPlace: '••••••••', route: '/reception' },
    { key: 'doctor', label: 'Doctor', sub: 'Clinical Control', icon: '👨‍⚕️', color: '#198754', userLabel: 'Staff ID', userPlace: 'DOC-100', passLabel: 'Passphrase', passPlace: '••••••••', route: '/doctor' },
    { key: 'ambulance', label: 'Dispatcher', sub: 'Emergency Fleet', icon: '🚑', color: '#dc3545', userLabel: 'Fleet Unit ID', userPlace: 'AMB-001', passLabel: 'Dispatch Code', passPlace: '••••••••', route: '/ambulance' },
    { key: 'nurse', label: 'Nurse', sub: 'Ward Analytics', icon: '👩‍⚕️', color: '#0dcaf0', userLabel: 'Staff ID', userPlace: 'NUR-100', passLabel: 'Security Code', passPlace: '••••••••', route: '/nurse' },
    { key: 'superadmin', label: 'Authority', sub: 'System Master', icon: '🛡️', color: '#212529', userLabel: 'Admin User', userPlace: 'Administrator', passLabel: 'Authority Key', passPlace: '••••••••', route: '/admin' },
]

export default function Home() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [active, setActive] = useState(null)
    const [form, setForm] = useState({ username: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const openRole = (role) => {
        setActive(role)
        setError('')
        // autofill demo creds
        const creds = {
            hospital: { username: 'AIIMS-RPR', password: 'test@1234' },
            doctor: { username: 'DOC-AIIMS-01', password: 'test@1234' },
            nurse: { username: 'NURSE-AIIMS-01', password: 'test@1234' },
            ambulance: { username: 'AMB-AIIMS-01', password: 'test@1234' },
            superadmin: { username: 'admin', password: 'test@1234' },
        }
        setForm(creds[role.key])
        // Scroll to section manually to replicate HTML feel
        setTimeout(() => {
            document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const { data } = await api.post('/auth/login', { role: active.key, username: form.username.trim(), password: form.password })
            const userObj = { role: active.key, ...(data.doctor || data.nurse || data.admin || {}), username: form.username.trim(), hospitalId: data.hospitalId || data.doctor?.hospitalId || data.nurse?.hospitalId }
            if (data.ambulance) Object.assign(userObj, data.ambulance)
            login(data.token, userObj)
            navigate(active.route)
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="home-page-classic">
            {/* Navbar */}
            <nav className="navbar classic-navbar">
                <div className="container classic-nav-container">
                    <div className="classic-logo-wrapper">
                        <img src="/logo.png" alt="RapidCare" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div>
                        <button className="btn btn-danger btn-sm rounded-pill" onClick={() => navigate('/public')}>
                            <span style={{ marginRight: '5px' }}>🚨</span> Emergency
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="classic-hero">
                <div className="container text-center">
                    <h1 className="classic-hero-title">Advanced Emergency Response</h1>
                    <p className="classic-hero-sub">Real-time hospital management, bed tracking, and emergency coordination system.</p>
                    <div className="classic-hero-actions">
                        <button className="btn btn-success rounded-pill px-4 py-2" style={{ fontSize: '1.1rem' }} onClick={() => navigate('/public')}>
                            Find Hospitals &amp; Beds
                        </button>
                        <button className="btn btn-outline rounded-pill px-4 py-2" style={{ color: 'white', borderColor: 'white', fontSize: '1.1rem' }} onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
                            Staff Login
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
                <div className="classic-feature-grid">
                    {FEATURES.map((feat, idx) => (
                        <div key={idx} className="classic-card text-center classic-feature-card">
                            <div className="classic-feature-icon">{feat.icon}</div>
                            <h3 className="font-bold" style={{ marginBottom: '8px' }}>{feat.title}</h3>
                            <p className="text-muted" style={{ fontSize: '0.95rem' }}>{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Portals Access Section */}
            <div className="container" id="login-section" style={{ marginTop: '5rem', paddingTop: '3rem' }}>
                <div className="text-center" style={{ marginBottom: '3rem' }}>
                    <h2 className="font-bold mb-2">Internal Staff Access</h2>
                    <p className="text-muted">Direct terminals for medical and administrative operations</p>
                </div>

                <div className="classic-role-grid">
                    {ROLES.map(role => (
                        <div key={role.key} className="classic-card classic-role-card" style={{ borderTop: `5px solid ${role.color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="classic-stat-icon" style={{ background: role.color + '15', color: role.color }}>
                                    {role.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold" style={{ margin: 0 }}>{role.label}</h4>
                                    <p className="text-muted font-bold uppercase" style={{ fontSize: '0.75rem', margin: 0 }}>{role.sub}</p>
                                </div>
                            </div>

                            {active?.key === role.key ? (
                                <div className="classic-login-form">
                                    {error && <div className="classic-alert classic-alert-danger">{error}</div>}
                                    <form onSubmit={handleLogin}>
                                        <div className="classic-form-group">
                                            <label className="text-xs font-bold uppercase text-muted">{role.userLabel}</label>
                                            <input className="classic-form-control" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder={role.userPlace} required />
                                        </div>
                                        <div className="classic-form-group">
                                            <label className="text-xs font-bold uppercase text-muted">{role.passLabel}</label>
                                            <input className="classic-form-control" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={role.passPlace} required />
                                        </div>
                                        <button className="btn w-100 py-2 font-bold classic-btn-block" type="submit" disabled={loading} style={{ background: role.color, color: 'white', border: 'none' }}>
                                            {loading ? 'Joining...' : 'Join Terminal'}
                                        </button>
                                        <button type="button" className="btn btn-ghost w-100 mt-2" style={{ fontSize: '0.8rem' }} onClick={() => setActive(null)}>Cancel</button>
                                    </form>
                                </div>
                            ) : (
                                <div style={{ marginTop: 'auto' }}>
                                    <button className="btn w-100 py-2 font-bold classic-btn-block" style={{ background: role.color + '15', color: role.color, border: 'none' }} onClick={() => openRole(role)}>
                                        Access Terminal
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <footer className="text-center" style={{ marginTop: '4rem', padding: '2rem', background: '#fff', borderTop: '1px solid #e3e6f0' }}>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>© 2026 RapidCare. All rights reserved.</p>
            </footer>
        </div>
    )
}
