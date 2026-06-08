/**
 * pages/ResetLoginPage.js
 *
 * Handles the "Log in as username" button from the password reset email.
 * Mounts at /auth/reset-login?token=<64-char-hex>
 *
 * Flow:
 *  1. Read token from URL
 *  2. POST to /api/auth/reset-login with the token
 *  3. Backend validates token, marks it used, returns JWT + user
 *  4. Call login() from AuthContext → user is instantly logged in
 *  5. Navigate to / (home feed)
 *
 * No form shown — this page is entirely automatic.
 * Shows a loading spinner while the request is in flight.
 * Shows an error with a link back to /forgot-password if token is invalid.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ResetLoginPage() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { login }      = useAuth();
  const [error, setError] = useState('');
  const processed      = useRef(false); // prevent double-fire in React Strict Mode

  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    // Guard: no token in URL → send back immediately
    if (!token) {
      toast.error('Invalid login link. Please request a new one.');
      navigate('/forgot-password', { replace: true });
      return;
    }

    // Prevent double-fire in React 18 Strict Mode
    if (processed.current) return;
    processed.current = true;

    const doLogin = async () => {
      try {
        const { data } = await axios.get('/api/auth/reset-login', {
          params: { token }
        });
        login(data.token, data.user);
        const firstName = data.user?.full_name?.split(' ')[0] || data.user?.username;
        toast.success(`Welcome back, ${firstName}!`);
        navigate('/', { replace: true });
      } catch (err) {
        const msg = err.response?.data?.error
          || 'This login link is invalid or has expired.';
        setError(msg);
      }
    };

    doLogin();
  }, [token, login, navigate]);

  // Error state — show message with option to request new link
  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        background: 'var(--bg)', padding: '20px'
      }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '40px', maxWidth: '400px',
          width: '100%', textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔗</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px',
            fontWeight: '700', margin: '0 0 12px' }}>
            Link expired
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px',
            lineHeight: '1.6', margin: '0 0 24px' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/forgot-password', { replace: true })}
            style={{
              width: '100%', padding: '12px', borderRadius: '50px',
              border: 'none', background: '#0866ff', color: '#fff',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Request a new link
          </button>
          <button
            onClick={() => navigate('/login', { replace: true })}
            style={{
              width: '100%', padding: '12px', borderRadius: '50px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px'
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // Loading state — shown while API call is in flight
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner--md" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Logging you in...
        </p>
      </div>
    </div>
  );
}
