// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('./utils/db');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

let PORT = parseInt(process.env.PORT || '5000', 10);

// middleware - MUST come before logging
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic in-memory rate limiter (best-effort; resets on restart)
function rateLimit({ windowMs, max, keyGenerator }) {
  const hits = new Map();
  return (req, res, next) => {
    try {
      const now = Date.now();
      const key = (keyGenerator ? keyGenerator(req) : req.ip) || req.ip;
      const bucket = hits.get(key);
      if (!bucket || now > bucket.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      bucket.count += 1;
      if (bucket.count > max) {
        const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
      }
      return next();
    } catch (e) {
      return next();
    }
  };
}

// Logging middleware - shows all requests in terminal
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n🔵 [${timestamp}] ${req.method} ${req.url}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.headers.authorization) {
    console.log('🔑 Auth: Bearer token present');
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    console.log(`✅ [${timestamp}] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log('❌ Error Response:', data);
    }
    originalSend.call(this, data);
  };

  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/react', express.static(path.join(__dirname, 'public', 'react')));

// connect mongo — uses Vercel-safe cached singleton (utils/db.js)
// bufferCommands:false ensures we fail fast instead of buffering on serverless
connectDB()
  .then(() => console.log('🗄️  MongoDB ready'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Server will continue — some features may not work.');
  });

// Enhanced socket.io handling
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Join hospital-specific room
  socket.on('joinHospitalRoom', (hospitalId) => {
    socket.join(`hospital_${hospitalId}`);
    console.log(`📡 Socket ${socket.id} joined hospital room: ${hospitalId}`);
  });

  // Join ambulance-specific room
  socket.on('joinAmbulanceRoom', (ambulanceId) => {
    socket.join(`ambulance_${ambulanceId}`);
    console.log(`📡 Socket ${socket.id} joined ambulance room: ${ambulanceId}`);
  });

  // Ambulance location tracking
  socket.on('ambulanceLocation', (payload) => {
    // payload: { ambulanceId, hospitalId, lat, lng }
    io.to(`hospital_${payload.hospitalId}`).emit('ambulance:location', payload);
    console.log(`🚑 Ambulance location update: ${payload.ambulanceId} at ${payload.lat}, ${payload.lng}`);
  });

  // Bed status updates
  socket.on('bedStatusUpdate', (payload) => {
    // payload: { bedId, hospitalId, status }
    io.to(`hospital_${payload.hospitalId}`).emit('bed:update', payload);
    // Also broadcast to public portal for live bed counts
    io.emit('bed:publicUpdate', payload);
    console.log(`🛏️ Bed status update: ${payload.bedId} -> ${payload.status}`);
  });

  // Doctor attendance updates
  socket.on('doctorAttendance', (payload) => {
    // payload: { doctorId, hospitalId, availability, shift }
    io.to(`hospital_${payload.hospitalId}`).emit('doctor:attendance', payload);
    // Broadcast to public portal for live doctor availability
    io.emit('doctor:publicUpdate', payload);
    console.log(`👨‍⚕️ Doctor attendance: ${payload.doctorId} -> ${payload.availability}`);
  });

  // Emergency request updates
  socket.on('emergencyUpdate', (payload) => {
    // payload: { emergencyId, hospitalId, status, reason, alternateHospitals }
    io.to(`hospital_${payload.hospitalId}`).emit('emergency:update', payload);
    console.log(`🚨 Emergency update: ${payload.emergencyId} -> ${payload.status}`);
  });

  // New emergency request
  socket.on('newEmergency', (payload) => {
    // payload: { emergencyId, hospitalId, patient, status }
    io.to(`hospital_${payload.hospitalId}`).emit('emergency:new', payload);
    console.log(`🚨 New emergency: ${payload.emergencyId} for hospital ${payload.hospitalId}`);
  });

  // Database reset notification
  socket.on('databaseReset', (payload) => {
    // Broadcast to all connected clients
    io.emit('database:reset', payload);
    console.log(`🔄 Database reset notification sent to all clients`);
  });

  // Hospital info updates
  socket.on('hospitalInfoUpdate', (payload) => {
    // payload: { hospitalId, updates }
    io.to(`hospital_${payload.hospitalId}`).emit('hospital:update', payload);
    // Also broadcast to public portal
    io.emit('hospital:publicUpdate', payload);
    console.log(`🏥 Hospital info update: ${payload.hospitalId}`);
  });

  // Real-time notifications
  socket.on('notification', (payload) => {
    // payload: { type, message, hospitalId?, targetUserId? }
    if (payload.hospitalId) {
      io.to(`hospital_${payload.hospitalId}`).emit('notification', payload);
    } else {
      io.emit('notification', payload);
    }
    console.log(`📢 Notification: ${payload.type} - ${payload.message}`);
  });

  // Ambulance heartbeat - keeps status as "On Duty"
  socket.on('ambulance:heartbeat', (payload) => {
    // payload: { ambulanceId, hospitalId, status, location }
    io.to(`hospital_${payload.hospitalId}`).emit('ambulance:statusUpdate', {
      ambulanceId: payload.ambulanceId,
      status: payload.status || 'On Duty',
      location: payload.location || null,
      lastSeen: new Date()
    });
    console.log(`💓 Ambulance heartbeat: ${payload.ambulanceId} - ${payload.status}`);
  });

  // Ambulance status change (manual)
  socket.on('ambulance:statusChange', (payload) => {
    // payload: { ambulanceId, hospitalId, status, location }
    io.to(`hospital_${payload.hospitalId}`).emit('ambulance:statusUpdate', {
      ambulanceId: payload.ambulanceId,
      status: payload.status,
      location: payload.location,
      lastSeen: new Date()
    });
    console.log(`🎛️ Ambulance status changed: ${payload.ambulanceId} → ${payload.status}`);
  });

  // Ambulance disconnect - updates status to "Offline"
  socket.on('ambulance:disconnect', (payload) => {
    // payload: { ambulanceId, hospitalId }
    io.to(`hospital_${payload.hospitalId}`).emit('ambulance:statusUpdate', {
      ambulanceId: payload.ambulanceId,
      status: 'Offline',
      location: null,
      lastSeen: new Date()
    });
    console.log(`📴 Ambulance disconnected: ${payload.ambulanceId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// load routes
app.use('/api/hospital', require('./routes/hospital')(io));
app.use('/api/beds', require('./routes/beds')(io));
app.use('/api/doctors', require('./routes/doctors')(io));
app.use('/api/ambulances', require('./routes/ambulances')(io));
app.use('/api/emergency', rateLimit({ windowMs: 60 * 1000, max: 60 }), require('./routes/emergency')(io));
app.use('/api/nurse', require('./routes/nurse')(io)); // Nurse routes
app.use('/api/auth', rateLimit({ windowMs: 60 * 1000, max: 20 }), require('./routes/auth')(io));
app.use('/api/admin', require('./routes/admin')); // Admin routes (no io needed yet, or pass if needed)
app.use('/api/master', require('./routes/master')); // Master CRUD routes
app.use('/api/reset-db', require('./routes/reset')(io));

// Global error handler - catches all errors
const { sendErrorResponse, handleValidationError, handleDuplicateKeyError, handleCastError } = require('./utils/errorHandler');

app.use((err, req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.error(`\n❌❌❌ [${timestamp}] ERROR in ${req.method} ${req.url}`);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);

  // Handle specific error types
  let error = err;
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'CastError') error = handleCastError(err);

  sendErrorResponse(error, req, res);
});

// Explicit root route handler
app.get('/', (req, res) => {
  const reactIndex = path.join(__dirname, 'public', 'react', 'index.html');
  const legacyIndex = path.join(__dirname, 'public', 'index.html');
  try {
    if (require('fs').existsSync(reactIndex)) {
      return res.sendFile(reactIndex);
    }
  } catch (e) {
    // ignore
  }
  return res.sendFile(legacyIndex);
});

// React SPA routes (served by the built UI when available)
app.get(['/public', '/reception', '/doctor', '/ambulance', '/nurse', '/admin'], (req, res) => {
  const reactIndex = path.join(__dirname, 'public', 'react', 'index.html');
  try {
    if (require('fs').existsSync(reactIndex)) {
      return res.sendFile(reactIndex);
    }
  } catch (e) {
    // ignore
  }
  return res.redirect('/');
});

// Generic React SPA fallback (deep links / refresh) when the UI is built.
// Only applies to GET requests that are not API/static asset routes.
app.get(/.*/, (req, res, next) => {
  try {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/uploads')) return next();
    if (req.path.startsWith('/react')) return next();
    if (req.path.includes('.') ) return next();

    const reactIndex = path.join(__dirname, 'public', 'react', 'index.html');
    if (require('fs').existsSync(reactIndex)) {
      return res.sendFile(reactIndex);
    }
  } catch (e) {
    // ignore
  }
  return next();
});

// 404 handler
app.use((req, res) => {
  console.log(`\n⚠️  404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

function startServer(port) {
  // Remove previous error listeners to avoid stacking on retries
  server.removeAllListeners('error');

  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`\n⚠️  Port ${port} is in use. Trying ${nextPort}...`);
      startServer(nextPort);
    } else {
      throw err;
    }
  });

  server.listen(port, () => {
    PORT = port;
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 RapidCare Server Started`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Logging: ENABLED (all requests will be logged)`);
    console.log('='.repeat(50) + '\n');
  });
}

startServer(PORT);



