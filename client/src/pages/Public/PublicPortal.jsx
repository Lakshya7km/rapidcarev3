import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

import '../Home/Home.css' // Reuse the classic styling

export default function PublicPortal() {
    const navigate = useNavigate()
    const [hospitals, setHospitals] = useState([])
    const [filtered, setFiltered] = useState([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)
    const [bedSummary, setBedSummary] = useState({})
    const [docSummary, setDocSummary] = useState({})
    const [bloodStock, setBloodStock] = useState({})
    const [fetchedAt, setFetchedAt] = useState({}) // { hospitalId: Date }
    const [announcements, setAnnouncements] = useState({})
    const [userPos, setUserPos] = useState(null)
    const [loading, setLoading] = useState(true)

    const [showDonateForm, setShowDonateForm] = useState(false)
    const [donateForm, setDonateForm] = useState({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
    const [donateMsg, setDonateMsg] = useState('')

    useEffect(() => {
        api.get('/hospitals').then(r => { setHospitals(r.data); setFiltered(r.data) }).finally(() => setLoading(false))
    }, [])

    const requestLocation = () => {
        navigator.geolocation?.getCurrentPosition(pos => {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        })
    }

    useEffect(() => {
        let f = hospitals
        if (search) f = f.filter(h => h.name?.toLowerCase().includes(search.toLowerCase()) || h.address?.city?.toLowerCase().includes(search.toLowerCase()))

        // Sort by nearest if we have user location
        if (userPos) {
            f = [...f].sort((a, b) => {
                const dA = a.location ? Math.sqrt(Math.pow(a.location.lat - userPos.lat, 2) + Math.pow(a.location.lng - userPos.lng, 2)) : 999
                const dB = b.location ? Math.sqrt(Math.pow(b.location.lat - userPos.lat, 2) + Math.pow(b.location.lng - userPos.lng, 2)) : 999
                return dA - dB
            }).map(h => {
                const dA = h.location ? Math.sqrt(Math.pow(h.location.lat - userPos.lat, 2) + Math.pow(h.location.lng - userPos.lng, 2)) * 111 : null
                return { ...h, distance: dA }
            })
        }
        setFiltered(f)

        // Parallel fetch for beds and docs
        f.forEach(h => {
            if (!bedSummary[h.hospitalId]) {
                const now = new Date()
                api.get(`/beds/summary/${h.hospitalId}`).then(r => setBedSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
                api.get(`/doctors?hospitalId=${h.hospitalId}`).then(r => setDocSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
                api.get(`/bloodbank?hospitalId=${h.hospitalId}`).then(r => {
                    setBloodStock(prev => ({ ...prev, [h.hospitalId]: r.data }))
                    setFetchedAt(prev => ({ ...prev, [h.hospitalId]: now }))
                }).catch(() => { })
                api.get(`/announcements?hospitalId=${h.hospitalId}`).then(r => setAnnouncements(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
            }
        })
    }, [search, hospitals, userPos])

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

    const openDetail = async (h) => {
        setSelected(h)
        setDonateForm({ ...donateForm, hospitalId: h.hospitalId, city: h.address?.city || '' })
        document.getElementById('hospital-modal').style.display = 'flex'
    }

    const closeDetail = () => {
        setSelected(null)
        document.getElementById('hospital-modal').style.display = 'none'
    }

    const navigateToHospital = (loc, name) => {
        const dest = loc ? `${loc.lat},${loc.lng}` : encodeURIComponent(name)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank')
    }

    const nearest = (userPos && filtered.length > 0) ? filtered[0] : null

    const mapCenter = userPos ? [userPos.lat, userPos.lng] : [21.2514, 81.6296]

    return (
        <div className="home-page-classic">
            {/* Navbar */}
            <nav className="navbar classic-navbar" style={{ position: 'fixed', width: '100%' }}>
                <div className="container classic-nav-container">
                    <div className="classic-logo-wrapper" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="RapidCare" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6c757d', cursor: 'pointer' }} onClick={() => navigate('/')}>HOME</span>
                        <button className="btn btn-primary btn-sm rounded-pill px-4" onClick={() => document.getElementById('section-hospitals')?.scrollIntoView({ behavior: 'smooth' })}>
                            Find Care
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #0b6efd 0%, #004aad 100%)', padding: '7rem 1rem 8rem 1rem', color: 'white', textAlign: 'center', marginBottom: '-4rem' }}>
                <div className="container">
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>Instant Medical Precision</h1>
                    <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '3rem' }}>Find the nearest life-saving facility with real-time bed verification.</p>

                    <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 10 }}>
                        <div style={{ background: 'white', padding: 8, borderRadius: 50, display: 'flex', boxShadow: '0 15px 35px rgba(0,0,0,0.15)' }}>
                            <input
                                style={{ border: 'none', padding: '12px 24px', flex: 1, borderRadius: 50, fontSize: '1.1rem', outline: 'none' }}
                                placeholder="Search by hospital, city or medical service..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <button
                                className="btn btn-primary"
                                style={{ padding: '12px 30px', borderRadius: 50, fontWeight: 700, border: 'none' }}
                                onClick={() => document.getElementById('section-hospitals')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Find Hospital
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 20 }}>

                {/* Nearest Hospital Banner */}
                {nearest && userPos && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 20, padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ background: '#0b6efd', color: 'white', width: 60, height: 60, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏢</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0b6efd', textTransform: 'uppercase', marginBottom: 4 }}>Closest Emergency Center Identified</div>
                            <h3 style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>{nearest.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ background: '#0b6efd', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>{nearest.distance?.toFixed(1)} km</span>
                                <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 500 }}>📍 {nearest.address?.city}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-outline rounded-pill px-4 btn-sm" onClick={() => openDetail(nearest)}>Details</button>
                            <button className="btn btn-primary rounded-pill px-4 btn-sm" onClick={() => navigateToHospital(nearest.location, nearest.name)}>Navigate</button>
                        </div>
                    </div>
                )}

                {/* Location Request */}
                {!userPos && (
                    <div style={{ background: '#fff3cd', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>📍</div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 700 }}>Precision Geolocation</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Enable location to automatically sort by proximity.</p>
                            </div>
                        </div>
                        <button className="btn btn-warning rounded-pill px-4 font-bold" onClick={requestLocation}>Enable Now</button>
                    </div>
                )}

                {/* Map Section */}
                <div style={{ height: 400, borderRadius: 20, border: '1px solid #e3e6f0', overflow: 'hidden', marginBottom: '3rem', position: 'relative', zIndex: 10 }}>
                    <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {filtered.filter(h => h.location?.lat).map(h => (
                            <Marker key={h.hospitalId} position={[h.location.lat, h.location.lng]}>
                                <Popup>
                                    <strong>{h.name}</strong><br />
                                    <small>{h.address?.city}</small><br />
                                    <button onClick={() => openDetail(h)} style={{ background: '#0b6efd', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, width: '100%', marginTop: 8, cursor: 'pointer' }}>Details</button>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* Hospitals Grid */}
                <div id="section-hospitals" style={{ marginBottom: '4rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontWeight: 700 }}>Verified Medical Facilities</h2>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>Real-time status of trusted healthcare providers</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {loading ? <div className="text-center w-100 py-5">Syncing with medical database...</div> : filtered.map(h => {

                            const b = bedSummary[h.hospitalId]
                            const totalBeds = b ? Object.values(b).reduce((acc, curr) => acc + curr.total, 0) : 0
                            const vacantBeds = b ? Object.values(b).reduce((acc, curr) => acc + curr.vacant, 0) : 0

                            const d = docSummary[h.hospitalId] || []
                            const docs = d.filter(doc => doc.availability === 'Present').slice(0, 2)
                            const blood = bloodStock[h.hospitalId] || []
                            const availableBlood = blood.filter(bk => bk.units > 0)

                            const ft = fetchedAt[h.hospitalId]
                            const updatedAgo = ft ? (() => {
                                const m = Math.floor((Date.now() - new Date(ft)) / 60000)
                                if (m < 1) return 'just now'
                                if (m < 60) return `${m}m ago`
                                return `${Math.floor(m / 60)}h ago`
                            })() : null

                            return (
                                <div key={h.hospitalId} style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>{h.name}</h3>
                                                <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 500 }}>
                                                    📍 {h.address?.city} {h.distance && <span style={{ background: '#0b6efd', color: 'white', padding: '2px 8px', borderRadius: 20, marginLeft: 8 }}>{h.distance.toFixed(1)} km</span>}
                                                </div>
                                            </div>
                                            <div style={{ width: 45, height: 45, background: '#f8f9fa', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#0b6efd' }}>🏢</div>
                                        </div>

                                        <div style={{ background: vacantBeds > 0 ? '#e6fffa' : (b ? '#fef2f2' : '#fffbeb'), color: vacantBeds > 0 ? '#047857' : (b ? '#991b1b' : '#92400e'), padding: '0.5rem 1rem', borderRadius: 12, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
                                            {vacantBeds > 0 ? `🟢 ${vacantBeds} / ${totalBeds} Beds Available` : (b ? `🔴 All Beds Occupied (${totalBeds})` : 'Syncing Beds...')}
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#6c757d', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Core Expertise</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {(h.treatment || h.services || ['General Care']).slice(0, 3).map(s => (
                                                    <span key={s} style={{ background: 'rgba(11, 110, 253, 0.05)', color: '#0b6efd', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>{s}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ paddingTop: '1rem', borderTop: '1px solid #f8f9fa' }}>
                                            {/* Blood stock mini */}
                                            {availableBlood.length > 0 && (
                                                <div style={{ marginBottom: 8 }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', marginBottom: 4 }}>🩸 Blood Available</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {availableBlood.slice(0, 6).map(bk => (
                                                            <span key={bk.bloodType} style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                                                {bk.bloodType}: {bk.units}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Doctors */}
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', marginBottom: 4 }}>👨‍⚕️ Medical Staff</div>
                                            {d.length > 0 ? docs.length > 0 ? docs.map(doc => (
                                                <div key={doc._id} style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 2 }}>
                                                    👨‍⚕️ {doc.name} <span style={{ fontWeight: 400, color: '#6c757d', fontSize: '0.75rem' }}>{doc.specialty || doc.specialization || ''}</span>
                                                </div>
                                            )) : <small style={{ color: '#6c757d' }}>No doctors currently present</small> : <small style={{ color: '#6c757d' }}>Syncing staff...</small>}
                                            {/* Last updated */}
                                            {updatedAgo && (
                                                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 6 }}>⏱ Data fetched {updatedAgo}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <button className="btn btn-primary font-bold py-2 rounded-lg" style={{ fontSize: '0.75rem' }} onClick={() => navigateToHospital(h.location, h.name)}>🚀 Route</button>
                                        <button className="btn btn-outline font-bold py-2 rounded-lg" style={{ fontSize: '0.75rem' }} onClick={() => openDetail(h)}>ℹ️ Info</button>
                                        <button className="btn btn-dark font-bold py-2 rounded-lg" style={{ fontSize: '0.75rem', gridColumn: 'span 2' }} onClick={() => window.location.href = `tel:${h.contact}`}>📞 Call Facility</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>

            {/* Hospital Detail Modal */}
            <div id="hospital-modal" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={closeDetail}>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    {selected && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e3e6f0', paddingBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontWeight: 700 }}>{selected.name}</h3>
                                <button className="btn btn-ghost btn-sm" onClick={closeDetail}>✕</button>
                            </div>

                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong style={{ fontSize: '0.9rem' }}>📍 Full Address:</strong>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>{selected.address?.street}, {selected.address?.city}, {selected.address?.state}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <button className="btn btn-primary btn-sm rounded-pill" onClick={() => navigateToHospital(selected.location, selected.name)}>🚀 Directions</button>
                                    <button className="btn btn-danger btn-sm rounded-pill font-bold" onClick={() => setShowDonateForm(true)}>❤ Donate Blood</button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <strong style={{ fontSize: '0.9rem' }}>📞 Contact Information:</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>Phone: {selected.contact}</p>
                                </div>
                                <div>
                                    <strong style={{ fontSize: '0.9rem' }}>🛡️ Insurance Accepted:</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>{(selected.insurance || []).join(', ') || 'Not specified'}</p>
                                </div>
                            </div>

                            {selected.services && selected.services.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>🏥 Services:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                        {selected.services.map(s => <span key={s} style={{ background: '#e7f1ff', color: '#0b6efd', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem' }}>{s}</span>)}
                                    </div>
                                </div>
                            )}

                            {selected.facilities && selected.facilities.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>🔬 Facilities:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                        {selected.facilities.map(s => <span key={s} style={{ background: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem' }}>{s}</span>)}
                                    </div>
                                </div>
                            )}

                            {announcements[selected.hospitalId] && announcements[selected.hospitalId].length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>📢 Important Announcements:</strong>
                                    {announcements[selected.hospitalId].map(a => (
                                        <div key={a._id} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8, borderLeft: `4px solid ${a.priority === 'Urgent' ? '#ef4444' : a.priority === 'High' ? '#f59e0b' : '#3b82f6'}`, background: a.priority === 'Urgent' ? '#fef2f2' : a.priority === 'High' ? '#fffbeb' : '#eff6ff' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <strong style={{ fontSize: '0.9rem', color: a.priority === 'Urgent' ? '#991b1b' : a.priority === 'High' ? '#92400e' : '#1e40af' }}>{a.title}</strong>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#334155' }}>{a.content}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {bedSummary[selected.hospitalId] && (
                                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 8, marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <strong style={{ fontSize: '0.9rem', display: 'block' }}>🛏️ Bed Statistics:</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>
                                            {fetchedAt[selected.hospitalId] ? `Updated: ${new Date(fetchedAt[selected.hospitalId]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>

                                        {Object.entries(bedSummary[selected.hospitalId]).map(([type, stats]) => (
                                            <div key={type}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stats.vacant > 0 ? '#198754' : '#dc3545' }}>{stats.vacant} / {stats.total}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{type}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bloodStock[selected.hospitalId] && bloodStock[selected.hospitalId].length > 0 && (
                                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 8, marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <strong style={{ fontSize: '0.9rem', display: 'block' }}>🩸 Blood Availability:</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>
                                            {fetchedAt[selected.hospitalId] ? `Updated: ${new Date(fetchedAt[selected.hospitalId]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {bloodStock[selected.hospitalId].filter(b => b.units > 0).map(b => (
                                            <div key={b._id} style={{ background: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700 }}>
                                                {b.bloodType}: {b.units} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>u</span>
                                            </div>
                                        ))}
                                        {bloodStock[selected.hospitalId].filter(b => b.units > 0).length === 0 && (
                                            <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>No active blood stock available.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selected.gallery && selected.gallery.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>🖼️ Hospital Photos:</strong>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                        {selected.gallery.map((url, i) => (
                                            <img key={i} src={url} alt={`${selected.name} photo`}
                                                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, border: '1px solid #e3e6f0' }}
                                                onError={e => { e.target.style.display = 'none' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {docSummary[selected.hospitalId] && docSummary[selected.hospitalId].length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>👨‍⚕️ Medical Staff:</strong>
                                    {docSummary[selected.hospitalId].map(d => (
                                        <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f8f9fa' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', position: 'relative' }}>
                                                👨‍⚕️
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    {d.name}
                                                    <span style={{ background: d.availability === 'Available' ? '#dcfce7' : d.availability === 'Unavailable' ? '#fee2e2' : '#fef3c7', color: d.availability === 'Available' ? '#166534' : d.availability === 'Unavailable' ? '#991b1b' : '#92400e', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700 }}>
                                                        {d.availability === 'Available' ? 'Available' : d.availability === 'Unavailable' ? 'Absent' : 'On Leave'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                                    <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>{d.specialization || d.speciality || 'General'}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                                                        {d.updatedAt ? `Updated: ${new Date(d.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </>
                    )}
                </div>
            </div>

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
                                    <input required type="tel" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" placeholder="e.g. 9876543210" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '0.95rem' }} value={donateForm.contact} onChange={e => setDonateForm({ ...donateForm, contact: e.target.value })} />
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
