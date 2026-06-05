/**
 * pages/ForgotPasswordPage.js
 *
 * Mirrors the real Instagram "Find your account" page exactly as seen in
 * the screenshots:
 *
 *  Step 1 — Input screen
 *    • "Find your account" heading
 *    • Sub-text: "Enter your mobile number, username or email."
 *    • "Can't reset your password?" link (shows informational toast)
 *    • Single text input: "Mobile number, username or email"
 *    • Helper text: "You may receive WhatsApp and SMS notifications from us
 *                    for security and login purposes."
 *    • "Continue" button (disabled until input is non-empty)
 *    • Back arrow (top-left) → navigate(-1)
 *    • Full footer identical to LoginPage
 *
 *  Step 2 — "Email sent" modal (after successful POST)
 *    • Title: "Email sent"
 *    • Body: "We sent an email to {email} with a link to get back into
 *             your account."
 *    • Single "OK" button → navigate('/login')
 *
 * Security note: the backend always returns success regardless of whether
 * the account exists (anti-enumeration). The modal always shows.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

const FOOTER_LINKS = [
  'Meta','About','Blog','Jobs','Help','API','Privacy','Terms',
  'Locations','Popular','Instagram Lite','Meta AI','Threads',
  'Contact Uploading & Non-Users','Meta Verified',
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [contact, setContact]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sentTo, setSentTo]       = useState('');   // email shown in modal
  const [focused, setFocused]     = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  const canSubmit = contact.trim().length > 0;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { contact: contact.trim() });
      // Determine what to show in the modal — if it looks like an email, show it;
      // otherwise just show a generic "your registered email" message.
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
      setSentTo(isEmail ? contact.trim() : 'your registered email address');
      setShowModal(true);
    } catch {
      // Even on network error, show the modal — don't reveal whether account exists
      setSentTo('your registered email address');
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOK = () => {
    setShowModal(false);
    navigate('/login');
  };

  return (
    <div className="forgot-page">

      {/* ── Modal: Email sent ── */}
      {showModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && handleOK()}>
          <div className="forgot-modal">
            <div className="forgot-modal__close-row">
              <button className="forgot-modal__x" onClick={handleOK} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="forgot-modal__body">
              <h3 className="forgot-modal__title">Email sent</h3>
              <p className="forgot-modal__text">
                We sent an email to <strong>{sentTo}</strong> with a link to get
                back into your account.
              </p>
              <button className="forgot-modal__ok" onClick={handleOK}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="forgot-page__inner">

        {/* Back arrow */}
        <button
          className="forgot-back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
               strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <div className="forgot-card">

          <h1 className="forgot-card__heading">Find your account</h1>

          <p className="forgot-card__sub">
            Enter your mobile number, username or email.{' '}
            <button
              className="forgot-card__cant"
              onClick={() => alert("If you no longer have access to your email, you'll need to contact support.")}
            >
              Can't reset your password?
            </button>
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div className={`forgot-input-wrap${focused || contact ? ' is-active' : ''}`}>
              <label className="forgot-input-label">
                Mobile number, username or email
              </label>
              <div className="forgot-input-row">
                <input
                  type="text"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="forgot-input"
                  autoComplete="email"
                  autoFocus
                />
                {contact && (
                  <button
                    type="button"
                    className="forgot-input-clear"
                    onClick={() => setContact('')}
                    aria-label="Clear"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.707 12.293a1 1 0 01-1.414 1.414L12 13.414l-2.293 2.293a1 1 0 01-1.414-1.414L10.586 12 8.293 9.707a1 1 0 011.414-1.414L12 10.586l2.293-2.293a1 1 0 011.414 1.414L13.414 12l2.293 2.293z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <p className="forgot-card__helper">
              You may receive WhatsApp and SMS notifications from us for
              security and login purposes.
            </p>

            <button
              type="submit"
              className="forgot-submit"
              disabled={!canSubmit || loading}
            >
              {loading ? <span className="auth-btn-spinner" /> : 'Continue'}
            </button>
          </form>

        </div>

        {/* Footer links */}
        <footer className="auth-footer" style={{ marginTop: 'auto' }}>
          <div className="auth-footer__links">
            {FOOTER_LINKS.map(item => <span key={item}>{item}</span>)}
          </div>
          <p className="auth-footer__copy">
            English &nbsp;·&nbsp; © 2026 Instagram from Meta
          </p>
        </footer>

      </div>
    </div>
  );
}