import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', full_name: '', username: '', password: '' });
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Instagram</h1>
        <p style={styles.tagline}>Sign up to see photos and videos from your friends.</p>

        <button style={styles.fbBtn}>
          <svg width="18" height="18" fill="#fff" viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
          Log in with Facebook
        </button>

        <div style={styles.divider}>
          <div style={styles.line} />
          <span style={{ color: '#8e8e8e', fontSize: 13, fontWeight: 600, padding: '0 16px' }}>OR</span>
          <div style={styles.line} />
        </div>

        <form onSubmit={submit} style={styles.form}>
          <input name="email" type="email" placeholder="Mobile Number or Email" value={form.email} onChange={handle} style={styles.input} required />
          <input name="full_name" type="text" placeholder="Full Name" value={form.full_name} onChange={handle} style={styles.input} required />
          <input name="username" type="text" placeholder="Username" value={form.username} onChange={handle} style={styles.input} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handle} style={styles.input} required />

          <p style={styles.terms}>
            By signing up, you agree to our <a href="#" style={styles.link}>Terms</a>, <a href="#" style={styles.link}>Privacy Policy</a> and <a href="#" style={styles.link}>Cookies Policy</a>.
          </p>

          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>

      <div style={styles.loginCard}>
        Have an account? <Link to="/login" style={{ color: '#0095f6', fontWeight: 600 }}>Log in</Link>
      </div>

      <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: 12, marginTop: 16 }}>
        Get the app.
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <img src="https://www.instagram.com/static/images/appstore-install-badges/badge_ios_english-en.png/180ae7a0bcf7.png"
            alt="App Store" style={{ height: 40 }} onError={e => e.target.style.display='none'} />
          <img src="https://www.instagram.com/static/images/appstore-install-badges/badge_android_english-en.png/e9cd846dc748.png"
            alt="Google Play" style={{ height: 40 }} onError={e => e.target.style.display='none'} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fafafa', padding: 20 },
  card: { background: '#fff', border: '1px solid #dbdbdb', borderRadius: 1, padding: '40px 40px 24px', width: '100%', maxWidth: 350, textAlign: 'center', marginBottom: 10 },
  logo: { fontFamily: "'Grand Hotel', cursive", fontSize: 48, fontWeight: 400, marginBottom: 8, color: '#262626' },
  tagline: { fontSize: 17, fontWeight: 600, color: '#8e8e8e', lineHeight: '20px', marginBottom: 20, padding: '0 20px' },
  fbBtn: { background: '#0095f6', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none' },
  divider: { display: 'flex', alignItems: 'center', margin: '16px 0' },
  line: { flex: 1, height: 1, background: '#dbdbdb' },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  input: { padding: '9px 8px', background: '#fafafa', border: '1px solid #dbdbdb', borderRadius: 3, fontSize: 12, outline: 'none', width: '100%' },
  terms: { fontSize: 12, color: '#8e8e8e', lineHeight: '16px', margin: '8px 0' },
  link: { color: '#00376b', fontWeight: 600 },
  btn: { background: '#0095f6', color: '#fff', padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', transition: 'opacity .2s' },
  loginCard: { background: '#fff', border: '1px solid #dbdbdb', borderRadius: 1, padding: '16px', textAlign: 'center', fontSize: 14, width: '100%', maxWidth: 350 },
};
