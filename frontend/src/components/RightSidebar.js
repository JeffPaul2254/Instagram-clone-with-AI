import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function RightSidebar({ showSuggestionsOnly = false }) {
  const { user, logout } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [following, setFollowing] = useState({});
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    axios.get('/api/users/suggestions').then(r => setSuggestions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (showSwitchModal) {
      axios.get('/api/users/all').then(r => setAccounts(r.data)).catch(() => {});
    }
  }, [showSwitchModal]);

  const toggleFollow = async (userId) => {
    const prev = following[userId];
    setFollowing(f => ({ ...f, [userId]: !prev }));
    try {
      await axios.post(`/api/users/${userId}/follow`);
      toast.success(prev ? 'Unfollowed' : 'Followed!');
    } catch { setFollowing(f => ({ ...f, [userId]: prev })); }
  };

  const avatarUrl = user?.avatar ? `http://localhost:5000${user.avatar}` : null;
  const initials = (user?.username || 'U')[0].toUpperCase();

  return (
    <>
      <div style={S.sidebar}>
        {/* Current User row — hidden in suggestions-only mode */}
        {!showSuggestionsOnly && (
          <div style={S.userRow}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={S.avatar} />
                : <div style={S.avatarPh}>{initials}</div>
              }
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{user?.username}</div>
                <div style={{ color:'#8e8e8e', fontSize:12 }}>{user?.full_name || ''}</div>
              </div>
            </div>
            <button style={S.switchBtn} onClick={() => setShowSwitchModal(true)}>Switch</button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ marginTop: showSuggestionsOnly ? 0 : 16 }}>
            <div style={S.suggestionsHeader}>
              <span style={{ color:'#8e8e8e', fontWeight:600, fontSize:14 }}>Suggested for you</span>
              <button style={{ fontWeight:600, fontSize:12, background:'none', border:'none', cursor:'pointer' }}>See All</button>
            </div>
            {suggestions.map(s => {
              const sAvatarUrl = s.avatar ? `http://localhost:5000${s.avatar}` : null;
              const sInitials = (s.username || 'U')[0].toUpperCase();
              const isFollowing = following[s.id];
              return (
                <div key={s.id} style={S.suggRow}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                    {sAvatarUrl
                      ? <img src={sAvatarUrl} alt="" style={S.suggAvatar} />
                      : <div style={S.suggAvatarPh}>{sInitials}</div>
                    }
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.username}</div>
                      <div style={{ color:'#8e8e8e', fontSize:12 }}>
                        {s.followers_count > 0 ? `${s.followers_count} follower${s.followers_count !== 1 ? 's' : ''}` : 'New to Instagram'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleFollow(s.id)} style={{ ...S.followBtn, ...(isFollowing ? S.followingBtn : {}) }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!showSuggestionsOnly && (
          <div style={S.footer}>
            <div style={S.footerLinks}>
              {['About','Help','Press','API','Jobs','Privacy','Terms','Locations','Language'].map(l => (
                <a key={l} href="#" style={S.footerLink}>{l}</a>
              ))}
            </div>
            <div style={{ color:'#c7c7c7', fontSize:11, marginTop:16 }}>© 2024 INSTAGRAM CLONE</div>
          </div>
        )}
      </div>

      {/* Switch Account Modal */}
      {showSwitchModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowSwitchModal(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={{ fontWeight:600, fontSize:16 }}>Switch Account</span>
              <button onClick={() => setShowSwitchModal(false)} style={{ fontSize:22, background:'none', border:'none', cursor:'pointer', color:'#262626' }}>×</button>
            </div>
            <div style={{ padding:'8px 0' }}>
              {/* Current account */}
              <div style={S.accountRow}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={S.swAvatar} /> : <div style={S.swAvatarPh}>{initials}</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{user?.username}</div>
                  <div style={{ color:'#8e8e8e', fontSize:12 }}>{user?.full_name}</div>
                </div>
                <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid #0095f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#0095f6' }} />
                </div>
              </div>

              {/* Other accounts */}
              {accounts.filter(a => a.id !== user?.id).map(acc => {
                const aUrl = acc.avatar ? `http://localhost:5000${acc.avatar}` : null;
                const aInit = (acc.username || 'U')[0].toUpperCase();
                return (
                  <div key={acc.id} style={{ ...S.accountRow, cursor:'pointer' }}
                    onClick={() => { toast('Log out first, then log in as this account'); setShowSwitchModal(false); }}>
                    {aUrl ? <img src={aUrl} alt="" style={S.swAvatar} /> : <div style={{ ...S.swAvatarPh, background:'linear-gradient(135deg,#f093fb,#f5576c)' }}>{aInit}</div>}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{acc.username}</div>
                      <div style={{ color:'#8e8e8e', fontSize:12 }}>{acc.full_name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ height:1, background:'#efefef' }} />
            <button style={S.addBtn} onClick={() => { setShowSwitchModal(false); logout(); }}>+ Add account</button>
            <button style={S.logoutBtn} onClick={() => { setShowSwitchModal(false); logout(); }}>Log out</button>
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  sidebar: { width:'100%' },
  userRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
  avatar: { width:56, height:56, borderRadius:'50%', objectFit:'cover' },
  avatarPh: { width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#667eea,#764ba2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20, fontWeight:600, flexShrink:0 },
  switchBtn: { color:'#0095f6', fontWeight:700, fontSize:13, cursor:'pointer', background:'none', border:'none' },
  suggestionsHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  suggRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:8 },
  suggAvatar: { width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0 },
  suggAvatarPh: { width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:600, flexShrink:0 },
  followBtn: { color:'#0095f6', fontWeight:700, fontSize:13, cursor:'pointer', background:'none', border:'none', flexShrink:0 },
  followingBtn: { color:'#8e8e8e' },
  footer: { marginTop:24 },
  footerLinks: { display:'flex', flexWrap:'wrap', gap:'4px 8px' },
  footerLink: { color:'#c7c7c7', fontSize:11 },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center' },
  modal: { background:'#fff', borderRadius:12, width:400, maxWidth:'90vw', overflow:'hidden' },
  modalHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #dbdbdb' },
  accountRow: { display:'flex', alignItems:'center', gap:12, padding:'12px 20px' },
  swAvatar: { width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 },
  swAvatarPh: { width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#667eea,#764ba2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:600, flexShrink:0 },
  addBtn: { display:'block', width:'100%', padding:'14px 20px', textAlign:'left', fontWeight:600, fontSize:14, color:'#0095f6', cursor:'pointer', background:'none', border:'none' },
  logoutBtn: { display:'block', width:'100%', padding:'14px 20px', textAlign:'left', fontSize:14, color:'#262626', cursor:'pointer', background:'none', border:'none', marginBottom:8 },
};
