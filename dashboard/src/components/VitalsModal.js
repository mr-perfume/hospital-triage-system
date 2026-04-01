// src/components/VitalsModal.js
// Opened when nurse clicks a patient to fill vitals / edit symptoms → triggers re_triage
import React, { useState } from 'react';
import { submitVitals, approvePatient } from '../api';
import { getPriorityMeta, formatETA } from '../utils/priority';

export default function VitalsModal({ patient, onClose, onUpdated }) {
  const isLevel1 = patient.priority === 'level1';
  const meta      = getPriorityMeta(patient.priority);

  const [vitals, setVitals] = useState({
    temp:  patient.vitals?.temp  || '',
    pulse: patient.vitals?.pulse || '',
    spo2:  patient.vitals?.spo2  || '',
    sbp:   patient.vitals?.bp?.sbp || '',
    dbp:   patient.vitals?.bp?.dbp || '',
  });
  const [symptoms,  setSymptoms]  = useState(patient.symptoms  || '');
  const [condition, setCondition] = useState(patient.condition || '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const vChange = (e) => setVitals({ ...vitals, [e.target.name]: e.target.value });

  // ─── Approve Level-1 emergency ───────────────────────────────
  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await approvePatient(patient._id);
      onUpdated(res.data.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit vitals → re_triaged (sent to AI) ─────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        symptoms,
        condition,
        vitals: {
          temp:  vitals.temp  ? Number(vitals.temp)  : undefined,
          pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
          spo2:  vitals.spo2  ? Number(vitals.spo2)  : undefined,
          bp: {
            sbp: vitals.sbp ? Number(vitals.sbp) : undefined,
            dbp: vitals.dbp ? Number(vitals.dbp) : undefined,
          },
        },
      };
      const res = await submitVitals(patient._id, payload);
      onUpdated(res.data.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header" style={{ borderLeftColor: meta.color }}>
          <div>
            <h2>{patient.name}</h2>
            <span className="modal-sub">{patient.age}y · {patient.gender} · {patient.mobile}</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Priority badge */}
        <div className="priority-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
          {meta.emoji} {meta.label} &nbsp;|&nbsp; Dept: <strong>{patient.department || '—'}</strong>
        </div>

        {/* ETA */}
        <div className="eta-row">
          🕐 ETA: <strong>{formatETA(patient.eta)}</strong>
          &nbsp;·&nbsp; Registered: {new Date(patient.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* AI Explanation */}
        {patient.explanation && (
          <div className="explanation-box">
            <strong>🤖 AI Assessment:</strong> {patient.explanation}
          </div>
        )}

        {/* ─── Level-1 approve / disapprove ─── */}
        {isLevel1 && (
          <div className="level1-actions">
            <p className="level1-note">⚠️ This patient is <strong>CRITICAL (Level 1)</strong>. Approve or re-assess.</p>
            <div className="btn-row">
              <button className="btn-approve" disabled={loading} onClick={handleApprove}>
                ✅ Approve Emergency → Completed
              </button>
              <span className="or-label">or</span>
              <p className="disapprove-hint">Fill vitals below to <strong>re-assess</strong> (disapprove):</p>
            </div>
          </div>
        )}

        {/* ─── Vitals Form ─── */}
        <form className="vitals-form" onSubmit={handleSubmit}>
          <h3 className="section-label">
            {isLevel1 ? '↳ Re-Assess — Fill Vitals' : 'Fill Vitals & Confirm'}
          </h3>

          <div className="vitals-grid">
            <div className="vfield">
              <label>Temp (°C)</label>
              <input name="temp"  type="number" step="0.1" value={vitals.temp}  onChange={vChange} placeholder="37.0" />
            </div>
            <div className="vfield">
              <label>Pulse (bpm)</label>
              <input name="pulse" type="number" value={vitals.pulse} onChange={vChange} placeholder="80" />
            </div>
            <div className="vfield">
              <label>SpO₂ (%)</label>
              <input name="spo2"  type="number" value={vitals.spo2}  onChange={vChange} placeholder="98" />
            </div>
            <div className="vfield">
              <label>SBP (mmHg)</label>
              <input name="sbp"   type="number" value={vitals.sbp}   onChange={vChange} placeholder="120" />
            </div>
            <div className="vfield">
              <label>DBP (mmHg)</label>
              <input name="dbp"   type="number" value={vitals.dbp}   onChange={vChange} placeholder="80" />
            </div>
          </div>

          <div className="vfield full">
            <label>Symptoms (editable)</label>
            <textarea rows={2} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Update symptoms if needed…" />
          </div>
          <div className="vfield full">
            <label>Condition (editable)</label>
            <textarea rows={2} value={condition} onChange={e => setCondition(e.target.value)} placeholder="Update condition if needed…" />
          </div>

          {error && <div className="modal-error">⚠️ {error}</div>}

          <button type="submit" className="btn-retriage" disabled={loading}>
            {loading ? '⏳ Submitting…' : '🔁 Submit for Re-Triage (AI)'}
          </button>
        </form>
      </div>
    </div>
  );
}
