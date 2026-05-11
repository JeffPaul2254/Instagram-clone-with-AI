import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const FB_OAUTH_URL =
  'https://www.facebook.com/login.php?next=https%3A%2F%2Fwww.facebook.com%2Foidc%2F%3Fapp_id%3D124024574287414%26redirect_uri%3Dhttps%253A%252F%252Fwww.instagram.com%252Faccounts%252Fsignupviafb%252F%26response_type%3Dcode%26scope%3Dopenid%2Bemail%2Bprofile%2Blinking%26state%3DATqVE3DzqfrscLStLaeZCe21JtIbUjlsLwK3aooXjVberzJxkFdRhqgAnJxWK-mUY_4-gctTRINF651ZimQ3IlpliuQKozdnlxHAsjl3mwHa4s1a1ebms9PsbNKIijNeoW5sEztPHPLY17iMlCkRojLYdq7bNw5uBvXMh1V0UsKKP7xw2mQNXlYPB8MCCKwHfdGdCEb-ADpGSahDyacZk5mlM-LTwIPoybzATVhWihVJ7ccRL82ZzVSB33o7IB3lnQtr7vbFEWWSHFyonMTrUUYUrg';

function IGIcon() {
  return (
    <svg className="auth-topbar__icon" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-a" cx="26%" cy="107%" r="142%">
          <stop offset="0%"   stopColor="#ffd600"/>
          <stop offset="25%"  stopColor="#ff7a00"/>
          <stop offset="50%"  stopColor="#ff0069"/>
          <stop offset="75%"  stopColor="#d300c5"/>
          <stop offset="100%" stopColor="#7638fa"/>
        </radialGradient>
      </defs>
      <rect width="80" height="80" rx="18" fill="url(#ig-a)"/>
      <rect x="13" y="13" width="54" height="54" rx="12" stroke="#fff" strokeWidth="4" fill="none"/>
      <circle cx="40" cy="40" r="14" stroke="#fff" strokeWidth="4" fill="none"/>
      <circle cx="56" cy="24" r="3.5" fill="#fff"/>
    </svg>
  );
}

function FBIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function MetaWordmark() {
  return (
    <svg className="auth-meta" height="18" viewBox="0 0 60 18" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-label="Meta">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M1.3 9c0-2.3 1.17-4.5 3.06-4.5.81 0 1.6.4 2.34 1.19C7.5 6.52 8.26 7.69 9 9c-.74 1.31-1.5 2.48-2.3 3.31C5.96 13.1 5.11 13.5 4.36 13.5 2.47 13.5 1.3 11.3 1.3 9zm5.73 0C8.1 7.1 9.16 5.4 10.35 5.4s2.25 1.7 2.25 3.6-1.06 3.6-2.25 3.6S7.03 10.9 7.03 9zm5.2-3.31C13.17 6.52 13.93 7.69 14.67 9c-.74 1.31-1.5 2.48-2.3 3.31.74.79 1.53 1.19 2.34 1.19 1.89 0 3.06-2.2 3.06-4.5s-1.17-4.5-3.06-4.5c-.81 0-1.6.4-2.34 1.19z"
        fill="#8e8e8e"/>
      <text x="21" y="13.5"
        fontFamily="-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif"
        fontSize="12" fontWeight="600" fill="#8e8e8e">Meta</text>
    </svg>
  );
}

function HeartOutline() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

const FOOTER_LINKS = [
  'Meta','About','Blog','Jobs','Help','API','Privacy','Terms',
  'Locations','Popular','Instagram Lite','Meta AI','Threads',
  'Contact Uploading & Non-Users','Meta Verified',
];

const IMG = '/uploads/signinpageimage.webp';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm]           = useState({ email: '', password: '' });
  const [loading, setLoading]     = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  const handle = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const canSubmit = form.email.trim().length > 0 && form.password.length > 0;

  const submit = async e => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fallback = grad => e => {
    e.target.style.display = 'none';
    e.target.parentElement.style.background = grad;
  };

  return (
    <div className="auth-page">

      <div className="auth-topbar">
        <IGIcon />
      </div>

      <div className="auth-main">

        {/* LEFT: headline + collage */}
        <div className="auth-left">
          <h1 className="auth-headline">
            See everyday moments from your <span className="auth-orange">close friends</span>.
          </h1>

          <div className="auth-collage">
            <div className="auth-collage__card auth-collage__card--back">
              <img src={IMG} alt=""
                style={{ objectPosition: 'left top' }}
                onError={fallback('linear-gradient(160deg,#833ab4,#fd1d1d,#fcb045)')} />
            </div>

            <div className="auth-collage__card auth-collage__card--mid">
              <img src={IMG} alt="Instagram stories preview"
                style={{ objectPosition: 'center top' }}
                onError={fallback('linear-gradient(160deg,#f77737,#e1306c)')} />
              <div className="auth-collage__overlay">
                <div className="auth-collage__progress">
                  <div className="auth-collage__progress-fill" />
                </div>
                <div className="auth-collage__heart-row">
                  <HeartOutline />
                </div>
              </div>
            </div>

            <div className="auth-collage__card auth-collage__card--front">
              <img src={IMG} alt=""
                style={{ objectPosition: 'right top' }}
                onError={fallback('linear-gradient(160deg,#405de6,#5851db,#833ab4)')} />
            </div>

            <div className="auth-sticker auth-sticker--emoji">
              <span>🐻</span><span>🐱</span><span>😍</span><span>💫</span>
            </div>
            <div className="auth-sticker auth-sticker--heart">❤️</div>
            <div className="auth-sticker auth-sticker--badge">⭐ Close Friends</div>
          </div>
        </div>

        <div className="auth-col-divider" />

        {/* RIGHT: form */}
        <div className="auth-right">
          <span className="auth-right__title">Log into Instagram</span>

          <form onSubmit={submit} style={{ width: '100%' }}>
            <input
              name="email"
              type="text"
              placeholder="Mobile number, username or email"
              value={form.email}
              onChange={handle}
              className="auth-input"
              autoComplete="username"
              required
            />

            <div className="auth-pw-wrap">
              <input
                name="password"
                type={pwVisible ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={handle}
                className="auth-input"
                autoComplete="current-password"
                required
              />
              {form.password.length > 0 && (
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setPwVisible(v => !v)}
                  tabIndex={-1}
                >
                  {pwVisible ? 'Hide' : 'Show'}
                </button>
              )}
            </div>

            <button
              type="submit"
              className="auth-login-btn"
              disabled={!canSubmit || loading}
            >
              {loading ? <span className="auth-btn-spinner" /> : 'Log in'}
            </button>
          </form>

          <button
            type="button"
            className="auth-forgot"
            onClick={() => toast('Password reset coming soon')}
          >
            Forgot password?
          </button>

          <div className="auth-form-gap" />

          <a href={FB_OAUTH_URL} className="auth-fb-btn" rel="noopener noreferrer">
            <FBIcon />
            Log in with Facebook
          </a>

          <Link to="/signup" className="auth-create-btn">
            Create new account
          </Link>

          <MetaWordmark />
        </div>
      </div>

      <footer className="auth-footer">
        <div className="auth-footer__links">
          {FOOTER_LINKS.map(item => <span key={item}>{item}</span>)}
        </div>
        <p className="auth-footer__copy">
          English &nbsp;·&nbsp; © 2026 Instagram from Meta
        </p>
      </footer>

    </div>
  );
}