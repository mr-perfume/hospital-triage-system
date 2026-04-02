// // services/cronService.js — Scheduled jobs for AI pipeline
// const cron = require('node-cron');
// const Patient = require('../models/Patient');
// const { sendToAI } = require('./aiService');

// // ─── Step 2: pending → pre_triaged ───────────────────────────────
// const processPendingPatients = async (io) => {
//   try {
//     const patients = await Patient.find({ status: 'pending' });
//     if (!patients.length) return;

//     console.log(`🔄 Pre-triaging ${patients.length} pending patient(s)...`);

//     for (const patient of patients) {
//       const prediction = await sendToAI({
//         _id:       patient._id.toString(),
//         symptoms:  patient.symptoms,
//         condition: patient.condition,
//         vitals:    patient.vitals,
//       });

//       const updated = await Patient.findByIdAndUpdate(
//         patient._id,
//         {
//           status:      'pre_triaged',
//           priority:    prediction.priority,
//           department:  prediction.department,
//           explanation: prediction.explanation,
//         },
//         { new: true }
//       );

//       // Broadcast to all connected dashboard clients
//       if (io) io.emit('patient_pre_triaged', updated);
//     }

//     console.log(`✅ Pre-triage done for ${patients.length} patient(s)`);
//   } catch (err) {
//     console.error('❌ Pre-triage cron error:', err.message);
//   }
// };

// // ─── Step 4: re_triaged → completed ──────────────────────────────
// const processReTriagedPatients = async (io) => {
//   try {
//     const patients = await Patient.find({ status: 're_triaged' });
//     if (!patients.length) return;

//     console.log(`🔄 Final triaging ${patients.length} re-triaged patient(s)...`);

//     for (const patient of patients) {
//       const prediction = await sendToAI({
//         _id:       patient._id.toString(),
//         symptoms:  patient.symptoms,
//         condition: patient.condition,
//         vitals:    patient.vitals,
//       });

//       const updated = await Patient.findByIdAndUpdate(
//         patient._id,
//         {
//           status:      'completed',
//           priority:    prediction.priority,
//           department:  prediction.department,
//           explanation: prediction.explanation,
//         },
//         { new: true }
//       );

//       if (io) io.emit('patient_completed', updated);
//     }

//     console.log(`✅ Final triage done for ${patients.length} patient(s)`);
//   } catch (err) {
//     console.error('❌ Re-triage cron error:', err.message);
//   }
// };

// // ─── Start both cron jobs ─────────────────────────────────────────
// const startCronJobs = (io) => {
//   // Every 30 seconds — process pending patients
//   cron.schedule('*/30 * * * * *', () => processPendingPatients(io));

//   // Every 30 seconds (offset by 15s) — process re-triaged patients
//   setTimeout(() => {
//     cron.schedule('*/30 * * * * *', () => processReTriagedPatients(io));
//   }, 15000);

//   console.log('⏰ Cron jobs started (every 30s for pre-triage & re-triage)');
// };

// module.exports = { startCronJobs, processPendingPatients, processReTriagedPatients };

// services/cronService.js — Scheduled AI pipeline jobs
const cron    = require('node-cron');
const Patient = require('../models/Patient');
const { sendToAI } = require('./aiService');

// ─── Pre-Triage: pending → pre_triaged ────────────────────────────
const processPendingPatients = async (io) => {
  try {
    const patients = await Patient.find({ status: 'pending' });
    if (!patients.length) return;

    console.log(`🔄 Pre-triaging ${patients.length} pending patient(s)...`);

    for (const patient of patients) {
      // Send ALL fields the AI model needs (age, gender, vitals, text)
      const prediction = await sendToAI({
        _id:       patient._id.toString(),
        age:       patient.age,
        gender:    patient.gender,
        symptoms:  patient.symptoms,
        condition: patient.condition,
        vitals:    patient.vitals || {},
      });

      const updated = await Patient.findByIdAndUpdate(
        patient._id,
        {
          status:      'pre_triaged',
          priority:    prediction.priority,
          department:  prediction.department,
          explanation: prediction.explanation,
        },
        { new: true }
      );

      if (io) io.emit('patient_pre_triaged', updated);
      console.log(`  ✓ ${patient.name} → ${prediction.priority} (${prediction.department})`);
    }

    console.log(`✅ Pre-triage complete for ${patients.length} patient(s)`);
  } catch (err) {
    console.error('❌ Pre-triage cron error:', err.message);
  }
};

// ─── Final Triage: re_triaged → completed ─────────────────────────
const processReTriagedPatients = async (io) => {
  try {
    const patients = await Patient.find({ status: 're_triaged' });
    if (!patients.length) return;

    console.log(`🔄 Final triaging ${patients.length} re-triaged patient(s)...`);

    for (const patient of patients) {
      const prediction = await sendToAI({
        _id:       patient._id.toString(),
        age:       patient.age,
        gender:    patient.gender,
        symptoms:  patient.symptoms,
        condition: patient.condition,
        vitals:    patient.vitals || {},  // Now contains nurse-filled vitals
      });

      const updated = await Patient.findByIdAndUpdate(
        patient._id,
        {
          status:      'completed',
          priority:    prediction.priority,
          department:  prediction.department,
          explanation: prediction.explanation,
        },
        { new: true }
      );

      if (io) io.emit('patient_completed', updated);
      console.log(`  ✓ ${patient.name} → ${prediction.priority} (${prediction.department})`);
    }

    console.log(`✅ Final triage complete for ${patients.length} patient(s)`);
  } catch (err) {
    console.error('❌ Re-triage cron error:', err.message);
  }
};

// ─── Start cron jobs ───────────────────────────────────────────────
const startCronJobs = (io) => {
  // Every 30s — process pending patients (pre-triage)
  cron.schedule('*/30 * * * * *', () => processPendingPatients(io));

  // Every 30s offset 15s — process re-triaged patients (final triage)
  setTimeout(() => {
    cron.schedule('*/30 * * * * *', () => processReTriagedPatients(io));
  }, 15000);

  console.log('⏰ Cron jobs started:');
  console.log('   • Every 30s: process pending → pre_triaged');
  console.log('   • Every 30s (+15s offset): process re_triaged → completed');
};

module.exports = { startCronJobs, processPendingPatients, processReTriagedPatients };
