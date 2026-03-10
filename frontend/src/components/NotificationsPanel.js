import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RightSidebar from './RightSidebar';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

export default function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [following, setFollowing] = useState({});
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    axios.get('/api/notifications')
      .then(r => {
        setNotifications(r.data);
        const f = {};
        r.data.forEach(n => { if (n.is_following) f[n.sender_id] = true; });
        setFollowing(f);
      })
      .finally(() => setLoading(false));
    axios.put('/api/notifications/read').catch(() => {});
  }, []);

  const toggleFollow = async (senderId) => {
    const prev = following[senderId];
    setFollowing(f => ({ ...f, [senderId]: !prev }));
    try { await axios.post(`/api/users/${senderId}/follow`); }
    catch { setFollowing(f => ({ ...f, [senderId]: prev })); }
  };

  const now = Date.now();
  const newNotifs = notifications.filter(n => (now - new Date(n.created_at)) < 86400000);
  const earlierNotifs = notifications.filter(n => (now - new Date(n.created_at)) >= 86400000);

  // Show suggestions section inside panel when sidebar is hidden (< 1000px)
  const showSuggestionsInPanel = windowWidth <= 1000;

  const renderItem = (n) => {
    const avatarUrl = n.avatar ? `http://localhost:5000${n.avatar}` : null;
    const initials = (n.username || 'U')[0].toUpperCase();
    const isFollowing = following[n.sender_id];
    return (
      <div key={n.id} style={S.item}>
        <div style={{ position:'relative', flexShrink:0 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={S.avatar} />
            : <div style={S.avatarPh}>{initials}</div>
          }
          <div style={{ ...S.badge, background: n.type==='like' ? '#ed4956' : n.type==='comment' ? '#0095f6' : '#a855f7' }}>
            {n.type==='like' && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
            {n.type==='comment' && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
            {n.type==='follow' && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          </div>
        </div>
        <div style={S.text}>
          <span style={{ fontWeight:700 }}>{n.username}</span>{' '}
          <span>{n.message}</span>{' '}
          <span style={{ color:'#8e8e8e', fontSize:13 }}>{timeAgo(n.created_at)}</span>
        </div>
        {n.type === 'follow' ? (
          <button onClick={() => toggleFollow(n.sender_id)} style={{ ...S.followBtn, ...(isFollowing ? S.followingBtn : {}) }}>
            {isFollowing ? 'Following' : 'Follow Back'}
          </button>
        ) : (
          n.post_id && <div style={S.postThumb}>📷</div>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.panel}>
        {/* Header */}
        <div style={S.header}>
          <h2 style={{ fontSize:20, fontWeight:700 }}>Notifications</h2>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {/* Notifications list */}
          {loading ? (
            <div style={{ padding:32, textAlign:'center', color:'#8e8e8e' }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <p style={{ color:'#8e8e8e', marginTop:16, fontSize:14 }}>No notifications yet.</p>
              <p style={{ color:'#8e8e8e', fontSize:13, marginTop:4 }}>When someone likes, comments, or follows you, it'll show here.</p>
            </div>
          ) : (
            <>
              {newNotifs.length > 0 && (
                <>
                  <div style={S.sectionLabel}>New</div>
                  {newNotifs.map(renderItem)}
                </>
              )}
              {earlierNotifs.length > 0 && (
                <>
                  <div style={S.sectionLabel}>Earlier</div>
                  {earlierNotifs.map(renderItem)}
                </>
              )}
            </>
          )}

          {/* Suggestions section — only shown when sidebar is hidden (mobile/small screen) */}
          {showSuggestionsInPanel && (
            <div style={S.suggestionsSection}>
              <div style={{ height:1, background:'#efefef', marginBottom:16 }} />
              <RightSidebar showSuggestionsOnly={true} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const S = {
  backdrop: { position:'fixed', inset:0, zIndex:1099 },
  panel: { position:'fixed', top:0, left:72, bottom:0, width:397, background:'#fff', borderRight:'1px solid #dbdbdb', zIndex:1100, display:'flex', flexDirection:'column', boxShadow:'4px 0 24px rgba(0,0,0,.08)', animation:'slideIn .2s ease' },
  header: { padding:'24px 24px 16px', borderBottom:'1px solid #efefef', flexShrink:0 },
  sectionLabel: { padding:'16px 24px 8px', fontWeight:700, fontSize:15, color:'#262626' },
  item: { display:'flex', alignItems:'center', gap:12, padding:'10px 24px', transition:'background .15s' },
  avatar: { width:44, height:44, borderRadius:'50%', objectFit:'cover' },
  avatarPh: { width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#667eea,#764ba2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:700 },
  badge: { position:'absolute', bottom:-2, right:-2, width:18, height:18, borderRadius:'50%', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center' },
  text: { flex:1, fontSize:14, lineHeight:1.4 },
  followBtn: { background:'#0095f6', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' },
  followingBtn: { background:'#efefef', color:'#262626' },
  postThumb: { width:44, height:44, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 },
  suggestionsSection: { padding:'0 24px 24px' },
};
