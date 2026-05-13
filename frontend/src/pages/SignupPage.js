/**
 * pages/SignupPage.js
 *
 * Multi-step signup flow matching real Instagram's design:
 *   Step 1 — Mobile/email  +  password  +  birthday  +  full name  +  username
 *   Step 2 — Confirm email (simulated — just shows success UI since backend
 *             doesn't have email verification; auto-proceeds after 1.5 s)
 *
 * Backend fields: email, password, full_name, username
 * Birthday is collected for UX fidelity but not sent (backend schema doesn't store it).
 *
 * Validation mirrors Instagram:
 *   - Email: basic format check
 *   - Password: ≥ 6 chars, shown strength indicator
 *   - Full name: 1–100 chars
 *   - Username: 1–30 chars, alphanumeric + . _ only, no spaces
 *
 * Uses shared axios instance → REACT_APP_API_URL baseURL (Railway backend).
 */

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';

// ── helpers ───────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validateUsername(v) {
  return /^[a-zA-Z0-9._]{1,30}$/.test(v.trim());
}
function passwordStrength(pw) {
  if (pw.length < 6)  return { level: 0, label: '' };
  if (pw.length < 8)  return { level: 1, label: 'Weak' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const hasSym   = /[^a-zA-Z0-9]/.test(pw);
  const score    = [hasUpper, hasNum, hasSym].filter(Boolean).length;
  if (score === 0) return { level: 1, label: 'Weak' };
  if (score === 1) return { level: 2, label: 'Fair' };
  if (score === 2) return { level: 3, label: 'Good' };
  return { level: 4, label: 'Strong' };
}

// ── icons ─────────────────────────────────────────────────────
function MetaWordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '16px auto 0', justifyContent: 'center' }}>
      <svg height="16" viewBox="0 0 60 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M1.3 9c0-2.3 1.17-4.5 3.06-4.5.81 0 1.6.4 2.34 1.19C7.5 6.52 8.26 7.69 9 9c-.74 1.31-1.5 2.48-2.3 3.31C5.96 13.1 5.11 13.5 4.36 13.5 2.47 13.5 1.3 11.3 1.3 9zm5.73 0C8.1 7.1 9.16 5.4 10.35 5.4s2.25 1.7 2.25 3.6-1.06 3.6-2.25 3.6S7.03 10.9 7.03 9zm5.2-3.31C13.17 6.52 13.93 7.69 14.67 9c-.74 1.31-1.5 2.48-2.3 3.31.74.79 1.53 1.19 2.34 1.19 1.89 0 3.06-2.2 3.06-4.5s-1.17-4.5-3.06-4.5c-.81 0-1.6.4-2.34 1.19z"
          fill="#8e8e8e"/>
        <text x="21" y="13.5"
          fontFamily="-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif"
          fontSize="12" fontWeight="600" fill="#8e8e8e">Meta</text>
      </svg>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── labelled input ────────────────────────────────────────────
