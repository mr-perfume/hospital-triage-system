// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ReTriageDashboard from './pages/ReTriageDashboard';
import FinalDashboard    from './pages/FinalDashboard';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Top nav to switch between dashboards */}
        <nav className="top-nav">
          <div className="nav-brand">🏥 AI Triage System</div>
          <div className="nav-links">
            <NavLink to="/"      end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              🔁 Re-Triage Queue
            </NavLink>
            <NavLink to="/final"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              ✅ Final Dashboard
            </NavLink>
          </div>
        </nav>

        <div className="app-body">
          <Routes>
            <Route path="/"      element={<ReTriageDashboard />} />
            <Route path="/final" element={<FinalDashboard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
