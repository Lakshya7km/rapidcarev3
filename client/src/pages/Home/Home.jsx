import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
// No longer using unused lucide-react imports
import './Home.css'

const FEATURES = [
    { icon: '🏢', title: 'Hospital Operations', desc: 'Streamlined bed management, staff oversight, and emergency coordination.' },
    { icon: '👨‍⚕️', title: 'Clinical Care', desc: 'Digital health records, attendance tracking, and duty assignments.' },
    { icon: '🚑', title: 'Emergency Transit', desc: 'Real-time ambulance tracking and pre-arrival patient data sync.' }
]

const ROLES = [
    { key: 'hospital', label: 'Reception', sub: 'Operations', icon: '🏢', color: '#0d6efd', userLabel: 'ID', userPlace: 'HOSP-001', passLabel: 'Password', passPlace: '••••••••', route: '/reception' },
    { key: 'doctor', label: 'Doctor', sub: 'Clinical Control', icon: '👨‍⚕️', color: '#198754', userLabel: 'ID', userPlace: 'DOC-100', passLabel: 'Password', passPlace: '••••••••', route: '/doctor' },
    { key: 'ambulance', label: 'Dispatcher', sub: 'Emergency Fleet', icon: '🚑', color: '#dc3545', userLabel: 'ID', userPlace: 'AMB-001', passLabel: 'Password', passPlace: '••••••••', route: '/ambulance' },
    { key: 'nurse', label: 'Nurse', sub: 'Ward Analytics', icon: '👩‍⚕️', color: '#0dcaf0', userLabel: 'ID', userPlace: 'NUR-100', passLabel: 'Password', passPlace: '••••••••', route: '/nurse' },
    { key: 'superadmin', label: 'Authority', sub: 'System Master', icon: '🛡️', color: '#212529', userLabel: 'ID', userPlace: 'admin', passLabel: 'Password', passPlace: '••••••••', route: '/admin' },
]


const BLOOD_COLORS = {
    'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6', 'B-': '#a855f7',
    'O+': '#0ea5e9', 'O-': '#06b6d4', 'AB+': '#22c55e', 'AB-': '#16a34a'
}
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']


export default function Home() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [active, setActive] = useState(null)
    const [form, setForm] = useState({ username: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [hospitals, setHospitals] = useState([])
    const [bloodStock, setBloodStock] = useState({})
    const [showDonateForm, setShowDonateForm] = useState(false)
    const [donateForm, setDonateForm] = useState({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
    const [donateMsg, setDonateMsg] = useState('')

    const load = async () => {
        try {
            const { data } = await api.get('/hospitals')
            setHospitals(data)

            const promises = data.map(h =>
                api.get(`/bloodbank?hospitalId=${h.hospitalId}`).then(r => ({ id: h.hospitalId, stock: r.data })).catch(() => null)
            )
            const results = await Promise.all(promises)
            const newStock = {}
            results.forEach(res => {
                if (res) newStock[res.id] = res.stock
            })
            setBloodStock(prev => ({ ...prev, ...newStock }))
        } catch (err) { }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load() }, [])

    const submitDonation = async (e) => {
        e.preventDefault()
        try {
            await api.post('/bloodbank/donors', donateForm)
            setDonateMsg('Donation request submitted successfully! The hospital will contact you shortly.')
            setTimeout(() => { setShowDonateForm(false); setDonateMsg('') }, 3000)
            setDonateForm({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
        } catch (err) {
            setDonateMsg('Failed to submit request. Please try again.')
        }
    }

    const openRole = (role) => {
        setActive(role)
        setError('')
        setForm({ username: '', password: '' })
        // Scroll to section manually to replicate HTML feel
        setTimeout(() => {
            document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const r = await api.post('/auth/login', { role: active.key, username: form.username.trim(), password: form.password })
            login(r.data.token, r.data.user)
            navigate(active.route)
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed')
        } finally {
            setLoading(false)
        }
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

            {/* Global Blood Stock Section */}
            <div className="container" id="section-blood" style={{ marginTop: '4rem' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: 20, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.5rem' }}>🩸</span> Global Blood Availability
                            </h2>
                            <p className="text-muted" style={{ fontSize: '0.9rem', margin: '4px 0 0 0' }}>Real-time blood stock across all registered facilities</p>
                        </div>
                        <button className="btn font-bold rounded-pill" style={{ background: '#dc2626', color: 'white', padding: '8px 24px', whiteSpace: 'nowrap' }} onClick={() => setShowDonateForm(true)}>
                            ❤ Donate Blood
                        </button>
                    </div>



                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {hospitals.map(h => {
                            const stock = bloodStock[h.hospitalId] || []
                            if (stock.length === 0) return null // Hide hospitals with empty blood bank

                            return (
                                <div key={`blood-${h.hospitalId}`} style={{ border: '1px solid #fecaca', borderRadius: 12, padding: '1rem', background: '#fff1f2' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 8, color: '#991b1b', fontSize: '0.95rem' }}>{h.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginBottom: 12 }}>📍 {h.address?.city}</div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {stock.filter(b => b.units > 0).map(b => (
                                            <div key={b._id} style={{ background: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                                                {b.bloodType}: {b.units} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>u</span>
                                            </div>
                                        ))}
                                    </div>
                                    {stock.filter(b => b.units > 0).length === 0 && (
                                        <div style={{ fontSize: '0.85rem', color: '#dc2626', fontStyle: 'italic' }}>Out of stock</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
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

            {/* Donate Blood Modal */}
            {showDonateForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDonateForm(false)}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: 16, width: '90%', maxWidth: 450, position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setShowDonateForm(false)}>✕</button>

                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🩸</div>
                            <h3 style={{ margin: 0, fontWeight: 700, color: '#dc2626' }}>Blood Donation Request</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d', marginTop: 4 }}>Your single donation can save up to 3 lives.</p>
                        </div>

                        {donateMsg && <div style={{ background: donateMsg.includes('success') ? '#dcfce7' : '#fee2e2', color: donateMsg.includes('success') ? '#166534' : '#991b1b', padding: '12px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>{donateMsg}</div>}

                        <form onSubmit={submitDonation}>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Select Hospital Center *</label>
                                <select required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '0.95rem' }} value={donateForm.hospitalId} onChange={e => setDonateForm({ ...donateForm, hospitalId: e.target.value })}>
                                    <option value="" disabled>Select nearest hospital</option>
                                    {hospitals.map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name} ({h.address?.city})</option>)}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Full Name *</label>
                                <input required type="text" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '0.95rem' }} value={donateForm.name} onChange={e => setDonateForm({ ...donateForm, name: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Blood Group *</label>
                                    <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '0.95rem' }} value={donateForm.bloodType} onChange={e => setDonateForm({ ...donateForm, bloodType: e.target.value })}>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Contact Number *</label>
                                    <input required type="tel" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '0.95rem' }} value={donateForm.contact} onChange={e => setDonateForm({ ...donateForm, contact: e.target.value })} placeholder="e.g. 9876543210" />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>City *</label>
                                <input required type="text" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '0.95rem' }} value={donateForm.city} onChange={e => setDonateForm({ ...donateForm, city: e.target.value })} />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: '#dc2626', border: 'none', padding: '12px', fontSize: '1rem', fontWeight: 700, borderRadius: 8 }}>
                                Submit Details
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
