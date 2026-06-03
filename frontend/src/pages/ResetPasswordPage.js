/**
 * pages/ResetPasswordPage.js
 *
 * Mounts at /reset-password?token=<64-char-hex>
 *
 * Mirrors the real Instagram "Create A Strong Password" page exactly as seen
 * in screenshot 6:
 *
 *  • "Create A Strong Password" heading
 *  • Sub-text about password requirements
 *  • "New password" input
 *  • "New password, again" input (confirmation)
 *  • "Reset Password" button (disabled until both fields filled)
 *  • On success: calls login() from AuthContext → navigates to /
 *
 * Token is read from the URL ?token= param.
 * If the token is missing on mount, redirect immediately to /forgot-password.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { login }   = useAuth();

  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');
  const [pw1Vis,   setPw1Vis]     = useState(false);
  const [pw2Vis,   setPw2Vis]     = useState(false);

  const token = new URLSearchParams(location.search).get('token');

  // Guard: no token in URL → send back to forgot-password
  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset link. Please try again.');
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const canSubmit = password.length >= 6 && confirm.length > 0 && !loading;

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Your password must be at least 6 characters and should include a combination of numbers, letters and special characters (!$@%).');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords didn\'t match. Try again.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/reset-password', { token, password });
      // Backend returns a JWT + user object — log the user straight in
      login(data.token, data.user);
      toast.success('Password reset! Welcome back.');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please request a new reset link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;   // avoids flash before redirect

  return (
    <div className="reset-page">

      {/* Instagram logo top-left (matches screenshot 6) */}
      <div className="reset-page__logo">
        <img src="/instagram-logo.png" alt="Instagram" className="auth-topbar__icon" />
      </div>

      <div className="reset-card">
        <h2 className="reset-card__heading">Create A Strong Password</h2>

        <p className="reset-card__sub">
          Your password must be at least 6 characters and should include a
          combination of numbers, letters and special characters (!$@%).
        </p>

        {error && (
          <p className="reset-card__error">{error}</p>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>

          {/* New password */}
          <div className="reset-input-wrap">
            <input
              type={pw1Vis ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="reset-input"
              autoComplete="new-password"
              autoFocus
            />
            {password.length > 0 && (
              <button type="button" className="auth-pw-toggle"
                onClick={() => setPw1Vis(v => !v)}>
                {pw1Vis ? 'Hide' : 'Show'}
              </button>
            )}
          </div>

          {/* Confirm password */}
          <div className="reset-input-wrap">
            <input
              type={pw2Vis ? 'text' : 'password'}
              placeholder="New password, again"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              className="reset-input"
              autoComplete="new-password"
            />
            {confirm.length > 0 && (
              <button type="button" className="auth-pw-toggle"
                onClick={() => setPw2Vis(v => !v)}>
                {pw2Vis ? 'Hide' : 'Show'}
              </button>
            )}
          </div>

          <button
            type="submit"
            className="reset-submit"
            disabled={!canSubmit}
          >
            {loading ? <span className="auth-btn-spinner" /> : 'Reset Password'}
          </button>

        </form>
      </div>

      {/* Footer */}
      <footer className="auth-footer" style={{ marginTop: 'auto' }}>
        <div className="auth-footer__links">
          {['Meta','About','Blog','Jobs','Help','API','Privacy','Terms',
            'Locations','Popular','Instagram Lite','Meta AI','Threads',
            'Contact Uploading & Non-Users','Meta Verified']
            .map(item => <span key={item}>{item}</span>)}
        </div>
        <p className="auth-footer__copy">
          English &nbsp;·&nbsp; © 2026 Instagram from Meta
        </p>
      </footer>

    </div>
  );
}
