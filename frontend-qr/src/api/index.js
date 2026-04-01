// src/api/index.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

export const registerPatient = (data) => API.post('/api/patient', data);
export const getPatient = (id)    => API.get(`/api/patient/${id}`);
