// server.js — Main entry point
require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');

const connectDB      = require('./config/db');
const patientRoutes  = require('./routes/patients');
const { startCronJobs } = require('./services/cronService');

const app    = express();
const server = http.createServer(app);

// ─── Socket.io setup ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',   // Tighten in production
    methods: ['GET', 'POST', 'PUT'],
  },
});

// ─── Connect to MongoDB Atlas ─────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || '*',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// ─── Make io available in routes ─────────────────────────────────
app.set('io', io);

// ─── Health check ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status:  'ok',
    message: '🏥 Hospital Triage API is running',
    time:    new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api', patientRoutes);

// ─── Socket.io events ────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ─── Start cron jobs after server is ready ────────────────────────
startCronJobs(io);

// ─── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 AI service URL: ${process.env.AI_URL || 'http://localhost:8000'}`);
});
