import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import socket from '../../../lib/socket'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { Plus, X, MapPin } from 'lucide-react'
import L from 'leaflet'

const ambulanceIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2961/2961948.png',
    iconSize: [36, 36], iconAnchor: [18, 36]
})

const STATUS_COLOR = { 'On Duty': '#22c55e', 'Offline': '#94a3b8', 'In Transit': '#f59e0b', 'Arrived': '#0ea5e9', 'En Route': '#f97316' }

export default function AmbulancesSection({ hospitalId }) {
    const [ambulances, setAmbulances] = useState([])
    const [locations, setLocations] = useState({})
    const [adding, setAdding] = useState(false)
    const [loading, setLoading] = useState(true)
    const [hospital, setHospital] = useState(null)
    const [emergencies, setEmergencies] = useState([])
    const [selected, setSelected] = useState(null) // selected ambulance for detail
    const [form, setForm] = useState({ ambulanceId: '', vehicleNumber: '', emt: { name: '', emtId: '', mobile: '' }, pilot: { name: '', pilotId: '', mobile: '' } })

    const load = () => {
        api.get(`/ambulances?hospitalId=${hospitalId}`).then(r => setAmbulances(r.data)).finally(() => setLoading(false))
        api.get(`/emergency?hospitalId=${hospitalId}&status=Pending,Accepted,En Route,Arrived`).then(r => setEmergencies(r.data)).catch(() => { })
    }

    useEffect(() => {
        load()
        api.get(`/hospitals/${hospitalId}`).then(r => setHospital(r.data))
    }, [hospitalId])

    useEffect(() => {
        socket.on('ambulance:location', ({ ambulanceId, lat, lng }) => {
            setLocations(l => ({ ...l, [ambulanceId]: { lat, lng, ts: Date.now() } }))
        })
        socket.on('ambulance:status', ({ ambulanceId, status }) => {
            setAmbulances(a => a.map(x => x.ambulanceId === ambulanceId ? { ...x, status } : x))
        })
        socket.on('emergency:new', () => load())
        socket.on('emergency:update', () => load())
        return () => {
            socket.off('ambulance:location')
            socket.off('ambulance:status')
            socket.off('emergency:new')
            socket.off('emergency:update')
        }
    }, [])

    const create = async () => {
        await api.post('/ambulances', { ...form, hospitalId })
        setAdding(false); load()
        setForm({ ambulanceId: '', vehicleNumber: '', emt: { name: '', emtId: '', mobile: '' }, pilot: { name: '', pilotId: '', mobile: '' } })
    }

    const getAmbulanceEmergency = (ambulanceId) => emergencies.find(e => e.ambulanceId === ambulanceId)

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    const mapCenter = hospital?.location ? [hospital.location.lat, hospital.location.lng] : [21.25, 81.63]

    return (
        <div>
            {/* Live Map */}
            <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {hospital?.location && (
                        <Circle center={[hospital.location.lat, hospital.location.lng]} radius={500} color="#0ea5e9" fillColor="#0ea5e9" fillOpacity={0.1} />
                    )}
                    {ambulances.map(a => {
                        const loc = locations[a.ambulanceId] || a.location
                        if (!loc?.lat) return null
                        const sec = locations[a.ambulanceId] ? Math.floor((Date.now() - (locations[a.ambulanceId].ts || 0)) / 1000) : null
                        const emergency = getAmbulanceEmergency(a.ambulanceId)
                        return (
                            <Marker key={a.ambulanceId} position={[loc.lat, loc.lng]}>
                                <Popup>
                                    <strong>{a.ambulanceId}</strong><br />
                                    {a.vehicleNumber}<br />
                                    <span style={{ color: STATUS_COLOR[a.status] || '#94a3b8' }}>● {a.status || 'Offline'}</span>
                                    {emergency && <><br /><small>Case: {emergency.patientName} ({emergency.status})</small></>}
                                    {sec !== null && <><br /><small>GPS updated {sec}s ago</small></>}
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                    Fleet ({ambulances.length}) · Active: {ambulances.filter(a => a.status === 'On Duty' || a.status === 'In Transit' || a.status === 'En Route').length}
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Register Ambulance</button>
            </div>

            {/* Ambulance Cards with Emergency Feed */}
            {ambulances.map(a => {
                const loc = locations[a.ambulanceId] || a.location
                const emergency = getAmbulanceEmergency(a.ambulanceId)
                const statusColor = STATUS_COLOR[a.status] || '#94a3b8'
                const sec = locations[a.ambulanceId] ? Math.floor((Date.now() - (locations[a.ambulanceId].ts || 0)) / 1000) : null

                return (
                    <div key={a._id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${statusColor}` }}>
                        {/* Ambulance header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>🚑 {a.ambulanceId} <span style={{ fontWeight: 400, color: 'var(--text2)' }}>· {a.vehicleNumber}</span></div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                                    EMT: {a.emt?.name || '—'} · Pilot: {a.pilot?.name || '—'}
                                </div>
                                {loc?.lat && (
                                    <div style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                        📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                        {sec !== null && <span style={{ color: 'var(--text3)' }}>({sec}s ago)</span>}
                                        {!locations[a.ambulanceId] && <span style={{ color: 'var(--text3)' }}>(last known)</span>}
                                    </div>
                                )}
                            </div>
                            <span className="badge" style={{ background: statusColor + '20', color: statusColor, flexShrink: 0 }}>
                                {a.status || 'Offline'}
                            </span>
                        </div>

                        {/* Emergency request linked to this ambulance */}
                        {emergency && (
                            <div style={{ background: 'var(--danger-light)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>🆘 Active Case</div>
                                <div><strong>Patient:</strong> {emergency.patientName}</div>
                                <div><strong>Condition:</strong> {emergency.condition || 'Not specified'}</div>
                                <div><strong>Type:</strong> {emergency.emergencyType}</div>
                                <div style={{ marginTop: 4 }}>
                                    <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11 }}>
                                        Status: {emergency.status}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* No active emergency */}
                        {!emergency && (
                            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No active assignment</div>
                        )}
                    </div>
                )
            })}

            {ambulances.length === 0 && <div className="empty"><p>No ambulances registered</p></div>}

            {/* Register Modal */}
            {adding && (
                <div className="modal-overlay" onClick={() => setAdding(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Register Ambulance</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setAdding(false)}><X size={18} /></button>
                        </div>
                        {[{ k: 'ambulanceId', l: 'Ambulance ID' }, { k: 'vehicleNumber', l: 'Vehicle Number' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
                            </div>
                        ))}
                        <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 4 }}>EMT Details</div>
                        {[{ k: 'name', l: 'Name' }, { k: 'emtId', l: 'EMT ID' }, { k: 'mobile', l: 'Mobile' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={form.emt[f.k]} onChange={e => setForm(p => ({ ...p, emt: { ...p.emt, [f.k]: e.target.value } }))} />
                            </div>
                        ))}
                        <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 4 }}>Pilot Details</div>
                        {[{ k: 'name', l: 'Name' }, { k: 'pilotId', l: 'Pilot ID' }, { k: 'mobile', l: 'Mobile' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={form.pilot[f.k]} onChange={e => setForm(p => ({ ...p, pilot: { ...p.pilot, [f.k]: e.target.value } }))} />
                            </div>
                        ))}
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Default password: <strong>test@1234</strong></p>
                        <button className="btn btn-primary btn-full" onClick={create}>Register</button>
                    </div>
                </div>
            )}
        </div>
    )
}
