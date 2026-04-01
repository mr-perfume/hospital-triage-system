// src/api/index.js — All backend API calls for dashboard
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Pre-Triage Dashboard ────────────────────────────────────────
// Fetches patients with status = "pre_triaged"
export const getPreTriagedPatients  = (search = '') =>
  API.get('/api/pre-triage', { params: { search } });

// ─── Approve emergency (level1 → completed) ──────────────────────
export const approvePatient = (id) =>
  API.put(`/api/patient/${id}/approve`);

// ─── Submit vitals → status: re_triaged ─────────────────────────
export const submitVitals = (id, payload) =>
  API.put(`/api/patient/${id}/vitals`, payload);

// ─── Add walk-in patient ─────────────────────────────────────────
export const addWalkInPatient = (data) =>
  API.post('/api/patient/walk-in', data);

// ─── Final Dashboard ─────────────────────────────────────────────
// Fetches patients with status = "completed"
export const getFinalPatients = (search = '') =>
  API.get('/api/final', { params: { search } });

// ─── Manually trigger AI pipeline ────────────────────────────────
export const runPreTriage  = () => API.post('/api/pre-triage/run');
export const runReTriage   = () => API.post('/api/re-triage');
