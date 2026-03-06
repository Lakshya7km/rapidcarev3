import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import socket from '../../lib/socket'
import { BedDouble, UserRound, LogOut, RefreshCw, X, Search, Filter } from 'lucide-react'
import QRScanner from '../../components/QRScanner'
import { parseBedIdFromQR } from '../../lib/bedQr'

const STATUS_COLORS = { Vacant: '#22c55e', Occupied: '#ef4444', Reserved: '#f59e0b', Cleaning: '#8b5cf6' }
const STATUSES = ['Vacant', 'Occupied', 'Reserved', 'Cleaning']
const BED_TYPES = ['All Types', 'General', 'ICU', 'Private', 'Emergency', 'HDU', 'Day Care']

const timeSince = (date) => {
    if (!date) return null
    const mins = Math.floor((Date.now() - new Date(date)) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
}

const TABS = [
    { key: 'beds', label: 'Ward', icon: BedDouble },
    { key: 'profile', label: 'Profile', icon: UserRound },
]

export default function NursePortal() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('beds')
    const [beds, setBeds] = useState([])
    const [nurse, setNurse] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [scanMode, setScanMode] = useState(false)
    const [msg, setMsg] = useState('')
    const [patientName, setPatientName] = useState('')
    const [viewMode, setViewMode] = useState('grid')

    // Filters
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterWard, setFilterWard] = useState('')
    const [filterType, setFilterType] = useState('All Types')
    const [showFilters, setShowFilters] = useState(false)

    const loadBeds = useCallback(() =>
        api.get('/nurses/beds').then(r => setBeds(r.data)).finally(() => setLoading(false)),
        [])

    useEffect(() => {
        const nurseId = user?.nurseId || user?.ref
        socket.connect()
        socket.emit('join:hospital', user?.hospitalId)
        loadBeds()
        api.get(`/nurses?hospitalId=${user?.hospitalId}`).then(r => {
            const n = r.data.find(x => x.nurseId === nurseId); if (n) setNurse(n)
        })
        socket.on('bed:update', loadBeds)
        return () => { socket.off('bed:update'); socket.disconnect() }
    }, [user, loadBeds])

    // Derived: all wards for filter dropdown
    const wards = [...new Set(beds.map(b => b.wardNumber))].sort()

    // Apply all filters
    const filtered = beds.filter(b => {
        const matchSearch = !search ||
            b.bedId.toLowerCase().includes(search.toLowerCase()) ||
            (b.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
            b.wardNumber.includes(search)
        const matchStatus = !filterStatus || b.status === filterStatus
        const matchWard = !filterWard || b.wardNumber === filterWard
        const matchType = filterType === 'All Types' || b.bedType === filterType
        return matchSearch && matchStatus && matchWard && matchType
    })

    const updateStatus = async (bedId, status) => {
        try {
            await api.patch(`/beds/${bedId}/status`, {
                status,
                patientName: status === 'Occupied' ? patientName : undefined
            })
            setBeds(b => b.map(x => x.bedId === bedId ? { ...x, status, patientName: status === 'Occupied' ? patientName : null } : x))
            socket.emit('bed:update', { hospitalId: user?.hospitalId, bedId })
            setSelected(null); setPatientName('')
            setMsg(`Bed ${bedId} → ${status}`)
            setTimeout(() => setMsg(''), 3000)
        } catch (err) {
            setMsg('Update failed: ' + (err.response?.data?.message || err.message))
        }
    }

    const handleQRScan = async (data) => {
        const bedId = parseBedIdFromQR(data)
        const bed = beds.find(b => b.bedId === bedId)
        setScanMode(false)

        if (bed) {
            // Small delay so the scan modal fully closes before opening the status modal
            setTimeout(() => setSelected(bed), 180)
            return
        }

        try {
            const r = await api.get(`/beds/public/${bedId}`)
            if (r.data?.hospitalId === user?.hospitalId) {
                setTimeout(() => setSelected(r.data), 180)
            } else {
                setMsg('Scanned bed belongs to another hospital: ' + bedId)
            }
        } catch {
            setMsg('Bed not found: ' + bedId)
        }
    }

    const stats = { Vacant: 0, Occupied: 0, Reserved: 0, Cleaning: 0 }
    beds.forEach(b => stats[b.status]++)

    return (
        <div className="page">
            <div className="topbar">
                <div className="topbar-logo">
                    🩺 <span>Nurse Portal</span>
                    {nurse && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text2)', marginLeft: 8 }}>{nurse.name}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <nav id="nurse-tab-nav" style={{ display: 'none' }}>
                        {TABS.map(t => {
                            const Icon = t.icon
                            return (
                                <button key={t.key} onClick={() => setTab(t.key)} style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                                    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                                    background: tab === t.key ? 'var(--primary-light)' : 'transparent',
                                    color: tab === t.key ? 'var(--primary)' : 'var(--text2)',
                                    fontWeight: tab === t.key ? 600 : 400,
                                }}>
                                    <Icon size={15} />{t.label}
                                </button>
                            )
                        })}
                    </nav>
                    <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/') }}><LogOut size={18} /></button>
                </div>
            </div>

            <div style={{ padding: '16px', paddingBottom: 84, maxWidth: 1100, margin: '0 auto' }}>
                {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}

                {/* Ward Tab */}
                {tab === 'beds' && (
                    <div>
                        {/* Stats */}
                        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 14 }}>
                            {STATUSES.map(s => (
                                <div
                                    key={s} className="stat-card"
                                    style={{ '--accent': STATUS_COLORS[s], cursor: 'pointer', outline: filterStatus === s ? `2px solid ${STATUS_COLORS[s]}` : 'none' }}
                                    onClick={() => setFilterStatus(prev => prev === s ? '' : s)}
                                >
                                    <div className="stat-val">{stats[s]}</div>
                                    <div className="stat-label" style={{ fontSize: 10 }}>{s}</div>
                                </div>
                            ))}
                        </div>

                        {/* Search bar */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                                <input
                                    className="form-input"
                                    style={{ paddingLeft: 32 }}
                                    placeholder="Search by bed, patient, ward…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={() => setScanMode(true)}>📷 Scan QR</button>
                            <button
                                className="btn btn-ghost btn-sm"
                                style={showFilters ? { background: 'var(--primary-light)' } : {}}
                                onClick={() => setShowFilters(f => !f)}
                            >
                                <Filter size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={loadBeds}><RefreshCw size={14} /></button>
                        </div>

                        {/* Extra filters */}
                        {showFilters && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                <select className="form-select" style={{ flex: 1, minWidth: 100 }} value={filterWard} onChange={e => setFilterWard(e.target.value)}>
                                    <option value="">All Wards</option>
                                    {wards.map(w => <option key={w} value={w}>Ward {w}</option>)}
                                </select>
                                <select className="form-select" style={{ flex: 1, minWidth: 100 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    {BED_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterWard(''); setFilterType('All Types'); setSearch('') }}>
                                    Clear
                                </button>
                            </div>
                        )}

                        {/* View toggle + count */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} beds</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-sm" onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text2)', padding: '4px 10px' }}>Grid</button>
                                <button className="btn btn-sm" onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text2)', padding: '4px 10px' }}>List</button>
                            </div>
                        </div>

                        {loading ? <div className="loader-center"><div className="spinner" /></div> : (
                            viewMode === 'grid' ? (
                                <div className="bed-grid">
                                    {filtered.map(b => (
                                        <div key={b.bedId} className={`bed-card ${b.status}`} onClick={() => setSelected(b)}>
                                            <div className="bed-num">{b.bedNumber}</div>
                                            <div className="bed-ward">W-{b.wardNumber}</div>
                                            <div className="bed-type" style={{ fontSize: 10 }}>{b.bedType}</div>
                                            {b.patientName && <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>👤 {b.patientName}</div>}
                                            <div style={{ marginTop: 4 }}>
                                                <span className="badge" style={{ background: STATUS_COLORS[b.status] + '25', color: STATUS_COLORS[b.status], fontSize: 9 }}>{b.status}</span>
                                            </div>
                                            {b.updatedAt && <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>⏱ {timeSince(b.updatedAt)}</div>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    {filtered.map(b => (
                                        <div key={b.bedId} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `3px solid ${STATUS_COLORS[b.status]}` }} onClick={() => setSelected(b)}>
                                            <div style={{ width: 40, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{b.bedNumber}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.bedId}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Ward {b.wardNumber} &middot; {b.bedType}</div>
                                                {b.patientName && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>👤 {b.patientName}</div>}
                                                {b.updatedAt && <div style={{ fontSize: 10, color: 'var(--text3)' }}>⏱ Updated {timeSince(b.updatedAt)}</div>}
                                            </div>
                                            <span className="badge" style={{ background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status], fontSize: 11 }}>{b.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {filtered.length === 0 && !loading && (
                            <div className="empty"><p>No beds match your filters</p></div>
                        )}
                    </div>
                )}

                {/* Profile Tab */}
                {tab === 'profile' && (
                    <div className="card">
                        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px', color: '#7c3aed', fontWeight: 800 }}>
                                {nurse?.name?.[0] || '?'}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{nurse?.name || '—'}</div>
                            <div style={{ color: 'var(--text2)', fontSize: 13 }}>{nurse?.nurseId}</div>
                            <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>📞 {nurse?.mobile || '—'}</div>
                            <div style={{ color: 'var(--text2)', fontSize: 13 }}>🏥 {nurse?.hospitalId}</div>
                            {nurse?.shift && <div style={{ color: 'var(--text2)', fontSize: 13 }}>⏰ Shift: {nurse.shift}</div>}
                            <div style={{ marginTop: 10 }}>
                                <span className="badge badge-purple">Nurse</span>
                            </div>
                        </div>
                        <div className="divider" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {STATUSES.map(s => (
                                <div key={s} className="stat-card" style={{ '--accent': STATUS_COLORS[s] }}>
                                    <div className="stat-val">{stats[s]}</div>
                                    <div className="stat-label" style={{ fontSize: 10 }}>{s}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* QR Scanner Modal */}
            {scanMode && (
                <div className="modal-overlay" onClick={() => setScanMode(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Scan Bed QR Label</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setScanMode(false)}><X size={18} /></button>
                        </div>
                        <QRScanner onScan={handleQRScan} />
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 12, textAlign: 'center' }}>
                            Scan the QR label on the bed to update its status
                        </p>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => { setSelected(null); setPatientName('') }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Bed {selected.bedNumber} — Ward {selected.wardNumber}</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setSelected(null); setPatientName('') }}><X size={18} /></button>
                        </div>
                        <p style={{ color: 'var(--text2)', marginBottom: 6, fontSize: 13 }}>
                            Type: <strong>{selected.bedType}</strong> &middot; Current: <strong style={{ color: STATUS_COLORS[selected.status] }}>{selected.status}</strong>
                        </p>
                        {selected.patientName && (
                            <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>Patient: <strong>{selected.patientName}</strong></p>
                        )}
                        <div className="form-group">
                            <label className="form-label">Patient Name (if marking Occupied)</label>
                            <input className="form-input" placeholder="Patient name..." value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {STATUSES.map(s => (
                                <button key={s} className="btn" onClick={() => updateStatus(selected.bedId, s)}
                                    style={{ background: STATUS_COLORS[s] + '20', color: STATUS_COLORS[s], border: `1.5px solid ${STATUS_COLORS[s]}`, borderRadius: 10, fontWeight: 600, opacity: selected.status === s ? 0.5 : 1 }}>
                                    {selected.status === s ? '✓ ' : ''}{s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bottom-nav">
                {TABS.map(t => {
                    const Icon = t.icon
                    return <button key={t.key} className={`bottom-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><Icon size={22} />{t.label}</button>
                })}
            </div>

            <style>{`
                @media(min-width:768px){
                    #nurse-tab-nav{display:flex!important;gap:4px;}
                    .page > div:nth-child(2){padding-bottom:20px;}
                }
            `}</style>
        </div>
    )
}
