import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import socket from '../../lib/socket'
import {
    LayoutDashboard, Building2, Image, BedDouble, Stethoscope, Truck,
    UserRound, Droplets, Megaphone, Database, LogOut, Menu, X, AlertTriangle
} from 'lucide-react'

import RDashboard from './sections/RDashboard'
import HospitalInfo from './sections/HospitalInfo'
import Gallery from './sections/Gallery'
import BedManagement from './sections/BedManagement'
import DoctorsSection from './sections/DoctorsSection'
import AmbulancesSection from './sections/AmbulancesSection'
import NursesSection from './sections/NursesSection'
import BloodBankSection from './sections/BloodBankSection'
import AnnouncementsSection from './sections/AnnouncementsSection'
import DatabaseView from './sections/DatabaseView'
import EmergenciesSection from './sections/EmergenciesSection'

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'emergencies', label: 'Emergencies', icon: AlertTriangle, badge: true },
    { key: 'beds', label: 'Beds', icon: BedDouble },
    { key: 'ambulances', label: 'Ambulances', icon: Truck },
    { key: 'doctors', label: 'Doctors', icon: Stethoscope },
    { key: 'nurses', label: 'Nurses', icon: UserRound },
    { key: 'bloodbank', label: 'Blood Bank', icon: Droplets },
    { key: 'announcements', label: 'Announcements', icon: Megaphone },
    { key: 'info', label: 'Hospital Info', icon: Building2 },
    { key: 'gallery', label: 'Gallery', icon: Image },
    { key: 'db', label: 'Database', icon: Database },
]

export default function ReceptionPortal() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('dashboard')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [activeEmergencies, setActiveEmergencies] = useState(0)
    const hospitalId = user?.username || user?.hospitalId

    useEffect(() => {
        socket.connect()
        socket.emit('join:hospital', hospitalId)
        const fetchCount = () =>
            api.get(`/emergency?hospitalId=${hospitalId}`).then(r => {
                setActiveEmergencies(r.data.filter(e => ['Pending', 'Accepted', 'En Route', 'Arrived'].includes(e.status)).length)
            }).catch(() => { })
        fetchCount()
        socket.on('emergency:new', fetchCount)
        socket.on('emergency:update', fetchCount)
        return () => {
            socket.off('emergency:new', fetchCount)
            socket.off('emergency:update', fetchCount)
            socket.disconnect()
        }
    }, [hospitalId])

    const handleLogout = () => { logout(); navigate('/') }
    const go = (key) => { setTab(key); setDrawerOpen(false) }

    const renderSection = () => {
        switch (tab) {
            case 'dashboard': return <RDashboard hospitalId={hospitalId} />
            case 'emergencies': return <EmergenciesSection hospitalId={hospitalId} />
            case 'info': return <HospitalInfo hospitalId={hospitalId} />
            case 'gallery': return <Gallery hospitalId={hospitalId} />
            case 'beds': return <BedManagement hospitalId={hospitalId} />
            case 'doctors': return <DoctorsSection hospitalId={hospitalId} />
            case 'ambulances': return <AmbulancesSection hospitalId={hospitalId} />
            case 'nurses': return <NursesSection hospitalId={hospitalId} />
            case 'bloodbank': return <BloodBankSection hospitalId={hospitalId} />
            case 'announcements': return <AnnouncementsSection hospitalId={hospitalId} />
            case 'db': return <DatabaseView hospitalId={hospitalId} />
            default: return null
        }
    }

    const currentTabLabel = TABS.find(t => t.key === tab)?.label

    const NavItem = ({ t, inSidebar }) => {
        const Icon = t.icon
        const isActive = tab === t.key
        const showBadge = t.badge && activeEmergencies > 0
        return (
            <button
                onClick={() => go(t.key)}
                className={inSidebar ? `sidebar-item ${isActive ? 'active' : ''}` : `drawer-item ${isActive ? 'active' : ''}`}
            >
                <Icon size={inSidebar ? 16 : 18} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.label}</span>
                {showBadge && (
                    <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px', animation: 'pulse 1.5s infinite' }}>
                        {activeEmergencies}
                    </span>
                )}
            </button>
        )
    }

    return (
        <div className="page">
            {/* TOPBAR */}
            <div className="topbar">
                {/* Hamburger — mobile only */}
                <button className="btn btn-ghost btn-icon mobile-only" onClick={() => setDrawerOpen(true)}>
                    <Menu size={20} />
                </button>
                <div className="topbar-logo">
                    🏥 <span>{currentTabLabel || 'Reception'}</span>
                    {tab !== 'emergencies' && activeEmergencies > 0 && (
                        <button onClick={() => go('emergencies')} style={{
                            background: '#ef4444', color: 'white', borderRadius: 99,
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', marginLeft: 8,
                            border: 'none', cursor: 'pointer', animation: 'pulse 1.5s infinite'
                        }}>
                            🆘 {activeEmergencies}
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)', display: 'none' }} className="desktop-only-inline">{hospitalId}</span>
                    <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout"><LogOut size={18} /></button>
                </div>
            </div>

            {/* DESKTOP SIDEBAR */}
            <aside className="desktop-sidebar desktop-only">
                <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>🏥 Reception</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{hospitalId}</div>
                </div>
                {TABS.map(t => <NavItem key={t.key} t={t} inSidebar />)}
                <div style={{ flex: 1 }} />
                <button className="sidebar-item" style={{ color: '#ef4444', marginTop: 8 }} onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                </button>
            </aside>

            {/* MOBILE DRAWER */}
            {drawerOpen && (
                <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
                    <div className="drawer" onClick={e => e.stopPropagation()}>
                        <div className="drawer-header">
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>💊 RapidCare</div>
                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Reception — {hospitalId}</div>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setDrawerOpen(false)}><X size={18} /></button>
                        </div>
                        {TABS.map(t => <NavItem key={t.key} t={t} inSidebar={false} />)}
                        <div style={{ marginTop: 'auto', padding: '8px 0' }}>
                            <button className="drawer-item" style={{ color: '#ef4444' }} onClick={handleLogout}>
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            <main className="has-sidebar portal-content" style={{ padding: '20px 16px', minHeight: 'calc(100dvh - 57px)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    {renderSection()}
                </div>
            </main>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.6} }
                @media(min-width:768px){ .desktop-only-inline{display:inline!important} }
            `}</style>
        </div>
    )
}
