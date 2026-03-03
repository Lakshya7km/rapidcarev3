import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';

function safeText(s) {
  return typeof s === 'string' ? s : '';
}

function badge(text, style) {
  return (
    <span className="badge" style={style}>
      {text}
    </span>
  );
}

function HospitalDetailsModal({ hospital, onClose }) {
  const [beds, setBeds] = useState(null);
  const [docs, setDocs] = useState(null);
  const [blood, setBlood] = useState(null);
  const [ann, setAnn] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api(`/api/beds/${hospital.hospitalId}`).catch(() => []),
      api(`/api/doctors/${hospital.hospitalId}`).catch(() => []),
      api(`/api/hospital/${hospital.hospitalId}/bloodbank`).catch(() => []),
      api(`/api/hospital/${hospital.hospitalId}/announcements`).catch(() => [])
    ]).then(([b, d, bb, a]) => {
      if (!mounted) return;
      setBeds(b);
      setDocs(d);
      setBlood(bb);
      setAnn(a);
    });
    return () => {
      mounted = false;
    };
  }, [hospital.hospitalId]);

  const bedStats = useMemo(() => {
    if (!beds) return null;
    const total = beds.length;
    const occupied = beds.filter((x) => x.status === 'Occupied').length;
    const vacant = total - occupied;
    return { total, occupied, vacant };
  }, [beds]);

  const directions = () => {
    const loc = hospital.location;
    const dest = loc && loc.lat ? `${loc.lat},${loc.lng}` : encodeURIComponent(hospital.name || hospital.hospitalId);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
  };

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="bg-white p-4 rounded shadow-lg" style={{ width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center mb-3 border-bottom pb-2">
          <h3 className="mb-0">{hospital.name || hospital.hospitalId}</h3>
          <button onClick={onClose} className="btn btn-sm btn-outline">
            ✕
          </button>
        </div>

        <div className="flex justify-between items-center bg-light p-3 rounded mb-3">
          <div>
            <strong>📍 Full Address:</strong>
            <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
              {safeText(hospital.address?.street)}, {safeText(hospital.address?.city)}, {safeText(hospital.address?.state)}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={directions}>
            🚀 Get Directions
          </button>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <strong>📞 Contact Information:</strong>
            <p className="text-muted">
              Phone: {hospital.contact || 'N/A'}
              <br />
              {hospital.email ? `Email: ${hospital.email}` : ''}
            </p>
          </div>
          <div>
            <strong>🛡️ Insurance Accepted:</strong>
            <p className="text-muted">{(hospital.insurance || []).join(', ') || 'Not specified'}</p>
          </div>
        </div>

        {hospital.gallery && hospital.gallery.length > 0 ? (
          <div className="mt-3">
            <strong>🖼️ Hospital Gallery:</strong>
            <div className="flex flex-wrap gap-sm mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {hospital.gallery.map((img) => {
                const src = img.startsWith('http') ? img : `/uploads/hospital-gallery/${hospital.hospitalId}/${img}`;
                return (
                  <img
                    key={img}
                    src={src}
                    alt="Hospital"
                    style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #dee2e6' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/hospital.png';
                      e.currentTarget.style.objectFit = 'contain';
                      e.currentTarget.style.padding = '10px';
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <strong>🏥 Services:</strong>
          <div className="flex flex-wrap gap-sm mt-1">
            {(hospital.services || []).map((s) => badge(s, { background: '#e7f1ff', color: '#0b6efd' }))}
          </div>
        </div>

        <div className="mt-3">
          <strong>🔬 Facilities:</strong>
          <div className="flex flex-wrap gap-sm mt-1">
            {(hospital.facilities || []).map((s) => badge(s, { background: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6' }))}
          </div>
        </div>

        {hospital.treatment && hospital.treatment.length > 0 ? (
          <div className="mt-3">
            <strong>💊 Specializations:</strong>
            <div className="flex flex-wrap gap-sm mt-1">
              {hospital.treatment.map((s) => badge(s, { background: '#e7f1ff', color: '#0b6efd' }))}
            </div>
          </div>
        ) : null}

        {hospital.surgery && hospital.surgery.length > 0 ? (
          <div className="mt-3">
            <strong>🔪 Surgical Procedures:</strong>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {hospital.surgery.join(', ')}
            </p>
          </div>
        ) : null}

        <div className="mt-3">
          <strong>🩸 Blood Bank Availability:</strong>
          <div className="mt-2 text-muted">
            {blood === null ? (
              <small>Loading...</small>
            ) : blood.length === 0 ? (
              <small>No blood info available</small>
            ) : (
              <div className="flex flex-wrap gap-xs">
                {blood.map((i) => (
                  <span key={i._id || `${i.bloodGroup}-${i.units}`} className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                    {i.bloodGroup}: {i.units}U
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <strong>📢 Announcements:</strong>
          <div className="mt-2 text-muted">
            {ann === null ? (
              <small>Loading...</small>
            ) : ann.length === 0 ? (
              <small>No active announcements</small>
            ) : (
              ann.map((a) => (
                <div key={a._id || a.message} className="alert alert-info py-1 px-2 mb-1" style={{ fontSize: '0.8rem' }}>
                  <strong>{a.severity}:</strong> {a.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3" style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
          <div className="text-muted">
            {bedStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0b6efd' }}>{bedStats.total}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Total Beds</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#198754' }}>{bedStats.vacant}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Available</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc3545' }}>{bedStats.occupied}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Occupied</div>
                </div>
              </div>
            ) : (
              <small>Loading bed statistics...</small>
            )}
          </div>
        </div>

        <div className="mt-3">
          <strong>👨‍⚕️ Medical Staff:</strong>
          <div className="mt-2">
            {docs === null ? (
              'Loading...'
            ) : docs.length === 0 ? (
              <p className="text-muted">No doctors listed.</p>
            ) : (
              docs.map((d) => (
                <div key={d._id || d.doctorId} className="flex items-center gap-sm border-bottom py-2">
                  <div
                    className="doctor-avatar"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {d.photoUrl ? (
                      <img src={d.photoUrl} alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '👨‍⚕️'
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {d.speciality}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Public() {
  const [q, setQ] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [bedsByHospitalId, setBedsByHospitalId] = useState(new Map());
  const [docsByHospitalId, setDocsByHospitalId] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api('/api/hospital')
      .then((list) => {
        if (!mounted) return;
        setHospitals(Array.isArray(list) ? list : []);
        setErr('');
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // load per-hospital bed & doc summaries
  useEffect(() => {
    if (!hospitals.length) return;
    let canceled = false;

    const loadBeds = async (hospitalId) => {
      try {
        const beds = await api(`/api/beds/${hospitalId}`);
        if (canceled) return;
        setBedsByHospitalId((m) => {
          const nm = new Map(m);
          nm.set(hospitalId, beds);
          return nm;
        });
      } catch {
        // ignore
      }
    };

    const loadDocs = async (hospitalId) => {
      try {
        const docs = await api(`/api/doctors/${hospitalId}`);
        if (canceled) return;
        setDocsByHospitalId((m) => {
          const nm = new Map(m);
          nm.set(hospitalId, docs);
          return nm;
        });
      } catch {
        // ignore
      }
    };

    hospitals.forEach((h) => {
      loadBeds(h.hospitalId);
      loadDocs(h.hospitalId);
    });

    return () => {
      canceled = true;
    };
  }, [hospitals]);

  // realtime updates
  useEffect(() => {
    const socket = getSocket();

    const onBed = (p) => {
      if (!p?.hospitalId) return;
      api(`/api/beds/${p.hospitalId}`)
        .then((beds) => {
          setBedsByHospitalId((m) => {
            const nm = new Map(m);
            nm.set(p.hospitalId, beds);
            return nm;
          });
        })
        .catch(() => {});
    };

    const onDoc = (p) => {
      if (!p?.hospitalId) return;
      api(`/api/doctors/${p.hospitalId}`)
        .then((docs) => {
          setDocsByHospitalId((m) => {
            const nm = new Map(m);
            nm.set(p.hospitalId, docs);
            return nm;
          });
        })
        .catch(() => {});
    };

    socket.on('bed:publicUpdate', onBed);
    socket.on('doctor:publicUpdate', onDoc);

    return () => {
      socket.off('bed:publicUpdate', onBed);
      socket.off('doctor:publicUpdate', onDoc);
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return hospitals;

    const match = (s) => safeText(s).toLowerCase().includes(qq);

    return hospitals.filter((h) => {
      return (
        match(h.name) ||
        match(h.hospitalId) ||
        match(h.address?.city) ||
        (Array.isArray(h.services) && h.services.some(match)) ||
        (Array.isArray(h.treatment) && h.treatment.some(match))
      );
    });
  }, [hospitals, q]);

  const directions = (h) => {
    const loc = h.location;
    const dest = loc && loc.lat ? `${loc.lat},${loc.lng}` : encodeURIComponent(h.name || h.hospitalId);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
  };

  const call = (h) => {
    if (h.contact) window.location.href = `tel:${h.contact}`;
  };

  return (
    <div>
      <nav className="navbar glass fixed-top">
        <div className="container nav-container">
          <div className="flex items-center gap-sm">
            <a href="/" className="flex items-center gap-sm" style={{ textDecoration: 'none' }}>
              <img src="/images/logo.png" alt="RapidCare Logo" className="logo" />
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                RapidCare
              </span>
            </a>
          </div>
          <div className="flex gap-md items-center">
            <a href="/" className="text-sm font-bold text-muted uppercase" style={{ letterSpacing: 1 }}>
              Home
            </a>
            <a href="#section-hospitals" className="btn btn-primary btn-sm rounded-pill px-4">
              Find Care
            </a>
          </div>
        </div>
      </nav>

      <div className="hero-section" style={{ background: 'linear-gradient(135deg, #0b6efd 0%, #004aad 100%)', padding: '5rem 0 3rem 0', color: 'white', textAlign: 'center', marginBottom: '1rem' }}>
        <div className="container">
          <h1 className="display-4 font-bold mb-3">Instant Medical Precision</h1>
          <p className="lead mb-4 opacity-90">Find the nearest life-saving facility with real-time bed verification.</p>

          <div className="search-container" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="search-input-group" style={{ background: 'white', padding: 8, borderRadius: 50, display: 'flex', boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)' }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                placeholder="Search by hospital, city or medical service..."
                style={{ border: 'none', padding: '12px 24px', flex: 1, borderRadius: 50, fontSize: '1.1rem' }}
              />
              <button className="search-btn" style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>
                Find Hospital
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 20, marginTop: '4rem' }}>
        <div id="section-hospitals" className="portal-section mb-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-bold mb-0">Verified Medical Facilities</h2>
              <p className="text-muted text-sm">Real-time status of trusted healthcare providers</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-muted col-span-full py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-3 font-bold uppercase text-xs">Syncing with medical database...</p>
            </div>
          ) : err ? (
            <div className="alert alert-danger" style={{ gridColumn: '1/-1' }}>
              Failed to load hospitals: {err}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted text-center" style={{ gridColumn: '1/-1', padding: '2rem' }}>
              No hospitals found.
            </div>
          ) : (
            <div className="grid grid-auto-fit gap-lg">
              {filtered.map((h) => {
                const beds = bedsByHospitalId.get(h.hospitalId);
                const docs = docsByHospitalId.get(h.hospitalId);
                const vacant = beds ? beds.filter((b) => b.status !== 'Occupied').length : null;
                const total = beds ? beds.length : null;
                const availableDocs = Array.isArray(docs) ? docs.filter((d) => d.availability === 'Available').slice(0, 2) : null;

                return (
                  <div key={h.hospitalId} className="hospital-card shadow-sm animate-fade-in" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-dark font-bold mb-1" style={{ fontSize: '1.3rem' }}>
                            {h.name || h.hospitalId}
                          </h3>
                          <div className="text-muted text-xs font-medium flex items-center">📍 {h.address?.city || 'City'}</div>
                        </div>
                        <div className="stat-icon bg-light text-primary" style={{ width: 45, height: 45 }}>
                          🏢
                        </div>
                      </div>

                      <div className={`status-badge w-100 mb-4 ${vacant === null ? 'status-busy' : vacant > 0 ? 'status-available' : 'status-full'}`} style={{ padding: '0.5rem 1rem', borderRadius: 12, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {vacant === null ? (
                          'Syncing Beds...'
                        ) : vacant > 0 ? (
                          `🟢 ${vacant} / ${total} Beds Available`
                        ) : (
                          `🔴 All Beds Occupied (${total})`
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="text-xs uppercase font-bold text-muted mb-2" style={{ letterSpacing: '0.5px' }}>
                          Core Expertise
                        </div>
                        <div className="flex flex-wrap gap-xs">
                          {(h.treatment || h.services || ['General Care']).slice(0, 3).map((s) => (
                            <span key={s} className="badge" style={{ background: 'rgba(11, 110, 253, 0.05)', color: 'var(--primary-color)', border: 'none', fontSize: '0.7rem' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-2 pt-3 border-top border-light">
                        {availableDocs === null ? (
                          <small className="text-muted">Syncing staff...</small>
                        ) : availableDocs.length > 0 ? (
                          availableDocs.map((d) => (
                            <div key={d._id || d.doctorId} className="text-sm font-bold">
                              👨‍⚕️ {d.name}
                            </div>
                          ))
                        ) : (
                          <small className="text-muted">No doctors available</small>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-0 grid grid-cols-2 gap-sm">
                      <button className="btn btn-primary font-bold text-xs py-2 rounded-lg" onClick={() => directions(h)}>
                        🚀 Route
                      </button>
                      <button className="btn btn-outline font-bold text-xs py-2 rounded-lg" onClick={() => setSelected(h)}>
                        ℹ️ Info
                      </button>
                      <button className="btn btn-dark text-xs py-2 rounded-lg col-span-2 mt-1" onClick={() => call(h)}>
                        📞 Call Facility
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected ? <HospitalDetailsModal hospital={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
