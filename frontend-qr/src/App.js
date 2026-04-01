// src/App.js
import React, { useState } from 'react';
import RegistrationForm from './components/RegistrationForm';
import QRDisplay from './components/QRDisplay';
import './App.css';

export default function App() {
  const [patient, setPatient]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (data) => {
    setPatient(data);
    setSubmitted(true);
  };

  const handleBack = () => {
    setPatient(null);
    setSubmitted(false);
  };

  return (
    <div className="app-bg">
      <header className="app-header">
        <span className="header-icon">🏥</span>
        <div>
          <h1>Hospital Triage</h1>
          <p>AI-Powered Pre-Registration System</p>
        </div>
      </header>

      <main className="app-main">
        {!submitted
          ? <RegistrationForm onSubmit={handleSubmit} />
          : <QRDisplay patient={patient} onBack={handleBack} />
        }
      </main>

      <footer className="app-footer">
        <p>🔒 Your data is securely transmitted and used only for medical triage.</p>
      </footer>
    </div>
  );
}
