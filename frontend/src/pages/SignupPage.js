/**
 * pages/SignupPage.js — Instagram-style signup
 * Floating placeholder labels, eye icon, submit always active,
 * inline error messages matching Instagram, real external links.
 */

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';

// ── constants ─────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

const LINKS = {
  learnWhy:      'https://help.instagram.com/574047304429005',
  learnMore:     'https://www.facebook.com/help/instagram/261704639352628',
  terms:         'https://help.instagram.com/581066165581870',
  privacyPolicy: 'https://privacycenter.instagram.com/policy',
  cookies:       'https://privacycenter.instagram.com/policies/cookies/',
};

// ── helpers ───────────────────────────────────────────────────
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validateUsername(v) {
  return /^[a-zA-Z0-9._]{1,30}$/.test(v.trim());
}
function isWeakPassword(pw) {
  if (pw.length < 6) return true;
  if (/^(.)\1+$/.test(pw)) return true;
  const weak = ['password','123456','qwerty','abc123','111111','000000','iloveyou','admin','123456789'];
  return weak.includes(pw.toLowerCase());
}

// ── EyeIcon ───────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open
    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>;
}

// ── MetaWordmark ──────────────────────────────────────────────
function MetaWordmark() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
      <svg height="16" viewBox="0 0 60 18" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M1.3 9c0-2.3 1.17-4.5 3.06-4.5.81 0 1.6.4 2.34 1.19C7.5 6.52 8.26 7.69 9 9c-.74 1.31-1.5 2.48-2.3 3.31C5.96 13.1 5.11 13.5 4.36 13.5 2.47 13.5 1.3 11.3 1.3 9zm5.73 0C8.1 7.1 9.16 5.4 10.35 5.4s2.25 1.7 2.25 3.6-1.06 3.6-2.25 3.6S7.03 10.9 7.03 9zm5.2-3.31C13.17 6.52 13.93 7.69 14.67 9c-.74 1.31-1.5 2.48-2.3 3.31.74.79 1.53 1.19 2.34 1.19 1.89 0 3.06-2.2 3.06-4.5s-1.17-4.5-3.06-4.5c-.81 0-1.6.4-2.34 1.19z"
          fill="#8e8e8e"/>
        <text x="21" y="13.5" fontFamily="-apple-system,sans-serif" fontSize="12" fontWeight="600" fill="#8e8e8e">Meta</text>
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

// ── ErrorRow ──────────────────────────────────────────────────
function ErrorRow({ msg }) {
  if (!msg) return null;
  return (
    <p className="su-field__error">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </p>
  );
}

