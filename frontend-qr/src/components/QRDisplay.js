// src/components/QRDisplay.js
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRDisplay({ patient, onBack }) {
  const etaStr = patient.eta
    ? new Date(patient.eta).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not specified';

  return (
    <div className="qr-card">
      <div className="success-icon">✅</div>
      <h2>Registration Successful!</h2>
      <p className="subtitle">
        Hi <strong>{patient.name}</strong>, you are now in the triage queue.
        Please proceed to the hospital.
      </p>

      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Status</span>
          <span className="badge pending">⏳ Pending Triage</span>
        </div>
        <div className="info-item">
          <span className="info-label">Arrival ETA</span>
          <span>{etaStr}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Mobile</span>
          <span>{patient.mobile}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Patient ID</span>
          <span className="patient-id">{patient._id?.slice(-8).toUpperCase()}</span>
        </div>
      </div>

      <div className="qr-wrapper">
        <p className="qr-label">📱 Show this QR at Reception</p>
        <QRCodeSVG
          value={patient._id || 'unknown'}
          size={200}
          level="H"
          includeMargin
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
        <small>QR contains your unique Patient ID</small>
      </div>

      <div className="note-box">
        💡 Your information has been sent to hospital staff. A triage nurse will
        assess your priority before you arrive.
      </div>

      <button className="btn-secondary" onClick={onBack}>
        ← Register Another Patient
      </button>
    </div>
  );
}
