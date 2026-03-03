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
    const [userPos, setUserPos] = useState(null)
    const [loading, setLoading] = useState(true)

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
                api.get(`/beds/summary/${h.hospitalId}`).then(r => setBedSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
                api.get(`/doctors?hospitalId=${h.hospitalId}`).then(r => setDocSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
            }
        })
    }, [search, hospitals, userPos])

    const openDetail = async (h) => {
        setSelected(h)
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
                                            {d.length > 0 ? docs.length > 0 ? docs.map(doc => (
                                                <div key={doc._id} style={{ fontSize: '0.85rem', fontWeight: 700 }}>👨‍⚕️ {doc.name}</div>
                                            )) : <small className="text-muted">No doctors currently present</small> : <small className="text-muted">Syncing staff...</small>}
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
                                <button className="btn btn-primary btn-sm rounded-pill" onClick={() => navigateToHospital(selected.location, selected.name)}>🚀 Directions</button>
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

                            {bedSummary[selected.hospitalId] && (
                                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 8, marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 12 }}>🛏️ Bed Statistics:</strong>
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

                            {docSummary[selected.hospitalId] && docSummary[selected.hospitalId].length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>👨‍⚕️ Medical Staff:</strong>
                                    {docSummary[selected.hospitalId].map(d => (
                                        <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f8f9fa' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👨‍⚕️</div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.name}</div>
                                                <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>{d.speciality}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </>
                    )}
                </div>
            </div>

        </div>
    )
}
