import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { timeAgo, mediaUrl } from '../utils/helpers';
import { useWindowWidth } from '../hooks/useWindowWidth';
import RightSidebar from './RightSidebar';

export default function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [following, setFollowing]         = useState({});
  const [loading, setLoading]             = useState(true);
  const windowWidth = useWindowWidth();

  /* NOTE: Dead useEffect with setWindowWidth removed — useWindowWidth hook handles resize */

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

  const now          = Date.now();
  const newNotifs    = notifications.filter(n => (now - new Date(n.created_at)) < 86400000);
  const earlierNotifs = notifications.filter(n => (now - new Date(n.created_at)) >= 86400000);

  const showSuggestionsInPanel = windowWidth <= 1000;

  const renderItem = (n) => {
    const avatarUrl = mediaUrl(n.avatar);
    const initials  = (n.username || 'U')[0].toUpperCase();
    const isFollowing = following[n.sender_id];
    return (
      <div key={n.id} className="notif-item">
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="avatar avatar--44" />
            : <div className="avatar-ph avatar-ph--44">{initials}</div>
          }
          <div className={`notif-type-badge notif-type-badge--${n.type}`}>
            {n.type === 'like'    && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
            {n.type === 'comment' && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
            {n.type === 'follow'  && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          </div>
        </div>
        <div className="notif-item__text">
          <span style={{ fontWeight: 700 }}>{n.username}</span>{' '}
          <span>{n.message}</span>{' '}
          <span className="text-muted" style={{ fontSize: 13 }}>{timeAgo(n.created_at)}</span>
        </div>
        {n.type === 'follow' ? (
          <button
            onClick={() => toggleFollow(n.sender_id)}
            className={`btn ${isFollowing ? 'btn--following' : 'btn--follow'}`}
          >
            {isFollowing ? 'Following' : 'Follow Back'}
          </button>
        ) : (
          n.post_id && <div className="notif-item__thumb">📷</div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="slide-panel__backdrop" onClick={onClose} />
      <div className="slide-panel">
        <div className="slide-panel__header">
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Notifications</h2>
        </div>

        <div className="slide-panel__body">
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }} className="text-muted">Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <p className="text-muted" style={{ marginTop: 16, fontSize: 14 }}>No notifications yet.</p>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>When someone likes, comments, or follows you, it'll show here.</p>
            </div>
          ) : (
            <>
              {newNotifs.length > 0 && (
                <>
                  <div className="slide-panel__section">New</div>
                  {newNotifs.map(renderItem)}
                </>
              )}
              {earlierNotifs.length > 0 && (
                <>
                  <div className="slide-panel__section">Earlier</div>
                  {earlierNotifs.map(renderItem)}
                </>
              )}
            </>
          )}

          {showSuggestionsInPanel && (
            <div style={{ padding: '0 24px 24px' }}>
              <div className="divider-lt" style={{ marginBottom: 16 }} />
              <RightSidebar showSuggestionsOnly={true} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
