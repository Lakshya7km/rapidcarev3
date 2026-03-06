import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const STATUS_COLORS = {
    Vacant: '#22c55e',
    Occupied: '#ef4444',
    Reserved: '#f59e0b',
    Cleaning: '#8b5cf6'
}
const STATUSES = ['Vacant', 'Occupied', 'Reserved', 'Cleaning']

export default function BedScanPage() {
    const { bedId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [bed, setBed] = useState(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [patientName, setPatientName] = useState('')
    const [msg, setMsg] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        api.get(`/beds/public/${bedId}`)
            .then(r => { setBed(r.data); setPatientName(r.data.patientName || '') })
            .catch(() => setError('Bed not found. The QR code may be invalid.'))
            .finally(() => setLoading(false))
    }, [bedId])

    const canUpdate = user && (user.role === 'nurse' || user.role === 'hospital')

    const updateStatus = async (status) => {
        if (!canUpdate) {
            navigate(`/?redirect=/bed/${bedId}`)
            return
        }
        setUpdating(true)
        setError('')
        setMsg('')
        try {
            const r = await api.patch(`/beds/${bedId}/status`, {
                status,
                patientName: status === 'Occupied' ? patientName : undefined
            })
            setBed(r.data)
            setMsg(`✓ Bed updated to ${status}`)
            setTimeout(() => setMsg(''), 3000)
        } catch (e) {
            setError(e.response?.data?.message || 'Update failed. Please try again.')
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f9ff', gap: 16 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
                <p style={{ color: '#64748b', fontSize: 14 }}>Loading bed info…</p>
            </div>
        )
    }

    if (error && !bed) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛏️</div>
                <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Bed Not Found</h2>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>{error}</p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>Go Back</button>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100dvh', background: '#f0f9ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 32, padding: '32px 16px 40px' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🛏️</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Bed Status Update</h1>
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{bed.hospitalId}</p>
            </div>

            {/* Bed Info Card */}
            <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16, borderTop: `4px solid ${STATUS_COLORS[bed.status]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{bed.bedNumber}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Ward {bed.wardNumber} · {bed.bedType}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID: {bed.bedId}</div>
                    </div>
                    <span style={{ background: STATUS_COLORS[bed.status] + '20', color: STATUS_COLORS[bed.status], padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1px solid ${STATUS_COLORS[bed.status]}40` }}>
                        {bed.status}
                    </span>
                </div>

                {bed.patientName && (
                    <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', marginBottom: 4, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                        👤 Patient: {bed.patientName}
                    </div>
                )}
            </div>

            {/* Messages */}
            {msg && (
                <div style={{ width: '100%', maxWidth: 420, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
                    {msg}
                </div>
            )}
            {error && (
                <div style={{ width: '100%', maxWidth: 420, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {/* Auth check */}
            {!canUpdate ? (
                <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>You must be logged in as a <strong>Nurse</strong> or <strong>Reception</strong> staff to update this bed.</p>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/')}>
                        Login to Update
                    </button>
                </div>
            ) : (
                <div style={{ width: '100%', maxWidth: 420 }}>
                    {/* Patient Name Input */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                            Patient Name (for Occupied)
                        </label>
                        <input
                            className="form-input"
                            placeholder="Enter patient name…"
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                        />
                    </div>

                    {/* Status Buttons */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 14, textAlign: 'center' }}>Update Status</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {STATUSES.map(s => (
                                <button
                                    key={s}
                                    disabled={updating}
                                    onClick={() => updateStatus(s)}
                                    style={{
                                        padding: '14px 8px',
                                        border: `2px solid ${STATUS_COLORS[s]}`,
                                        borderRadius: 12,
                                        background: bed.status === s ? STATUS_COLORS[s] : STATUS_COLORS[s] + '15',
                                        color: bed.status === s ? 'white' : STATUS_COLORS[s],
                                        fontWeight: 700,
                                        fontSize: 14,
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        opacity: updating ? 0.6 : 1,
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {bed.status === s && '✓ '}{s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Back button */}
                    <button
                        className="btn btn-ghost"
                        style={{ width: '100%', color: '#64748b' }}
                        onClick={() => navigate('/')}
                    >
                        ← Go Back
                    </button>
                </div>
            )}
        </div>
    )
}
