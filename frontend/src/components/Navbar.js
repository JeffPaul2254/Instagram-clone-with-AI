import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import NotificationsPanel from './NotificationsPanel';
import SearchPanel from './SearchPanel';

export default function Navbar({ onNewPost }) {
  const { user, logout } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const fileRef = useRef();
  const hoverTimer = useRef();

  const avatarUrl = user?.avatar ? `http://localhost:5000${user.avatar}` : null;
  const initials = (user?.username || 'U')[0].toUpperCase();

  // Poll unread notification count
  useEffect(() => {
    const fetchCount = () => {
      axios.get('/api/notifications/count').then(r => setUnreadCount(r.data.count)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showAccountSwitch) {
      axios.get('/api/users/all').then(r => setAccounts(r.data)).catch(() => {});
    }
  }, [showAccountSwitch]);

  const handleMouseEnter = () => {
    if (showNotifications || showSearch) return;
    hoverTimer.current = setTimeout(() => setExpanded(true), 150);
  };
  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    if (!showNotifications && !showSearch) setExpanded(false);
    setShowMore(false);
  };

  const openSearch = () => { setShowSearch(true); setShowNotifications(false); setExpanded(false); };
  const closeSearch = () => setShowSearch(false);
  const openNotifications = () => {
    setShowNotifications(true);
    setExpanded(false);
    setUnreadCount(0);
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submitPost = async () => {
    if (!image && !caption.trim()) return toast.error('Add a photo or caption');
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('caption', caption);
      if (image) fd.append('image', image);
      const { data } = await axios.post('/api/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onNewPost(data);
      toast.success('Post shared! ✨');
      closeCreate();
    } catch { toast.error('Failed to post'); }
    finally { setPosting(false); }
  };

  const closeCreate = () => { setShowCreate(false); setCaption(''); setImage(null); setPreview(null); };

  const navItems = [
    {
      label: 'Home',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9.005 16.545a2.997 2.997 0 012.997-2.997A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z"/></svg>
    },
    {
      label: 'Search', onClick: openSearch,
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    },
    {
      label: 'Explore',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    },
    {
      label: 'Reels',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    },
    {
      label: 'Messages',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    },
    {
      label: 'Notifications',
      onClick: openNotifications,
      icon: (
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill={showNotifications ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {unreadCount > 0 && (
            <div style={{ position:'absolute', top:-4, right:-4, background:'#ed4956', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      )
    },
    {
      label: 'Create',
      onClick: () => setShowCreate(true),
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>
    },
  ];

  return (
    <>
      <nav
        style={{ ...S.nav, width: expanded ? 244 : 72 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Logo */}
        <div style={S.logoWrap}>
          {expanded
            ? <span style={S.logoText}>Instagram</span>
            : <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
          }
        </div>

        {/* Nav items */}
        <div style={S.navItems}>
          {navItems.map(item => (
            <button key={item.label} style={{ ...S.navItem, fontWeight: item.label === 'Notifications' && showNotifications ? 700 : 400 }}
              onClick={item.onClick} title={item.label}>
              <span style={S.iconWrap}>{item.icon}</span>
              {expanded && <span style={S.navLabel}>{item.label}</span>}
            </button>
          ))}

          {/* Profile */}
          <button style={S.navItem} title="Profile">
            <span style={S.iconWrap}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width:26,height:26,borderRadius:'50%',objectFit:'cover' }} />
                : <div style={{ width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:600 }}>{initials}</div>
              }
            </span>
            {expanded && <span style={S.navLabel}>Profile</span>}
          </button>
        </div>

        {/* More */}
        <div style={{ padding:'0 8px 16px', position:'relative' }}>
          <button style={S.navItem} onClick={() => setShowMore(p => !p)} title="More">
            <span style={S.iconWrap}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </span>
            {expanded && <span style={S.navLabel}>More</span>}
          </button>
          {showMore && (
            <div style={S.moreMenu}>
              <div style={S.moreItem} onClick={() => { setShowMore(false); setShowAccountSwitch(true); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                <span>Switch Account</span>
              </div>
              <div style={{ height:1, background:'#efefef' }} />
              <div style={S.moreItem} onClick={logout}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                <span>Log out</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Search Panel */}
      {showSearch && <SearchPanel onClose={closeSearch} />}

      {/* Notifications Panel */}
      {showNotifications && <NotificationsPanel onClose={closeNotifications} />}

      {/* Account Switcher Modal */}
      {showAccountSwitch && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowAccountSwitch(false)}>
          <div style={S.switchModal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #dbdbdb' }}>
              <span style={{ fontWeight:600, fontSize:16 }}>Switch Account</span>
              <button onClick={() => setShowAccountSwitch(false)} style={{ fontSize:22, color:'#262626', lineHeight:1, background:'none', border:'none', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:'8px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px' }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={S.swAvatar} /> : <div style={S.swAvatarPh}>{initials}</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{user?.username}</div>
                  <div style={{ color:'#8e8e8e', fontSize:12 }}>{user?.full_name}</div>
                </div>
                <div style={{ width:20,height:20,borderRadius:'50%',border:'2px solid #0095f6',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',background:'#0095f6' }} />
                </div>
              </div>
              {accounts.filter(a => a.id !== user?.id).map(acc => {
                const aUrl = acc.avatar ? `http://localhost:5000${acc.avatar}` : null;
                const aInit = (acc.username||'U')[0].toUpperCase();
                return (
                  <div key={acc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', cursor:'pointer' }}
                    onClick={() => { toast('Log out first, then log in as this account'); setShowAccountSwitch(false); }}>
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
            <button style={{ display:'block', width:'100%', padding:'14px 20px', textAlign:'left', fontWeight:600, fontSize:14, color:'#0095f6', cursor:'pointer', background:'none', border:'none' }}
              onClick={() => { setShowAccountSwitch(false); logout(); }}>+ Add account</button>
            <button style={{ display:'block', width:'100%', padding:'14px 20px', textAlign:'left', fontSize:14, color:'#262626', cursor:'pointer', background:'none', border:'none', marginBottom:8 }}
              onClick={() => { setShowAccountSwitch(false); logout(); }}>Log out</button>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreate && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && closeCreate()}>
          <div style={S.modal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid #dbdbdb' }}>
              <span style={{ fontSize:16, fontWeight:600 }}>Create new post</span>
              <button onClick={closeCreate} style={{ fontSize:24, lineHeight:1, color:'#262626', background:'none', border:'none', cursor:'pointer' }}>×</button>
            </div>
            {!preview ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', cursor:'pointer', minHeight:400 }} onClick={() => fileRef.current.click()}>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#262626" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p style={{ marginTop:16, fontSize:20, color:'#262626' }}>Drag photos and videos here</p>
                <button style={{ marginTop:20, background:'#0095f6', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:700, cursor:'pointer', fontSize:14 }}>Select from computer</button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
              </div>
            ) : (
              <div style={{ display:'flex', flex:1, minHeight:400 }}>
                <img src={preview} alt="preview" style={{ width:500, height:450, objectFit:'cover', borderRight:'1px solid #dbdbdb', flexShrink:0 }} />
                <div style={{ flex:1, padding:16, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                    {avatarUrl ? <img src={avatarUrl} alt="" style={{ width:32,height:32,borderRadius:'50%',objectFit:'cover' }} /> : <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13,fontWeight:600 }}>{initials}</div>}
                    <span style={{ fontWeight:600, fontSize:14 }}>{user?.username}</span>
                  </div>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..." style={{ width:'100%', flex:1, border:'none', outline:'none', resize:'none', fontSize:14, lineHeight:1.6, minHeight:200 }} maxLength={2200} />
                  <div style={{ fontSize:12, color:'#8e8e8e', textAlign:'right' }}>{caption.length}/2,200</div>
                  <button onClick={submitPost} style={{ background:'#0095f6', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:700, cursor:'pointer', fontSize:14, marginTop:12, alignSelf:'flex-end', opacity: posting ? 0.7 : 1 }} disabled={posting}>
                    {posting ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}

const S = {
  nav: { position:'fixed', top:0, left:0, bottom:0, background:'#fff', borderRight:'1px solid #dbdbdb', zIndex:1100, display:'flex', flexDirection:'column', padding:'8px 0', transition:'width 0.2s ease', overflow:'hidden' },
  logoWrap: { padding:'16px 20px 24px', minHeight:60, display:'flex', alignItems:'center' },
  logoText: { fontFamily:"'Grand Hotel', cursive", fontSize:28, color:'#262626', whiteSpace:'nowrap' },
  navItems: { display:'flex', flexDirection:'column', flex:1, gap:2, padding:'0 8px' },
  navItem: { display:'flex', alignItems:'center', gap:16, padding:'12px', borderRadius:8, color:'#262626', transition:'background .15s', cursor:'pointer', border:'none', background:'none', width:'100%', textAlign:'left', whiteSpace:'nowrap' },
  iconWrap: { display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, width:24, height:24 },
  navLabel: { fontSize:16, fontWeight:400, color:'#262626' },
  moreMenu: { position:'absolute', bottom:'100%', left:0, background:'#fff', border:'1px solid #dbdbdb', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.12)', minWidth:220, zIndex:100, overflow:'hidden', marginBottom:4 },
  moreItem: { display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', fontSize:14 },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' },
  modal: { background:'#fff', borderRadius:12, overflow:'hidden', width:'90vw', maxWidth:855, maxHeight:'90vh', display:'flex', flexDirection:'column' },
  switchModal: { background:'#fff', borderRadius:12, width:400, maxWidth:'90vw', overflow:'hidden' },
  swAvatar: { width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 },
  swAvatarPh: { width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#667eea,#764ba2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:600, flexShrink:0 },
};
