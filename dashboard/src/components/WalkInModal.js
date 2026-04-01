// src/components/WalkInModal.js
// Nurse adds a patient who walks in without pre-registering via QR
import React, { useState } from 'react';
import { addWalkInPatient } from '../api';

const DEPT_OPTIONS = [
  'Emergency', 'Cardiology', 'Neurology', 'Pulmonology',
  'Trauma & Orthopedics', 'Gastroenterology', 'General Medicine',
  'Pediatrics', 'Obstetrics & Gynecology', 'Psychiatry', 'ENT', 'Ophthalmology',
];

export default function WalkInModal({ onClose, onAdded }) {
  const [step, setStep]           = useState('select'); // 'select' | 'emergency' | 'normal'
  const [form, setForm]           = useState({ name: '', age: '', gender: '', mobile: '' });
  const [department, setDept]     = useState('Emergency');
  const [symptoms, setSymptoms]   = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleBase = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const baseValid = form.name && form.age && form.gender && form.mobile;

  const handleSubmit = async (isEmergency) => {
    if (!baseValid) { setError('Please fill all required fields.'); return; }
    setLoading(true); setError('');
    try {
      const res = await addWalkInPatient({
        name: form.name, age: Number(form.age),
        gender: form.gender, mobile: form.mobile,
        symptoms, condition, isEmergency, department,
      });
      onAdded(res.data.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add patient.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header" style={{ borderLeftColor: '#7c3aed' }}>
          <h2>➕ Add Walk-In Patient</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Step 1 — Basic Info */}
        <div className="section-label" style={{ marginBottom: '0.75rem' }}>Basic Information</div>
        <div className="vitals-grid">
          <div className="vfield">
            <label>Name *</label>
            <input name="name" value={form.name} onChange={handleBase} placeholder="Full name" />
          </div>
          <div className="vfield">
            <label>Age *</label>
            <input name="age" type="number" value={form.age} onChange={handleBase} placeholder="Age" />
          </div>
          <div className="vfield">
            <label>Gender *</label>
            <select name="gender" value={form.gender} onChange={handleBase}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="vfield">
            <label>Mobile *</label>
            <input name="mobile" value={form.mobile} onChange={handleBase} placeholder="+91 …" />
          </div>
        </div>

        {step === 'select' && (
          <>
            <div className="section-label" style={{ marginTop: '1rem' }}>Patient Type</div>
            <div className="btn-row" style={{ gap: '1rem', marginTop: '0.5rem' }}>
              <button className="btn-emergency-select" onClick={() => setStep('emergency')}>
                🚨 Emergency
              </button>
              <button className="btn-normal-select" onClick={() => setStep('normal')}>
                🏥 Non-Emergency
              </button>
            </div>
          </>
        )}

        {/* Emergency path */}
        {step === 'emergency' && (
          <>
            <div className="level1-actions" style={{ marginTop: '1rem' }}>
              <p className="level1-note">🚨 Emergency patient — will be assigned <strong>Level 1 directly</strong>.</p>
            </div>
            <div className="vfield full" style={{ marginTop: '0.75rem' }}>
              <label>Referring Department</label>
              <select value={department} onChange={e => setDept(e.target.value)}>
                {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="vfield full">
              <label>Condition / Notes</label>
              <textarea rows={2} value={condition} onChange={e => setCondition(e.target.value)}
                placeholder="Briefly describe emergency condition…" />
            </div>
            {error && <div className="modal-error">⚠️ {error}</div>}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button className="btn-retriage" style={{ background: '#dc2626' }}
                disabled={loading} onClick={() => handleSubmit(true)}>
                {loading ? '⏳ Saving…' : '🚨 Confirm Emergency — Level 1'}
              </button>
              <button className="btn-secondary-sm" onClick={() => setStep('select')}>← Back</button>
            </div>
          </>
        )}

        {/* Normal path */}
        {step === 'normal' && (
          <>
            <div className="vfield full" style={{ marginTop: '0.75rem' }}>
              <label>Symptoms</label>
              <textarea rows={2} value={symptoms} onChange={e => setSymptoms(e.target.value)}
                placeholder="Describe symptoms…" />
            </div>
            <div className="vfield full">
              <label>Condition / Chief Complaint</label>
              <textarea rows={2} value={condition} onChange={e => setCondition(e.target.value)}
                placeholder="Chief complaint…" />
            </div>
            <div className="explanation-box" style={{ marginTop: '0.5rem' }}>
              ℹ️ Patient will be sent to AI for triage. Status will be set to <strong>Re-Triaged</strong>.
            </div>
            {error && <div className="modal-error">⚠️ {error}</div>}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button className="btn-retriage" disabled={loading} onClick={() => handleSubmit(false)}>
                {loading ? '⏳ Saving…' : '✅ Add Patient → Re-Triage'}
              </button>
              <button className="btn-secondary-sm" onClick={() => setStep('select')}>← Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
