// src/components/RegistrationForm.js
import React, { useState } from 'react';
import { registerPatient } from '../api';

const CONDITION_TAGS = [
  'Unconscious', 'Chest Pain', 'Difficulty Breathing', 'Head Injury',
  'Severe Bleeding', 'Accident / Trauma', 'Seizure', 'High Fever',
  'Severe Pain', 'Vomiting', 'Dizziness', 'Allergic Reaction',
  'Stroke Symptoms', 'Abdominal Pain', 'Fracture',
];

export default function RegistrationForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: '', age: '', gender: '', mobile: '',
    symptoms: '', condition: '', eta: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addConditionTag = (tag) => {
    setForm(f => ({
      ...f,
      condition: f.condition ? `${f.condition}, ${tag}` : tag,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await registerPatient({
        ...form,
        age: Number(form.age),
      });
      onSubmit(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2 className="form-title">Patient Pre-Registration</h2>

      {/* Name */}
      <div className="field">
        <label>Full Name <span className="req">*</span></label>
        <input
          name="name" value={form.name} onChange={handleChange}
          placeholder="e.g. Rahul Sharma" required
        />
      </div>

      {/* Age + Gender */}
      <div className="row2">
        <div className="field">
          <label>Age <span className="req">*</span></label>
          <input
            name="age" type="number" value={form.age} onChange={handleChange}
            placeholder="Age" required min={0} max={120}
          />
        </div>
        <div className="field">
          <label>Gender <span className="req">*</span></label>
          <select name="gender" value={form.gender} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Mobile */}
      <div className="field">
        <label>Mobile Number <span className="req">*</span></label>
        <input
          name="mobile" value={form.mobile} onChange={handleChange}
          placeholder="+91 98765 43210" required
        />
      </div>

      {/* Condition */}
      <div className="field">
        <label>Condition / Chief Complaint <span className="req">*</span></label>
        <textarea
          name="condition" value={form.condition} onChange={handleChange}
          placeholder="Briefly describe what happened…" rows={2} required
        />
        <div className="tags">
          {CONDITION_TAGS.map(t => (
            <button type="button" key={t} className="tag" onClick={() => addConditionTag(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div className="field">
        <label>Additional Symptoms</label>
        <textarea
          name="symptoms" value={form.symptoms} onChange={handleChange}
          placeholder="Any other symptoms you are experiencing…" rows={2}
        />
      </div>

      {/* ETA */}
      <div className="field">
        <label>Estimated Arrival Time</label>
        <input
          name="eta" type="datetime-local" value={form.eta} onChange={handleChange}
          min={new Date().toISOString().slice(0, 16)}
        />
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? '⏳ Submitting…' : '🏥 Register for Triage'}
      </button>
    </form>
  );
}
