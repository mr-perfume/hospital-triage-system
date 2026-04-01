// src/pages/FinalDashboard.js
// Shows all completed patients as priority-colored cards
import React, { useEffect, useState, useCallback } from 'react';
import socket from '../socket';
import { getFinalPatients, runReTriage } from '../api';
import { getPriorityMeta, sortByPriority, formatTime } from '../utils/priority';
import PatientDetailModal from '../components/PatientDetailModal';

const PRIORITY_LEVELS = ['level1', 'level2', 'level3', 'level4', 'level5'];

export default function FinalDashboard() {
  const [patients,    setPatients]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('all');
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [runLoading,  setRunLoading]  = useState(false);
  const [socketStatus,setSocketStatus]= useState('connecting');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFinalPatients(search);
      setPatients(sortByPriority(res.data.data));
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ─── Real-time socket ────────────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));

    socket.on('patient_completed', (p) => {
      setPatients(prev => {
        const exists = prev.find(x => x._id === p._id);
        const list   = exists ? prev.map(x => x._id === p._id ? p : x) : [p, ...prev];
        return sortByPriority(list);
      });
      showToast(`🏁 Triage complete: ${p.name} — ${p.priority?.toUpperCase()}`);
      setLastUpdated(new Date());
    });

    socket.on('patient_updated', (p) => {
      if (p.status === 'completed') {
        setPatients(prev => sortByPriority(
          prev.find(x => x._id === p._id)
            ? prev.map(x => x._id === p._id ? p : x)
            : [p, ...prev]
        ));
      }
    });

    return () => {
      socket.off('patient_completed');
      socket.off('patient_updated');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchPatients, 400);
    return () => clearTimeout(t);
  }, [search, fetchPatients]);

  const handleManualReTriage = async () => {
    setRunLoading(true);
    try {
      const res = await runReTriage();
      setPatients(sortByPriority(res.data.data));
      showToast(`🤖 Re-triage complete: ${res.data.data.length} patients`);
      setLastUpdated(new Date());
    } catch (e) {
      showToast('❌ Re-triage failed — check backend/ngrok');
    } finally {
      setRunLoading(false);
    }
  };

  // ─── Stats ───────────────────────────────────────────────────
  const counts = {};
  PRIORITY_LEVELS.forEach(l => { counts[l] = patients.filter(p => p.priority === l).length; });

  // ─── Filter ──────────────────────────────────────────────────
  const displayed = filter === 'all' ? patients : patients.filter(p => p.priority === filter);

  return (
    <div className="dashboard-wrapper">

      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>🏥</span>
          <div>
            <h2>Triage</h2>
            <p>Final Dashboard</p>
          </div>
        </div>

        {/* Stats */}
        <div className="sidebar-stats vertical">
          {PRIORITY_LEVELS.map(lvl => {
            const m = getPriorityMeta(lvl);
            return (
              <div key={lvl}
                className={`stat-bar ${filter === lvl ? 'active' : ''}`}
                style={{ borderLeftColor: m.color, cursor: 'pointer' }}
                onClick={() => setFilter(filter === lvl ? 'all' : lvl)}
              >
                <span>{m.emoji} {m.label.split(' — ')[1]}</span>
                <span className="stat-count" style={{ color: m.color }}>{counts[lvl]}</span>
              </div>
            );
          })}
          <div className="stat-bar total" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
            <span>All Patients</span>
            <span className="stat-count">{patients.length}</span>
          </div>
        </div>

        <div className={`socket-status ${socketStatus}`}>
          <span className="dot" /> {socketStatus === 'connected' ? 'Live Updates On' : 'Reconnecting…'}
        </div>

        {lastUpdated && (
          <div className="last-updated">Updated: {lastUpdated.toLocaleTimeString('en-IN')}</div>
        )}

        <button className="btn-manual-run" disabled={runLoading} onClick={handleManualReTriage}>
          {runLoading ? '⏳ Running…' : '🤖 Run Re-Triage AI Now'}
        </button>
        <button className="btn-refresh" onClick={fetchPatients}>🔄 Refresh</button>
      </aside>

      {/* ─── Main ─── */}
      <main className="main-content">
        <div className="topbar">
          <h1>Final Triage Board {filter !== 'all' && `— ${getPriorityMeta(filter).label}`}</h1>
          <input
            className="search-input"
            placeholder="🔍 Search by name or mobile…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && <div className="loading-text">⏳ Loading completed patients…</div>}

        {!loading && displayed.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No patients here yet</h3>
            <p>Completed triage records will appear here.</p>
          </div>
        )}

        {/* ─── Priority sections ─── */}
        {PRIORITY_LEVELS.map(lvl => {
          const group = displayed.filter(p => p.priority === lvl);
          if (!group.length) return null;
          const meta = getPriorityMeta(lvl);
          return (
            <div key={lvl} className="priority-section">
              <div className="section-header" style={{ borderLeftColor: meta.color }}>
                {meta.emoji} {meta.label}
                <span className="section-count" style={{ background: meta.bg, color: meta.color }}>
                  {group.length}
                </span>
              </div>
              <div className="cards-grid">
                {group.map(p => (
                  <PatientCard key={p._id} patient={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {selected && (
        <PatientDetailModal patient={selected} onClose={() => setSelected(null)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── Individual patient card ──────────────────────────────────────
function PatientCard({ patient, onClick }) {
  const meta = getPriorityMeta(patient.priority);
  return (
    <div
      className="patient-card"
      style={{ borderColor: meta.border, background: meta.bg }}
      onClick={onClick}
    >
      <div className="card-header" style={{ background: meta.color }}>
        <span className="card-priority">{meta.emoji} {patient.priority?.toUpperCase()}</span>
        <span className="card-dept">🏥 {patient.department || '—'}</span>
      </div>
      <div className="card-body">
        <h3 className="card-name">{patient.name}</h3>
        <div className="card-meta">{patient.age}y · {patient.gender}</div>
        <div className="card-mobile">📞 {patient.mobile}</div>
        <div className="card-condition">{patient.condition || patient.symptoms || '—'}</div>
        {patient.vitals?.spo2 && (
          <div className="card-vitals">
            💓 {patient.vitals.pulse || '—'} bpm &nbsp;|&nbsp; SpO₂ {patient.vitals.spo2}%
          </div>
        )}
        <div className="card-time">{formatTime(patient.updatedAt)}</div>
        <div className="card-cta">Click for full details →</div>
      </div>
    </div>
  );
}