// ── FloatInput — floating placeholder ────────────────────────
function FloatInput({ label, name, type='text', value, onChange, error, autoComplete, children }) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="su-field">
      <div className={`su-float-wrap${focused ? ' su-float-wrap--focus' : ''}${error ? ' su-float-wrap--error' : ''}`}>
        <label className={`su-float-label${floated ? ' su-float-label--up' : ''}`} htmlFor={name}>
          {label}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          className="su-float-input"
        />
        {children}
      </div>
      <ErrorRow msg={error} />
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function SignupPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const timerRef   = useRef(null);

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [dob,      setDob]      = useState({ month:'', day:'', year:'' });
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [step,     setStep]     = useState(1);

  function validate() {
    const e = {};
    if (!email.trim() || !validateEmail(email))
      e.email = 'Please enter a valid mobile number or email address.';
    if (!password)
      e.password = 'Enter a combination of at least six numbers, letters and punctuation marks (like ! and &).';
    else if (password.length < 6)
      e.password = 'Enter a combination of at least six numbers, letters and punctuation marks (like ! and &).';
    else if (isWeakPassword(password))
      e.password = 'This password is too easy to guess. Please create a new one.';
    if (!dob.month || !dob.day || !dob.year)
      e.dob = 'Select your birthday. You can change who can see this later.';
    if (!fullName.trim())
      e.fullName = 'Enter your full name.';
    if (!username.trim())
      e.username = 'Please select a username for your account.';
    else if (!validateUsername(username))
      e.username = 'Usernames can only use letters, numbers, underscores and periods.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

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
      setStep(2);
      timerRef.current = setTimeout(() => {
        login(data.token, data.user);
        toast.success(`Welcome to Instagram, ${data.user.username}! 🎉`);
      }, 1500);
    } catch (err) {
      const errData = err.response?.data;
      const message = typeof errData === 'string'
        ? errData : errData?.error || errData?.message || 'Signup failed';
      const m = String(message).toLowerCase();
      if (m === 'username already taken' || (m.includes('username') && !m.includes('email')))
        setErrors(p => ({ ...p, username:'That username is taken. Try another.' }));
      else if (m === 'email already taken' || (m.includes('email') && !m.includes('username')))
        setErrors(p => ({ ...p, email:'Another account is using that email.' }));
      else if (m.includes('username') && m.includes('email'))
        setErrors(p => ({ ...p, username:'That username is taken. Try another.', email:'Another account is using that email.' }));
      else
        toast.error(String(message));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: confirming ────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="su-page">
        <div className="su-card">
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div className="su-confirm-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ fontSize:20, fontWeight:700, margin:'20px 0 8px', color:'#000' }}>Creating your account</h2>
            <p className="su-subtext">Just a moment…</p>
            <div className="su-spinner" style={{ margin:'24px auto 0' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: form ──────────────────────────────────────────────
  return (
    <div className="su-page">
      <div className="su-card">

        <div className="su-topbar">
          <button type="button" className="su-back-btn" onClick={() => navigate('/login')} aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <MetaWordmark />
        </div>

        <div style={{ padding:'0 24px 24px' }}>
          <h1 className="su-title">Get started on Instagram</h1>
          <p className="su-subtext">Sign up to see photos and videos from your friends.</p>

          <form onSubmit={submit} noValidate>

            {/* Email */}
            <FloatInput
              label="Mobile number or email"
              name="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email:'' })); }}
              error={errors.email}
              autoComplete="email"
            />
            <p className="su-notice">
              You may receive notifications from us.{' '}
              <a href={LINKS.learnWhy} target="_blank" rel="noopener noreferrer" className="su-link">
                Learn why we ask for your contact information
              </a>
            </p>

            {/* Password */}
            <FloatInput
              label="Password"
              name="password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password:'' })); }}
              error={errors.password}
              autoComplete="new-password"
            >
              {password.length > 0 && (
                <button type="button" className="su-eye-btn"
                  onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <EyeIcon open={showPw} />
                </button>
              )}
            </FloatInput>

            {/* Birthday */}
            <div className="su-field">
              <div className="su-field__label" style={{ marginBottom:6 }}>
                Birthday{' '}
                <span className="su-help-icon"
                  title="Providing your birthday helps make sure you get the right Instagram experience.">?</span>
              </div>
              <div className="su-dob-row">
                {[
                  { key:'month', placeholder:'Month', options: MONTHS.map((m,i) => ({ label:m, value:i+1 })) },
                  { key:'day',   placeholder:'Day',   options: DAYS.map(d => ({ label:d, value:d })) },
                  { key:'year',  placeholder:'Year',  options: YEARS.map(y => ({ label:y, value:y })) },
                ].map(({ key, placeholder, options }) => (
                  <div key={key} className={`su-select-wrap${errors.dob ? ' su-float-wrap--error' : ''}`}>
                    <select
                      value={dob[key]}
                      onChange={ev => { setDob(p => ({ ...p, [key]:ev.target.value })); setErrors(p => ({ ...p, dob:'' })); }}
                      className="su-select"
                    >
                      <option value="">{placeholder}</option>
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown />
                  </div>
                ))}
              </div>
              <ErrorRow msg={errors.dob} />
            </div>

            {/* Name */}
            <FloatInput
              label="Full name"
              name="full_name"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName:'' })); }}
              error={errors.fullName}
              autoComplete="name"
            />

            {/* Username */}
            <FloatInput
              label="Username"
              name="username"
              value={username}
              onChange={e => { setUsername(e.target.value.replace(/\s/g,'').toLowerCase()); setErrors(p => ({ ...p, username:'' })); }}
              error={errors.username}
              autoComplete="username"
            />

            {/* Legal */}
            <p className="su-legal">
              People who use our service may have uploaded your contact information to Instagram.{' '}
              <a href={LINKS.learnMore} target="_blank" rel="noopener noreferrer" className="su-link">Learn more</a>.
            </p>
            <p className="su-legal">
              By tapping Submit, you agree to create an account and to Instagram's{' '}
              <a href={LINKS.terms} target="_blank" rel="noopener noreferrer" className="su-link">Terms</a>,{' '}
              <a href={LINKS.privacyPolicy} target="_blank" rel="noopener noreferrer" className="su-link">Privacy Policy</a> and{' '}
              <a href={LINKS.cookies} target="_blank" rel="noopener noreferrer" className="su-link">Cookies Policy</a>.
            </p>
            <p className="su-legal">
              The{' '}
              <a href={LINKS.privacyPolicy} target="_blank" rel="noopener noreferrer" className="su-link">Privacy Policy</a>{' '}
              describes the ways we can use the information we collect when you create an account.
              For example, we use this information to provide, personalize and improve our products, including ads.
            </p>

            {/* Submit — always enabled; validation fires on click */}
            <button type="submit" className="su-submit-btn" disabled={loading}>
              {loading ? <span className="su-btn-spinner" /> : 'Submit'}
            </button>

            <Link to="/login" className="su-login-btn">I already have an account</Link>
          </form>
        </div>

        <div className="su-footer">
          {['Meta','About','Blog','Jobs','Help','API','Privacy','Terms',
            'Locations','Popular','Instagram Lite','Threads',
            'Contact Uploading & Non-Users','Meta Verified'
          ].map(l => <span key={l} className="su-footer__link">{l}</span>)}
          <div className="su-footer__copy">English &nbsp;·&nbsp; © 2026 Instagram from Meta</div>
        </div>
      </div>
    </div>
  );
}