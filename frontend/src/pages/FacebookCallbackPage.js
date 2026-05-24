/**
 * pages/FacebookCallbackPage.js
 *
 * This page mounts at /auth/facebook/callback.
 * The Railway backend redirects here after a successful (or failed)
 * Facebook OAuth exchange, passing data as URL search params:
 *
 *   Success:  /auth/facebook/callback?token=JWT&user=JSON
 *   Cancelled: backend → /login?error=facebook_cancelled  (never hits here)
 *   Error:     backend → /login?error=facebook_failed     (never hits here)
 *
 * Responsibilities:
 *  1. Read token + user from the URL
 *  2. Call login() from AuthContext to persist the session
 *  3. Immediately replace the URL (no history entry with token in it)
 *  4. Navigate to / on success, or /login?error=facebook_failed on any problem
 *
 * Security notes:
 *  - Runs over HTTPS in production (Vercel enforces this)
 *  - Token is in the URL for < 1 render cycle before we navigate away
 *  - replaceState removes the token from browser history immediately
 *  - No token is ever written to sessionStorage / localStorage by this page;
 *    AuthContext.login() handles persistence to localStorage
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function FacebookCallbackPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  // Use a ref so the effect runs exactly once even in React 18 Strict Mode
  const processed  = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const userRaw = params.get('user');

    // ── Immediately scrub the token from the URL ─────────────────────────────
    // replaceState removes ?token=...&user=... from browser history so the
    // JWT is never visible if the user clicks Back or shares the URL.
    window.history.replaceState({}, document.title, window.location.pathname);

    // ── Validate params ──────────────────────────────────────────────────────
    if (!token || !userRaw) {
      toast.error('Facebook login failed. Please try again.');
      navigate('/login?error=facebook_failed', { replace: true });
      return;
    }

    let user;
    try {
      user = JSON.parse(decodeURIComponent(userRaw));
    } catch {
      toast.error('Facebook login failed. Please try again.');
      navigate('/login?error=facebook_failed', { replace: true });
      return;
    }

    // ── Basic sanity check on the user object ────────────────────────────────
    if (!user || typeof user.id !== 'number' || !user.username) {
      toast.error('Facebook login failed. Please try again.');
      navigate('/login?error=facebook_failed', { replace: true });
      return;
    }

    // ── Persist session + navigate home ─────────────────────────────────────
    login(token, user);
    toast.success(`Welcome${user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋`);
    navigate('/', { replace: true });

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // This page is visible for < 1 frame in practice; show a minimal spinner
  // so there's no flash of unstyled content on slower connections.
  return (
    <div className="app-loading">
      <div className="spinner spinner--md" />
    </div>
  );
}
