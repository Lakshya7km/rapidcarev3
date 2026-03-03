import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { Megaphone, Plus, Trash2, X } from 'lucide-react'

const PRIORITY_COLOR = { Low: 'badge-green', Medium: 'badge-blue', High: 'badge-yellow', Urgent: 'badge-red' }

export default function AnnouncementsSection({ hospitalId }) {
    const [list, setList] = useState([])
    const [adding, setAdding] = useState(false)
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ title: '', content: '', priority: 'Medium' })

    const load = () => api.get(`/announcements?hospitalId=${hospitalId}`).then(r => setList(r.data)).finally(() => setLoading(false))
    useEffect(() => { load() }, [hospitalId])

    const create = async () => {
        await api.post('/announcements', { ...form, hospitalId })
        setAdding(false); load(); setForm({ title: '', content: '', priority: 'Medium' })
    }

    const remove = async (id) => {
        await api.delete(`/announcements/${id}`)
        setList(l => l.filter(a => a._id !== id))
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> New Announcement</button>
            </div>

            {list.map(a => (
                <div key={a._id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                <Megaphone size={15} color="var(--primary)" />
                                <span style={{ fontWeight: 700 }}>{a.title}</span>
                                <span className={`badge ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text2)' }}>{a.content}</p>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                        <button className="btn btn-ghost btn-icon" onClick={() => remove(a._id)}><Trash2 size={15} color="#ef4444" /></button>
                    </div>
                </div>
            ))}
            {list.length === 0 && <div className="empty"><Megaphone size={40} /><p>No announcements</p></div>}

            {adding && (
                <div className="modal-overlay" onClick={() => setAdding(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">New Announcement</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setAdding(false)}><X size={18} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Content</label>
                            <textarea className="form-textarea" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-primary btn-full" onClick={create}>Post Announcement</button>
                    </div>
                </div>
            )}
        </div>
    )
}
