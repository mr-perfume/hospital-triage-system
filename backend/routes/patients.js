// routes/patients.js — All patient-related API routes
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { sendToAI } = require('../services/aiService');
const { processPendingPatients, processReTriagedPatients } = require('../services/cronService');

// ─────────────────────────────────────────────────────────────────
// POST /api/patient
// QR form registration — creates patient with status: "pending"
// ─────────────────────────────────────────────────────────────────
router.post('/patient', async (req, res) => {
  try {
    const { name, age, gender, mobile, symptoms, condition, eta } = req.body;

    const patient = new Patient({
      name, age, gender, mobile,
      symptoms, condition, eta,
      status: 'pending',
    });

    await patient.save();

    const io = req.app.get('io');
    io.emit('new_patient', patient);

    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/pre-triage
// Returns patients with status = "pre_triaged" for re-triage dashboard
// Sorted: level1 first (critical on top)
// ─────────────────────────────────────────────────────────────────
router.get('/pre-triage', async (req, res) => {
  try {
    const { search } = req.query;

    let query = { status: 'pre_triaged' };
    if (search) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const PRIORITY_ORDER = { level1: 1, level2: 2, level3: 3, level4: 4, level5: 5 };
    const patients = await Patient.find(query).sort({ createdAt: 1 });

    // Sort by priority (level1 first)
    patients.sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));

    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/final
// Returns patients with status = "completed" for final dashboard
// Sorted: level1 → level5
// ─────────────────────────────────────────────────────────────────
router.get('/final', async (req, res) => {
  try {
    const { search } = req.query;

    let query = { status: 'completed' };
    if (search) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const PRIORITY_ORDER = { level1: 1, level2: 2, level3: 3, level4: 4, level5: 5 };
    const patients = await Patient.find(query).sort({ updatedAt: -1 });
    patients.sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));

    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/patient/:id/approve
// Nurse approves emergency — status: "completed", priority: "level1"
// ─────────────────────────────────────────────────────────────────
router.put('/patient/:id/approve', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        status:      'completed',
        priority:    'level1',
        explanation: (await Patient.findById(req.params.id))?.explanation + ' [EMERGENCY APPROVED by Triage Nurse]',
      },
      { new: true }
    );

    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const io = req.app.get('io');
    io.emit('patient_updated', patient);

    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/patient/:id/vitals
// Nurse fills vitals → status: "re_triaged" (AI will process next)
// ─────────────────────────────────────────────────────────────────
router.put('/patient/:id/vitals', async (req, res) => {
  try {
    const { vitals, symptoms, condition } = req.body;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        vitals,
        symptoms,
        condition,
        status:   're_triaged',
        priority: null, // Will be assigned by AI
      },
      { new: true }
    );

    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const io = req.app.get('io');
    io.emit('patient_updated', patient);

    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/patient/walk-in
// New walk-in patient added by nurse
// Emergency → status: "completed", priority: "level1"
// Normal    → status: "re_triaged" (AI processes later)
// ─────────────────────────────────────────────────────────────────
router.post('/patient/walk-in', async (req, res) => {
  try {
    const { name, age, gender, mobile, symptoms, condition, isEmergency, department } = req.body;

    const patientData = {
      name, age, gender, mobile,
      symptoms, condition,
    };

    if (isEmergency) {
      patientData.status      = 'completed';
      patientData.priority    = 'level1';
      patientData.department  = department || 'Emergency';
      patientData.explanation = `Walk-in emergency. Directly assigned Level 1 by triage nurse. Department: ${department || 'Emergency'}.`;
    } else {
      patientData.status = 're_triaged'; // Goes to AI
    }

    const patient = new Patient(patientData);
    await patient.save();

    const io = req.app.get('io');
    io.emit('new_patient', patient);

    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/re-triage
// Manual trigger — runs AI on all re_triaged patients immediately
// ─────────────────────────────────────────────────────────────────
router.post('/re-triage', async (req, res) => {
  try {
    const io = req.app.get('io');
    await processReTriagedPatients(io);
    const completed = await Patient.find({ status: 'completed' }).sort({ updatedAt: -1 }).limit(20);
    res.json({ success: true, message: 'Re-triage complete', data: completed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/pre-triage/run
// Manual trigger — runs AI on all pending patients immediately
// ─────────────────────────────────────────────────────────────────
router.post('/pre-triage/run', async (req, res) => {
  try {
    const io = req.app.get('io');
    await processPendingPatients(io);
    const pretriaged = await Patient.find({ status: 'pre_triaged' }).sort({ createdAt: 1 });
    res.json({ success: true, message: 'Pre-triage complete', data: pretriaged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/patient/:id
// Get single patient by ID
// ─────────────────────────────────────────────────────────────────
router.get('/patient/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/patients
// Get all patients (with optional search) — debug / admin use
// ─────────────────────────────────────────────────────────────────
router.get('/patients', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }
    const patients = await Patient.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: patients.length, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
