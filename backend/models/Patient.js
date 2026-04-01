// models/Patient.js — Single collection for ALL patients
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    // ─── Personal Info ────────────────────────────────────────────
    name:   { type: String, required: true, trim: true },
    age:    { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    mobile: { type: String, required: true, trim: true },

    // ─── Clinical Info (from QR form or nurse) ────────────────────
    symptoms:  { type: String, trim: true },
    condition: { type: String, trim: true },
    eta:       { type: String },   // ISO string from datetime-local input

    // ─── Vitals (filled by nurse in re-triage) ────────────────────
    vitals: {
      temp:  { type: Number },          // °C
      bp: {
        sbp: { type: Number },          // Systolic BP
        dbp: { type: Number },          // Diastolic BP
      },
      pulse: { type: Number },          // bpm
      spo2:  { type: Number },          // %
    },

    // ─── Triage Status & Priority ─────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'pre_triaged', 're_triaged', 'completed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['level1', 'level2', 'level3', 'level4', 'level5', null],
      default: null,
    },

    // ─── AI Output ────────────────────────────────────────────────
    department:  { type: String },
    explanation: { type: String },
  },
  { timestamps: true }
);

// Index for fast status-based queries
patientSchema.index({ status: 1, priority: 1, createdAt: 1 });

module.exports = mongoose.model('Patient', patientSchema);