function LabelInput({ label, name, type = 'text', value, onChange, error, hint, autoComplete, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="su-field">
      <label className="su-field__label" htmlFor={name}>{label}</label>
      <div className={`su-field__wrap ${focused ? 'su-field__wrap--focus' : ''} ${error ? 'su-field__wrap--error' : ''}`}>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          className="su-field__input"
        />
        {children}
      </div>
      {error && <p className="su-field__error">{error}</p>}
      {hint && !error && <p className="su-field__hint">{hint}</p>}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function SignupPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const timerRef     = useRef(null);

  // Cleanup timer on unmount so login() never fires on an unmounted component
  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  // Form values
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [dob,      setDob]      = useState({ month: '', day: '', year: '' });
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // UI state
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [step,     setStep]     = useState(1); // 1 = form, 2 = "confirming"

  const pwStr = passwordStrength(password);

  // ── client validation ───────────────────────────────────────
  function validate() {
    const e = {};
    if (!email.trim())              e.email    = 'Enter your mobile number or email.';
    else if (!validateEmail(email)) e.email    = 'Enter a valid email address.';
    if (!password)                  e.password = 'Enter a password.';
    else if (password.length < 6)   e.password = 'Use 6 or more characters.';
    if (!dob.month || !dob.day || !dob.year) e.dob = 'Enter your birthday.';
    if (!fullName.trim())           e.fullName = 'Enter your full name.';
    if (!username.trim())           e.username = 'Enter a username.';
    else if (!validateUsername(username)) e.username = 'Usernames can only use letters, numbers, underscores and periods.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── submit ──────────────────────────────────────────────────
  const submit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/signup', {
        email:     email.trim(),
        password,
        full_name: fullName.trim(),
        username:  username.trim().toLowerCase(),
      });
      // Show the "confirming" step briefly, then log in
      setStep(2);
      timerRef.current = setTimeout(() => {
        login(data.token, data.user);
        toast.success(`Welcome to Instagram, ${data.user.username}! 🎉`);
      }, 1500);
    } catch (err) {
      const errData = err.response?.data;
      const message = typeof errData === 'string'
        ? errData
        : errData?.error || errData?.message || 'Signup failed';
      // Map backend duplicate errors to the right field
      if (String(message).toLowerCase().includes('username')) {
        setErrors(p => ({ ...p, username: 'That username is taken. Try another.' }));
      } else if (String(message).toLowerCase().includes('email')) {
        setErrors(p => ({ ...p, email: 'Another account is using that email.' }));
      } else {
        toast.error(String(message));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── can submit ──────────────────────────────────────────────
  const canSubmit = email && password.length >= 6 &&
    dob.month && dob.day && dob.year &&
    fullName.trim() && username.trim() && !loading;

  // ── step 2: confirmation screen ─────────────────────────────
  if (step === 2) {
    return (
      <div className="su-page">
        <div className="su-card">
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div className="su-confirm-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '20px 0 8px' }}>Creating your account</h2>
            <p className="su-subtext">Just a moment…</p>
            <div className="su-spinner" style={{ margin: '24px auto 0' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── step 1: form ─────────────────────────────────────────────
  return (
    <div className="su-page">
      <div className="su-card">
        {/* Back arrow + Meta wordmark — matches reference */}
        <div className="su-topbar">
          <button
            type="button"
            className="su-back-btn"
            onClick={() => navigate('/login')}
            aria-label="Back to login"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <MetaWordmark />
        </div>

        <div style={{ padding: '0 24px' }}>
          <h1 className="su-title">Get started on Instagram</h1>
          <p className="su-subtext">Sign up to see photos and videos from your friends.</p>
          <form onSubmit={submit} noValidate>

            {/* Mobile / email */}
            <LabelInput
              label="Mobile number or email"
              name="email"
              type="text"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              error={errors.email}
              autoComplete="email"
            />
            <p className="su-notice">
              You may receive notifications from us.{' '}
              <button type="button" className="su-link">Learn why we ask for your contact information</button>
            </p>

            {/* Password */}
            <LabelInput
              label="Password"
              name="password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
              error={errors.password}
              autoComplete="new-password"
            >
              {password.length > 0 && (
                <button
                  type="button"
                  className="su-pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              )}
            </LabelInput>

            {/* Password strength bar */}
            {password.length > 0 && pwStr.level > 0 && (
              <div className="su-pw-strength">
                <div className="su-pw-strength__bars">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className={`su-pw-strength__bar ${i <= pwStr.level ? `su-pw-strength__bar--l${pwStr.level}` : ''}`}
                    />
                  ))}
                </div>
                <span className={`su-pw-strength__label su-pw-strength__label--l${pwStr.level}`}>
                  {pwStr.label}
                </span>
              </div>
            )}

            {/* Birthday */}
            <div className="su-field">
              <label className="su-field__label">
                Birthday <span className="su-help-icon" title="Providing your birthday helps make sure you get the right Instagram experience.">?</span>
              </label>
              <div className="su-dob-row">
                {/* Month */}
                <div className={`su-select-wrap ${errors.dob ? 'su-field__wrap--error' : ''}`}>
                  <select
                    value={dob.month}
                    onChange={e => { setDob(p => ({ ...p, month: e.target.value })); setErrors(p => ({ ...p, dob: '' })); }}
                    className="su-select"
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <ChevronDown />
                </div>
                {/* Day */}
                <div className={`su-select-wrap ${errors.dob ? 'su-field__wrap--error' : ''}`}>
                  <select
                    value={dob.day}
                    onChange={e => { setDob(p => ({ ...p, day: e.target.value })); setErrors(p => ({ ...p, dob: '' })); }}
                    className="su-select"
                  >
                    <option value="">Day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown />
                </div>
                {/* Year */}
                <div className={`su-select-wrap ${errors.dob ? 'su-field__wrap--error' : ''}`}>
                  <select
                    value={dob.year}
                    onChange={e => { setDob(p => ({ ...p, year: e.target.value })); setErrors(p => ({ ...p, dob: '' })); }}
                    className="su-select"
                  >
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown />
                </div>
              </div>
              {errors.dob && <p className="su-field__error">{errors.dob}</p>}
            </div>

            {/* Full name */}
            <LabelInput
              label="Name"
              name="full_name"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
              error={errors.fullName}
              autoComplete="name"
            >
              {fullName.trim().length > 0 && !errors.fullName && (
                <svg className="su-field__ok" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3897f0" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </LabelInput>

            {/* Username */}
            <LabelInput
              label="Username"
              name="username"
              value={username}
              onChange={e => {
                // Strip spaces automatically, lowercase
                setUsername(e.target.value.replace(/\s/g, '').toLowerCase());
                setErrors(p => ({ ...p, username: '' }));
              }}
              error={errors.username}
              hint={username && !errors.username ? `instagram.com/${username}` : undefined}
              autoComplete="username"
            >
              {username.trim().length > 0 && !errors.username && validateUsername(username) && (
                <svg className="su-field__ok" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3897f0" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </LabelInput>

            {/* Legal */}
            <p className="su-legal">
              People who use our service may have uploaded your contact information to Instagram.{' '}
              <button type="button" className="su-link">Learn more</button>.
            </p>
            <p className="su-legal">
              By tapping Submit, you agree to create an account and to Instagram's{' '}
              <button type="button" className="su-link">Terms</button>,{' '}
              <button type="button" className="su-link">Privacy Policy</button> and{' '}
              <button type="button" className="su-link">Cookies Policy</button>.
            </p>
            <p className="su-legal">
              The <button type="button" className="su-link">Privacy Policy</button> describes the ways we can use
              the information we collect when you create an account. For example, we use this information to provide,
              personalize and improve our products, including ads.
            </p>

            {/* Submit */}
            <button
              type="submit"
              className="su-submit-btn"
              disabled={!canSubmit}
            >
              {loading
                ? <span className="su-btn-spinner" />
                : 'Submit'
              }
            </button>

            {/* Already have account */}
            <Link to="/login" className="su-login-btn">
              I already have an account
            </Link>
          </form>
        </div>

        {/* Footer links */}
        <div className="su-footer">
          {['Meta','About','Blog','Jobs','Help','API','Privacy','Terms',
            'Locations','Popular','Instagram Lite','Threads','Contact Uploading & Non-Users','Meta Verified'
          ].map(l => <span key={l} className="su-footer__link">{l}</span>)}
          <div className="su-footer__copy">English &nbsp;·&nbsp; © 2026 Instagram from Meta</div>
        </div>
      </div>
    </div>
  );
}