import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import socket from '../../../lib/socket'
import { X, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
    Pending: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    Accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    'En Route': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    Arrived: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    Admitted: { bg: '#f0fdf4', color: '#065f46', border: '#a7f3d0' },
    Referred: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    Completed: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
}

export default function EmergenciesSection({ hospitalId }) {
    const [requests, setRequests] = useState([])
    const [beds, setBeds] = useState([])
    const [hospitals, setHospitals] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [action, setAction] = useState(null) // 'admit' | 'refer'
    const [selectedBed, setSelectedBed] = useState('')
    const [referTo, setReferTo] = useState('')
    const [referNote, setReferNote] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [msg, setMsg] = useState('')

    const load = () => {
        api.get(`/emergency?hospitalId=${hospitalId}`).then(r => setRequests(r.data)).finally(() => setLoading(false))
    }

    useEffect(() => {
        load()
        api.get(`/beds?hospitalId=${hospitalId}&status=Vacant`).then(r => setBeds(r.data))
        api.get('/hospitals').then(r => setHospitals(r.data.filter(h => h.hospitalId !== hospitalId)))
    }, [hospitalId])

    useEffect(() => {
        socket.on('emergency:new', () => load())
        socket.on('emergency:update', () => load())
        return () => { socket.off('emergency:new'); socket.off('emergency:update') }
    }, [])

    const admit = async () => {
        if (!selectedBed) return
        await api.put(`/emergency/${selected._id}/admit`, { bedId: selectedBed, patientName: selected.patientName })
        setAction(null); setSelected(null); setSelectedBed('')
        setMsg('Patient admitted and bed assigned!')
        load()
        // Refresh vacant beds
        api.get(`/beds?hospitalId=${hospitalId}&status=Vacant`).then(r => setBeds(r.data))
    }

    const refer = async () => {
        if (!referTo) return
        await api.put(`/emergency/${selected._id}/status`, { status: 'Referred', transferredTo: referTo, note: referNote })
        setAction(null); setSelected(null); setReferTo(''); setReferNote('')
        setMsg(`Patient referred to ${referTo}`)
        load()
    }

    const updateStatus = async (id, status) => {
        await api.put(`/emergency/${id}/status`, { status })
        load()
    }

    const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests
    const activeCount = requests.filter(r => ['Pending', 'Accepted', 'En Route', 'Arrived'].includes(r.status)).length

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                    <span style={{ fontWeight: 700 }}>Active Emergencies</span>
                    {activeCount > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 8px', marginLeft: 8 }}>
                            {activeCount} ACTIVE
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-select" style={{ width: 130, fontSize: 12 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">All Requests</option>
                        {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
                </div>
            </div>

            {/* Emergency cards */}
            {filtered.length === 0 && <div className="empty"><p>No emergency requests{filterStatus ? ` with status "${filterStatus}"` : ''}</p></div>}

            {filtered.map(req => {
                const s = STATUS_COLORS[req.status] || STATUS_COLORS.Completed
                const isPending = ['Pending', 'Accepted', 'En Route', 'Arrived'].includes(req.status)
                return (
                    <div key={req._id} className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${s.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>
                                    🆘 {req.patientName}
                                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text2)', marginLeft: 8 }}>
                                        {req.emergencyType}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                                    🚑 {req.ambulanceId || 'No ambulance'} · 📞 {req.contact || '—'}
                                </div>
                                {req.condition && (
                                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>
                                        Condition: {req.condition}
                                    </div>
                                )}
                                {req.ambulanceNotes && (
                                    <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 2 }}>
                                        📋 Ambulance notes: {req.ambulanceNotes}
                                    </div>
                                )}
                                {req.transferredTo && (
                                    <div style={{ fontSize: 12, color: '#6d28d9', marginTop: 2 }}>
                                        ➡ Referred to: <strong>{req.transferredTo}</strong>
                                    </div>
                                )}
                                {req.bedId && (
                                    <div style={{ fontSize: 12, color: '#065f46', marginTop: 2 }}>
                                        🛏 Admitted to bed: <strong>{req.bedId}</strong>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                                    {req.status}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                                    {new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>

                        {/* Action buttons — only for active/pending requests */}
                        {isPending && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                                {req.status === 'Pending' && (
                                    <button className="btn btn-sm btn-success" onClick={() => updateStatus(req._id, 'Accepted')}>
                                        ✓ Accept
                                    </button>
                                )}
                                {(req.status === 'Accepted' || req.status === 'Arrived') && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: '#15803d', color: 'white' }}
                                        onClick={() => { setSelected(req); setAction('admit') }}
                                    >
                                        <CheckCircle size={13} /> Admit & Assign Bed
                                    </button>
                                )}
                                {req.status !== 'Admitted' && req.status !== 'Referred' && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: '#6d28d9', color: 'white' }}
                                        onClick={() => { setSelected(req); setAction('refer') }}
                                    >
                                        <ArrowRight size={13} /> Refer to Another Hospital
                                    </button>
                                )}
                                {req.status === 'Pending' && (
                                    <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(req._id, 'Rejected')} style={{ color: '#ef4444' }}>
                                        ✕ Reject
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Admit Modal */}
            {action === 'admit' && selected && (
                <div className="modal-overlay" onClick={() => { setAction(null); setSelected(null) }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Admit Patient — {selected.patientName}</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setAction(null); setSelected(null) }}><X size={18} /></button>
                        </div>
                        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 14 }}>
                            Condition: <strong>{selected.condition || 'Not specified'}</strong><br />
                            Emergency Type: <strong>{selected.emergencyType}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">Assign Vacant Bed</label>
                            <select className="form-select" value={selectedBed} onChange={e => setSelectedBed(e.target.value)}>
                                <option value="">— Select a bed —</option>
                                {beds.map(b => <option key={b.bedId} value={b.bedId}>{b.bedId} (Ward {b.wardNumber} · {b.bedType})</option>)}
                            </select>
                            {beds.length === 0 && <div className="form-hint" style={{ color: '#dc2626' }}>⚠ No vacant beds available. Please free a bed first.</div>}
                        </div>
                        <button className="btn btn-primary btn-full" onClick={admit} disabled={!selectedBed}>
                            Confirm Admit
                        </button>
                    </div>
                </div>
            )}

            {/* Refer Modal */}
            {action === 'refer' && selected && (
                <div className="modal-overlay" onClick={() => { setAction(null); setSelected(null) }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Refer — {selected.patientName}</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setAction(null); setSelected(null) }}><X size={18} /></button>
                        </div>
                        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 14 }}>
                            Condition: <strong>{selected.condition || 'Not specified'}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">Refer to Hospital</label>
                            <select className="form-select" value={referTo} onChange={e => setReferTo(e.target.value)}>
                                <option value="">— Select hospital —</option>
                                {hospitals.map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name} ({h.hospitalId})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reason / Notes for Referral</label>
                            <textarea className="form-textarea" placeholder="e.g. No ICU beds available, patient needs cardiac specialist…" value={referNote} onChange={e => setReferNote(e.target.value)} />
                        </div>
                        <button className="btn btn-full" style={{ background: '#6d28d9', color: 'white' }} onClick={refer} disabled={!referTo}>
                            <ArrowRight size={15} /> Confirm Referral
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
