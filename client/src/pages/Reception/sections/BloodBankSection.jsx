import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { RefreshCw } from 'lucide-react'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const BLOOD_COLORS = {
    'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6', 'B-': '#a855f7',
    'O+': '#0ea5e9', 'O-': '#06b6d4', 'AB+': '#22c55e', 'AB-': '#16a34a'
}

export default function BloodBankSection({ hospitalId }) {
    const [inventory, setInventory] = useState([]) // from server
    const [editing, setEditing] = useState({})     // { 'A+': '10', ... } draft values
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')

    const load = () => {
        api.get(`/bloodbank?hospitalId=${hospitalId}`)
            .then(r => {
                setInventory(r.data)
                // Pre-fill editing with current values
                const map = {}
                r.data.forEach(i => { map[i.bloodType] = String(i.units) })
                setEditing(map)
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [hospitalId])

    const saveAll = async () => {
        setSaving(true)
        try {
            await Promise.all(BLOOD_TYPES.map(bg =>
                api.post('/bloodbank/upsert', {
                    hospitalId,
                    bloodType: bg,
                    units: parseInt(editing[bg] || '0', 10)
                })
            ))
            setMsg('Blood bank updated! Stock is now visible on Public Portal.')
            load()
        } catch (e) {
            setMsg('Error saving: ' + (e.response?.data?.message || e.message))
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    // Build full grid always showing all 8 blood types
    const invMap = {}
    inventory.forEach(i => { invMap[i.bloodType] = i.units })

    const totalUnits = Object.values(invMap).reduce((a, b) => a + b, 0)
    const availableTypes = Object.values(invMap).filter(u => u > 0).length

    return (
        <div>
            {msg && (
                <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`} onClick={() => setMsg('')}>
                    {msg}
                </div>
            )}

            {/* Summary stat */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 14 }}>
                <div className="stat-card" style={{ '--accent': '#ef4444' }}>
                    <div className="stat-val">{totalUnits}</div>
                    <div className="stat-label">Total Units</div>
                </div>
                <div className="stat-card" style={{ '--accent': '#22c55e' }}>
                    <div className="stat-val">{availableTypes}</div>
                    <div className="stat-label">Types Available</div>
                </div>
            </div>

            {/* Blood type grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                {BLOOD_TYPES.map(bg => {
                    const color = BLOOD_COLORS[bg]
                    const currentUnits = invMap[bg] || 0
                    const draftVal = editing[bg] ?? String(currentUnits)
                    const isDirty = draftVal !== String(currentUnits)

                    return (
                        <div key={bg} className="card" style={{ padding: 12, borderLeft: `3px solid ${color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: color + '20', color: color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: 13
                                }}>
                                    {bg}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Blood Group {bg}</div>
                                    <div style={{ fontSize: 11, color: currentUnits > 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                                        {currentUnits > 0 ? `${currentUnits} units available` : 'Out of stock'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    style={{ flex: 1, padding: '6px 10px', borderColor: isDirty ? color : undefined }}
                                    value={draftVal}
                                    onChange={e => setEditing(prev => ({ ...prev, [bg]: e.target.value }))}
                                    placeholder="0"
                                />
                                <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>units</span>
                            </div>
                            {isDirty && <div style={{ fontSize: 10, color: color, marginTop: 4 }}>• Unsaved change</div>}
                        </div>
                    )
                })}
            </div>

            {/* Save button */}
            <button
                className="btn btn-primary btn-full"
                onClick={saveAll}
                disabled={saving}
                style={{ marginBottom: 8 }}
            >
                {saving ? 'Saving...' : '💾 Save Blood Bank Stock'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>
                Changes are visible to the public via the Hospital Details page
            </p>
        </div>
    )
}
