/**
 * utils/axios.js
 *
 * Centralised axios instance.
 *
 * WHY: When deployed, relative paths like '/api/auth/login' resolve to the
 * Vercel frontend URL, not the Railway backend — causing 404s.
 * Setting baseURL here means every axios call automatically targets the
 * correct backend regardless of where the frontend is hosted.
 *
 * Set REACT_APP_API_URL in your Vercel project environment variables:
 *   REACT_APP_API_URL=https://your-railway-app.up.railway.app
 */

import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

// Attach JWT to every request (mirrors the interceptor in AuthContext.js)
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('ig_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default instance;