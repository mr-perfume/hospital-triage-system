// // services/aiService.js — Axios bridge between Node.js backend and FastAPI
// const axios = require('axios');

// const AI_URL = process.env.AI_URL || 'http://localhost:8000';

// /**
//  * Sends patient data to the FastAPI /predict endpoint.
//  * FastAPI returns: { _id, priority, department, explanation }
//  *
//  * @param {Object} patientData — { _id, symptoms, condition, vitals }
//  * @returns {Object} prediction
//  */
// const sendToAI = async (patientData) => {
//   try {
//     console.log(`📤 Sending patient ${patientData._id} to AI at ${AI_URL}/predict`);

//     const response = await axios.post(
//       `${AI_URL}/predict`,
//       {
//         _id:       patientData._id,
//         symptoms:  patientData.symptoms  || '',
//         condition: patientData.condition || '',
//         vitals:    patientData.vitals    || {},
//       },
//       { timeout: 15000 }
//     );

//     console.log(`📥 AI response for ${patientData._id}:`, response.data);
//     return response.data;

//   } catch (err) {
//     // Graceful fallback — keeps system running even if AI is down
//     console.error(`⚠️  AI service error for ${patientData._id}:`, err.message);
//     return {
//       _id:         patientData._id,
//       priority:    'level3',
//       department:  'General Medicine',
//       explanation: 'AI service temporarily unavailable. Default triage (Level 3) assigned. Please review manually.',
//     };
//   }
// };

// module.exports = { sendToAI };

// services/aiService.js — Axios bridge between Node.js and FastAPI
const axios = require('axios');

const AI_URL = process.env.AI_URL || 'http://localhost:8000';

/**
 * Sends patient data to FastAPI /predict endpoint.
 *
 * The real model (triage_model_v7.pkl) expects:
 *   _id, age, gender, symptoms, condition, vitals
 *
 * FastAPI returns: { _id, priority, department, explanation }
 *
 * Node.js is the ONLY MongoDB client — FastAPI never touches the DB.
 */
const sendToAI = async (patientData) => {
  try {
    const payload = {
      _id:       patientData._id,
      age:       patientData.age       || null,
      gender:    patientData.gender    || null,
      symptoms:  patientData.symptoms  || '',
      condition: patientData.condition || '',
      vitals:    patientData.vitals    || {},
    };

    console.log(`📤 AI request for patient ${payload._id} | age=${payload.age} gender=${payload.gender}`);

    const response = await axios.post(
      `${AI_URL}/predict`,
      payload,
      {
        timeout: 20000,
        headers: {
           'Content-Type': 'application/json',
           'ngrok-skip-browser-warning': 'true',   // ← बस यही add करो
      },
      }
    );

    const data = response.data;
    console.log(`📥 AI response: ${data._id} → ${data.priority} | dept=${data.department}`);
    return data;

  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    console.error(`⚠️  AI service error for ${patientData._id}: ${msg}`);

    // Graceful fallback — system stays operational even if AI is down
    return {
      _id:         patientData._id,
      priority:    'level3',
      department:  'General Medicine',
      explanation: `AI service unavailable (${msg}). Default Level 3 assigned. Review manually.`,
    };
  }
};

module.exports = { sendToAI };
