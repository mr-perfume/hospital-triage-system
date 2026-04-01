// src/utils/priority.js — Priority colours, labels, ordering

export const PRIORITY_CONFIG = {
  level1: { label: 'Level 1 — Critical',    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', emoji: '🔴' },
  level2: { label: 'Level 2 — Emergent',    color: '#ea580c', bg: '#fff7ed', border: '#fdba74', emoji: '🟠' },
  level3: { label: 'Level 3 — Urgent',      color: '#ca8a04', bg: '#fefce8', border: '#fde047', emoji: '🟡' },
  level4: { label: 'Level 4 — Less Urgent', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', emoji: '🟢' },
  level5: { label: 'Level 5 — Non-Urgent',  color: '#15803d', bg: '#f0fdf4', border: '#86efac', emoji: '🟢' },
  null:   { label: 'Pending',               color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', emoji: '⏳' },
};

export const PRIORITY_ORDER = { level1: 1, level2: 2, level3: 3, level4: 4, level5: 5 };

export const getPriorityMeta = (priority) =>
  PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[null];

export const sortByPriority = (patients) =>
  [...patients].sort((a, b) =>
    (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99)
  );

export const formatETA = (eta) => {
  if (!eta) return 'Not provided';
  const d = new Date(eta);
  const now = new Date();
  const diff = Math.round((d - now) / 60000); // minutes
  if (diff < 0)  return `Arrived ${Math.abs(diff)}m ago`;
  if (diff === 0) return 'Arriving now';
  if (diff < 60) return `In ${diff} min`;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
