import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { Plus, X } from 'lucide-react'

export default function DoctorsSection({ hospitalId }) {
    const [docs, setDocs] = useState([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [form, setForm] = useState({ doctorId: '', name: '', speciality: '', qualification: '', experience: '' })
    const [msg, setMsg] = useState('')

    const AVAIL_COLOR = { Available: '#22c55e', Unavailable: '#ef4444', 'On Leave': '#f59e0b' }

    const load = () => api.get(`/doctors?hospitalId=${hospitalId}`).then(r => setDocs(r.data)).finally(() => setLoading(false))
    useEffect(() => { load() }, [hospitalId])

    const create = async () => {
        await api.post('/doctors', { ...form, hospitalId })
        setAdding(false); load(); setMsg('Doctor registered!')
        setForm({ doctorId: '', name: '', speciality: '', qualification: '', experience: '' })
    }

    const toggleAvailability = async (doc) => {
        const next = doc.availability === 'Available' ? 'Unavailable' : 'Available'
        await api.put(`/doctors/${doc.doctorId}`, { availability: next })
        setDocs(d => d.map(x => x.doctorId === doc.doctorId ? { ...x, availability: next } : x))
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Register Doctor</button>
            </div>

            {docs.map(d => (
                <div key={d._id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {d.photoUrl
                            ? <img src={d.photoUrl} alt={d.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: 18 }}>{d.name[0]}</div>
                        }
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{d.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{d.doctorId} · {d.speciality}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.qualification} · {d.experience}</div>
                        </div>
                        <button
                            className="btn btn-sm"
                            style={{
                                background: (AVAIL_COLOR[d.availability || 'Unavailable']) + '20',
                                color: AVAIL_COLOR[d.availability || 'Unavailable'],
                                border: `1.5px solid ${AVAIL_COLOR[d.availability || 'Unavailable']}`,
                                fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '4px 10px'
                            }}
                            onClick={() => toggleAvailability(d)}
                        >
                            {d.availability || 'Unavailable'}
                        </button>
                    </div>
                </div>
            ))}

            {docs.length === 0 && <div className="empty"><p>No doctors registered</p></div>}

            {/* Add modal */}
            {adding && (
                <div className="modal-overlay" onClick={() => setAdding(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Register Doctor</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setAdding(false)}><X size={18} /></button>
                        </div>
                        {[{ k: 'doctorId', l: 'Doctor ID' }, { k: 'name', l: 'Full Name' }, { k: 'speciality', l: 'Speciality' }, { k: 'qualification', l: 'Qualification' }, { k: 'experience', l: 'Experience' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
                            </div>
                        ))}
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                            Default password: <strong>test@1234</strong> — Doctor can change in their portal
                        </p>
                        <button className="btn btn-primary btn-full" onClick={create}>Register</button>
                    </div>
                </div>
            )}
        </div>
    )
}
