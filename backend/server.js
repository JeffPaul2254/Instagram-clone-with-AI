// server.js
// Entry point. Sets up Express, connects middleware, mounts all routes, starts the server.
// No business logic lives here — it just wires everything together.

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { connectDB }              = require('./config/db');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const authRoutes         = require('./routes/auth');
const postRoutes         = require('./routes/posts');
const userRoutes         = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const messageRoutes      = require('./routes/messages');
const reelRoutes         = require('./routes/reels');

const app          = express();
const PORT         = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

// ── Global middleware ──────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ──────────────────────────────────────────────
app.use('/api/auth/login',  authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/',            apiLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/reels',         reelRoutes);

// ── Start ─────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
