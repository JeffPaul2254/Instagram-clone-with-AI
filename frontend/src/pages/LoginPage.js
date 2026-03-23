import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login }  = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div style={{ width: '100%', maxWidth: 350 }}>
        <div className="auth-card auth-card--login">
          <h1 className="auth-card__logo">Instagram</h1>
          <form onSubmit={submit} className="auth-card__form">
            <input name="email" type="text" placeholder="Username or email"
              value={form.email} onChange={handle} className="auth-card__input" required />
            <input name="password" type="password" placeholder="Password"
              value={form.password} onChange={handle} className="auth-card__input" required />
            <button type="submit" className="auth-card__btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="auth-card__divider">
            <div className="auth-card__div-line" />
            <span className="auth-card__div-text">OR</span>
            <div className="auth-card__div-line" />
          </div>

          <button className="auth-card__fb-btn">
            <svg width="18" height="18" fill="#385185" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            <span>Log in with Facebook</span>
          </button>
          <a href="#" className="auth-card__forgot">Forgot password?</a>
        </div>

        <div className="auth-login-card">
          Don't have an account? <Link to="/signup" className="text-accent font-bold">Sign up</Link>
        </div>

        <div className="auth-app-badges">
          Get the app.
          <div className="auth-app-badges__row">
            <img src="https://www.instagram.com/static/images/appstore-install-badges/badge_ios_english-en.png/180ae7a0bcf7.png"
              alt="App Store" style={{ height: 40 }} onError={e => e.target.style.display = 'none'} />
            <img src="https://www.instagram.com/static/images/appstore-install-badges/badge_android_english-en.png/e9cd846dc748.png"
              alt="Google Play" style={{ height: 40 }} onError={e => e.target.style.display = 'none'} />
          </div>
        </div>
      </div>
    </div>
  );
}
