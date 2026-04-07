/**
 * server.js
 *
 * CHANGES from v1:
 *  1. Added Socket.io alongside Express.
 *     WHY: replaces the polling loops in Navbar.js and MessagesPage.js.
 *     Instead of the client asking "any new messages?" every 3 s, the server
 *     now pushes events the instant something changes — zero wasted requests.
 *
 *  2. Socket authentication uses the same JWT that the REST API uses.
 *     A socket that cannot be verified is immediately disconnected.
 *
 *  3. The db module exports `emitToUser` so controllers can push events
 *     without importing the io instance themselves.
 *
 * Socket events pushed by the SERVER:
 *   'dm:new'              → new direct message   (payload: message row)
 *   'dm:count'            → updated unread DM count   (payload: { count })
 *   'notification:new'    → new notification          (payload: notification row)
 *   'notification:count'  → updated unread count      (payload: { count })
 *   'conversations:update'→ sidebar needs refresh     (payload: none)
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const http     = require('http');
const { Server } = require('socket.io');
const jwt      = require('jsonwebtoken');

const { connectDB, getDB, setIO } = require('./config/db');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const authRoutes         = require('./routes/auth');
const postRoutes         = require('./routes/posts');
const userRoutes         = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const messageRoutes      = require('./routes/messages');
const reelRoutes         = require('./routes/reels');
const storyRoutes        = require('./routes/stories');

const app          = express();
const server       = http.createServer(app);   // wrap Express so Socket.io can share the port
const PORT         = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

// ── Socket.io setup ────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: FRONTEND_URL, credentials: true },
});

// Map userId → Set of socketIds so we can reach a specific user
const userSockets = new Map();   // userId (number) → Set<socketId>

// Authenticate every socket connection with the JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorised'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;

  // Register socket in the per-user set
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);

  socket.on('disconnect', () => {
    userSockets.get(userId)?.delete(socket.id);
    if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
  });
});

/**
 * Push a Socket.io event to all active sockets for a given user.
 * Imported by controllers so they can notify users without knowing
 * about the io instance.
 */
function emitToUser(userId, event, payload) {
  const sids = userSockets.get(Number(userId));
  if (!sids) return;
  sids.forEach(sid => io.to(sid).emit(event, payload));
}

// Give the db module access to emitToUser so controllers can call it
setIO(emitToUser);

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
app.use('/api/stories',       storyRoutes);

// ── Start ─────────────────────────────────────────────────────
connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
