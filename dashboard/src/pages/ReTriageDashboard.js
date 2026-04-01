// src/pages/ReTriageDashboard.js
// Shows pre-triaged patients queue for nurse review
import React, { useEffect, useState, useCallback } from 'react';
import socket from '../socket';
import { getPreTriagedPatients, runPreTriage } from '../api';
import { getPriorityMeta, sortByPriority, formatETA, formatTime } from '../utils/priority';
import VitalsModal from '../components/VitalsModal';
import WalkInModal from '../components/WalkInModal';

export default function ReTriageDashboard() {
  const [patients,      setPatients]      = useState([]);
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState(null);
  const [showWalkIn,    setShowWalkIn]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [runLoading,    setRunLoading]    = useState(false);
  const [socketStatus,  setSocketStatus]  = useState('connecting');
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [toast,         setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ─── Fetch patients from API ─────────────────────────────────
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPreTriagedPatients(search);
      setPatients(sortByPriority(res.data.data));
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ─── Real-time socket updates ────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));

    // When AI pre-triages a new patient → add to queue
    socket.on('patient_pre_triaged', (p) => {
      setPatients(prev => {
        const exists = prev.find(x => x._id === p._id);
        const list   = exists ? prev.map(x => x._id === p._id ? p : x) : [p, ...prev];
        return sortByPriority(list);
      });
      showToast(`⚡ New patient triaged: ${p.name} — ${p.priority?.toUpperCase()}`);
      setLastUpdated(new Date());
    });

    // When a patient's data is updated (vitals submitted, approved)
    socket.on('patient_updated', (p) => {
      // If moved out of pre_triaged, remove from queue
      if (p.status !== 'pre_triaged') {
        setPatients(prev => sortByPriority(prev.filter(x => x._id !== p._id)));
      } else {
        setPatients(prev => sortByPriority(prev.map(x => x._id === p._id ? p : x)));
      }
      setLastUpdated(new Date());
    });

    return () => {
      socket.off('patient_pre_triaged');
      socket.off('patient_updated');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  // ─── Search debounce ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(fetchPatients, 400);
    return () => clearTimeout(t);
  }, [search, fetchPatients]);

  // ─── Handle modal callbacks ──────────────────────────────────
  const handleUpdated = (updated) => {
    setPatients(prev => sortByPriority(
      updated.status === 'pre_triaged'
        ? prev.map(x => x._id === updated._id ? updated : x)
        : prev.filter(x => x._id !== updated._id)
    ));
    showToast(`✅ ${updated.name} updated → ${updated.status}`);
  };

  const handleAdded = (newPatient) => {
    if (newPatient.status === 'pre_triaged') {
      setPatients(prev => sortByPriority([newPatient, ...prev]));
    }
    showToast(`➕ Walk-in added: ${newPatient.name}`);
  };

  const handleManualRun = async () => {
    setRunLoading(true);
    try {
      const res = await runPreTriage();
      setPatients(sortByPriority(res.data.data));
      showToast(`🤖 AI ran: ${res.data.data.length} patients pre-triaged`);
      setLastUpdated(new Date());
    } catch(e) {
      showToast('❌ AI run failed — check backend/ngrok');
    } finally {
      setRunLoading(false);
    }
  };

  const level1Count = patients.filter(p => p.priority === 'level1').length;
  const totalCount  = patients.length;

  return (
    <div className="dashboard-wrapper">

      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>🏥</span>
          <div>
            <h2>Triage</h2>
            <p>Re-Triage Queue</p>
          </div>
        </div>

        <div className="sidebar-stats">
          <div className="stat-card critical">
            <div className="stat-num">{level1Count}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card total">
            <div className="stat-num">{totalCount}</div>
            <div className="stat-label">In Queue</div>
          </div>
        </div>

        <div className={`socket-status ${socketStatus}`}>
          <span className="dot" /> {socketStatus === 'connected' ? 'Live Updates On' : 'Reconnecting…'}
        </div>

        {lastUpdated && (
          <div className="last-updated">
            Updated: {lastUpdated.toLocaleTimeString('en-IN')}
          </div>
        )}

        <button className="btn-walkin" onClick={() => setShowWalkIn(true)}>
          ➕ Add Walk-In Patient
        </button>

        <button className="btn-manual-run" disabled={runLoading} onClick={handleManualRun}>
          {runLoading ? '⏳ Running AI…' : '🤖 Run Pre-Triage AI Now'}
        </button>

        <button className="btn-refresh" onClick={fetchPatients}>
          🔄 Refresh Queue
        </button>
      </aside>

      {/* ─── Main content ─── */}
      <main className="main-content">
        <div className="topbar">
          <h1>Pre-Triage Queue</h1>
          <input
            className="search-input"
            placeholder="🔍 Search by name or mobile…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Legend */}
        <div className="legend">
          {['level1','level2','level3','level4','level5'].map(lvl => {
            const m = getPriorityMeta(lvl);
            return (
              <span key={lvl} className="legend-item" style={{ color: m.color }}>
                {m.emoji} {m.label}
              </span>
            );
          })}
        </div>

        {loading && <div className="loading-text">⏳ Loading patients…</div>}

        {!loading && patients.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <h3>No patients in queue</h3>
            <p>Patients will appear here after QR pre-registration and AI triage.</p>
          </div>
        )}

        {/* ─── Patient Queue ─── */}
        <div className="queue-list">
          {patients.map((p, idx) => {
            const meta = getPriorityMeta(p.priority);
            const isCritical = p.priority === 'level1';
            return (
              <div
                key={p._id}
                className={`queue-card ${isCritical ? 'critical-card' : ''}`}
                style={{ borderLeftColor: meta.color }}
                onClick={() => setSelected(p)}
              >
                {isCritical && <div className="critical-pulse" />}

                <div className="queue-left">
                  <span className="queue-num">#{idx + 1}</span>
                  <div>
                    <div className="queue-name">{p.name}</div>
                    <div className="queue-meta">
                      {p.age}y · {p.gender} · {p.mobile}
                    </div>
                    <div className="queue-condition">{p.condition || p.symptoms || '—'}</div>
                  </div>
                </div>

                <div className="queue-right">
                  <div className="priority-pill" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                    {meta.emoji} {p.priority?.toUpperCase()}
                  </div>
                  <div className="queue-dept">🏥 {p.department || '—'}</div>
                  <div className="queue-eta">⏱ {formatETA(p.eta)}</div>
                  <div className="queue-time">{formatTime(p.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ─── Modals ─── */}
      {selected && (
        <VitalsModal
          patient={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
      {showWalkIn && (
        <WalkInModal
          onClose={() => setShowWalkIn(false)}
          onAdded={handleAdded}
        />
      )}

      {/* ─── Toast ─── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
