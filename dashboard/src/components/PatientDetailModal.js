// src/components/PatientDetailModal.js
// Shows full info when a card is clicked on the final dashboard
import React from 'react';
import { getPriorityMeta, formatETA, formatTime } from '../utils/priority';

export default function PatientDetailModal({ patient, onClose }) {
  const meta = getPriorityMeta(patient.priority);
  const v    = patient.vitals || {};

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header" style={{ borderLeftColor: meta.color }}>
          <div>
            <h2>{patient.name}</h2>
            <span className="modal-sub">
              {patient.age}y · {patient.gender} · {patient.mobile}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Priority badge */}
        <div className="priority-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
          {meta.emoji} {meta.label}
          {patient.department && <>&nbsp;·&nbsp; 🏥 <strong>{patient.department}</strong></>}
        </div>

        {/* Two-column detail grid */}
        <div className="detail-grid">
          <div className="detail-section">
            <h4>📋 Clinical Details</h4>
            <Row label="Condition"  value={patient.condition || '—'} />
            <Row label="Symptoms"   value={patient.symptoms  || '—'} />
            <Row label="ETA"        value={formatETA(patient.eta)} />
            <Row label="Registered" value={formatTime(patient.createdAt)} />
            <Row label="Completed"  value={formatTime(patient.updatedAt)} />
          </div>

          <div className="detail-section">
            <h4>🩺 Vitals</h4>
            <Row label="Temperature" value={v.temp  ? `${v.temp} °C`  : '—'} />
            <Row label="Pulse"       value={v.pulse ? `${v.pulse} bpm` : '—'} />
            <Row label="SpO₂"        value={v.spo2  ? `${v.spo2} %`   : '—'} />
            <Row label="BP"
              value={
                v.bp?.sbp && v.bp?.dbp
                  ? `${v.bp.sbp} / ${v.bp.dbp} mmHg`
                  : '—'
              }
            />
          </div>
        </div>

        {/* AI Explanation */}
        {patient.explanation && (
          <div className="explanation-box">
            <strong>🤖 AI Triage Explanation:</strong><br />
            {patient.explanation}
          </div>
        )}

        <button className="btn-secondary-sm" style={{ marginTop: '1rem' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}
