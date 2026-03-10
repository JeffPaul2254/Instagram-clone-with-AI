import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.right}>
        <div style={S.card}>
          <h1 style={S.logo}>Instagram</h1>
          <form onSubmit={submit} style={S.form}>
            <input name="email" type="text" placeholder="Username or email"
              value={form.email} onChange={handle} style={S.input} required />
            <input name="password" type="password" placeholder="Password"
              value={form.password} onChange={handle} style={S.input} required />
            <button type="submit" style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/* Centered OR divider */}
          <div style={{ display:'flex', alignItems:'center', margin:'18px 0' }}>
            <div style={{ flex:1, height:1, background:'#dbdbdb' }} />
            <span style={{ padding:'0 16px', color:'#8e8e8e', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>OR</span>
            <div style={{ flex:1, height:1, background:'#dbdbdb' }} />
          </div>

          <button style={S.fbBtn}>
            <svg width="18" height="18" fill="#385185" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            <span>Log in with Facebook</span>
          </button>
          <a href="#" style={S.forgotLink}>Forgot password?</a>
        </div>

        <div style={S.signupCard}>
          Don't have an account? <Link to="/signup" style={{ color:'#0095f6', fontWeight:600 }}>Sign up</Link>
        </div>

        <div style={{ textAlign:'center', color:'#8e8e8e', fontSize:12, marginTop:16 }}>
          Get the app.
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12 }}>
            <img src="https://www.instagram.com/static/images/appstore-install-badges/badge_ios_english-en.png/180ae7a0bcf7.png"
              alt="App Store" style={{ height:40 }} onError={e => e.target.style.display='none'} />
            <img src="https://www.instagram.com/static/images/appstore-install-badges/badge_android_english-en.png/e9cd846dc748.png"
              alt="Google Play" style={{ height:40 }} onError={e => e.target.style.display='none'} />
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#fafafa', gap:32, padding:20 },
  right: { width:'100%', maxWidth:350 },
  card: { background:'#fff', border:'1px solid #dbdbdb', borderRadius:1, padding:'40px 40px 24px', marginBottom:10, textAlign:'center' },
  logo: { fontFamily:"'Grand Hotel', cursive", fontSize:48, fontWeight:400, marginBottom:24, color:'#262626' },
  form: { display:'flex', flexDirection:'column', gap:6 },
  input: { padding:'9px 8px', background:'#fafafa', border:'1px solid #dbdbdb', borderRadius:3, fontSize:12, outline:'none', width:'100%' },
  btn: { background:'#0095f6', color:'#fff', padding:'7px 16px', borderRadius:8, fontWeight:700, fontSize:14, marginTop:8, transition:'opacity .2s', cursor:'pointer', border:'none' },
  fbBtn: { display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#385185', fontWeight:600, fontSize:14, cursor:'pointer', marginBottom:16, width:'100%', background:'none', border:'none' },
  forgotLink: { color:'#00376b', fontSize:12, display:'block' },
  signupCard: { background:'#fff', border:'1px solid #dbdbdb', borderRadius:1, padding:'16px', textAlign:'center', fontSize:14 },
};
