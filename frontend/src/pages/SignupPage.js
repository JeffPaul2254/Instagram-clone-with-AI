import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { login }  = useAuth();
  const [form, setForm]       = useState({ email: '', full_name: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/signup', form);
      login(data.token, data.user);
      toast.success('Account created! Welcome to Instagram Clone 🎉');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page auth-page--col">
      <div className="auth-card auth-card--signup">
        <h1 className="auth-card__logo">Instagram</h1>
        <p className="text-muted font-semi" style={{ fontSize: 17, lineHeight: '20px', marginBottom: 20, padding: '0 20px' }}>
          Sign up to see photos and videos from your friends.
        </p>

        <button className="auth-card__fb-btn auth-card__fb-fill">
          <svg width="18" height="18" fill="#fff" viewBox="0 0 24 24">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Log in with Facebook
        </button>

        <div className="auth-card__divider">
          <div className="auth-card__div-line" />
          <span className="auth-card__div-text">OR</span>
          <div className="auth-card__div-line" />
        </div>

        <form onSubmit={submit} className="auth-card__form">
          <input name="email"     type="email"    placeholder="Mobile Number or Email" value={form.email}     onChange={handle} className="auth-card__input" required />
          <input name="full_name" type="text"     placeholder="Full Name"              value={form.full_name} onChange={handle} className="auth-card__input" required />
          <input name="username"  type="text"     placeholder="Username"               value={form.username}  onChange={handle} className="auth-card__input" required />
          <input name="password"  type="password" placeholder="Password"               value={form.password}  onChange={handle} className="auth-card__input" required />

          <p className="text-muted" style={{ fontSize: 12, lineHeight: '16px', margin: '8px 0' }}>
            By signing up, you agree to our{' '}
            <a href="#" style={{ color: 'var(--accent-dark)', fontWeight: 600 }}>Terms</a>,{' '}
            <a href="#" style={{ color: 'var(--accent-dark)', fontWeight: 600 }}>Privacy Policy</a> and{' '}
            <a href="#" style={{ color: 'var(--accent-dark)', fontWeight: 600 }}>Cookies Policy</a>.
          </p>

          <button type="submit" className="auth-card__btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>

      <div className="auth-login-card">
        Have an account? <Link to="/login" className="text-accent font-bold">Log in</Link>
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
  );
}
