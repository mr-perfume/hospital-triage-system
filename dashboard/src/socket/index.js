// src/socket/index.js — Shared socket.io client instance
import { io } from 'socket.io-client';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Single shared connection — imported wherever needed
const socket = io(BACKEND, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

socket.on('connect',    () => console.log('🔌 Socket connected:', socket.id));
socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
socket.on('connect_error', (e) => console.warn('⚠️  Socket error:', e.message));

export default socket;
