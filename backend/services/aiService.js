// services/aiService.js — Axios bridge between Node.js backend and FastAPI
const axios = require('axios');

const AI_URL = process.env.AI_URL || 'http://localhost:8000';

/**
 * Sends patient data to the FastAPI /predict endpoint.
 * FastAPI returns: { _id, priority, department, explanation }
 *
 * @param {Object} patientData — { _id, symptoms, condition, vitals }
 * @returns {Object} prediction
 */
const sendToAI = async (patientData) => {
  try {
    console.log(`📤 Sending patient ${patientData._id} to AI at ${AI_URL}/predict`);

    const response = await axios.post(
      `${AI_URL}/predict`,
      {
        _id:       patientData._id,
        symptoms:  patientData.symptoms  || '',
        condition: patientData.condition || '',
        vitals:    patientData.vitals    || {},
      },
      { timeout: 15000 }
    );

    console.log(`📥 AI response for ${patientData._id}:`, response.data);
    return response.data;

  } catch (err) {
    // Graceful fallback — keeps system running even if AI is down
    console.error(`⚠️  AI service error for ${patientData._id}:`, err.message);
    return {
      _id:         patientData._id,
      priority:    'level3',
      department:  'General Medicine',
      explanation: 'AI service temporarily unavailable. Default triage (Level 3) assigned. Please review manually.',
    };
  }
};

module.exports = { sendToAI };
