import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../utils/helpers';
import NotificationsPanel from './NotificationsPanel';
import SearchPanel from './SearchPanel';

export default function Navbar({ onNewPost }) {
  const { user, logout } = useAuth();
  const [showCreate, setShowCreate]               = useState(false);
  const [showMore, setShowMore]                   = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch]               = useState(false);
  const [accounts, setAccounts]                   = useState([]);
  const [caption, setCaption]                     = useState('');
  const [location, setLocation]                   = useState('');
  const [image, setImage]                         = useState(null);
  const [preview, setPreview]                     = useState(null);
  const [posting, setPosting]                     = useState(false);
  const [expanded, setExpanded]                   = useState(false);
  const [unreadCount, setUnreadCount]             = useState(0);
  const [unreadDMs, setUnreadDMs]                 = useState(0);
  const fileRef    = useRef();
  const hoverTimer = useRef();
  const navigate   = useNavigate();

  const avatarUrl = mediaUrl(user?.avatar);
  const initials  = (user?.username || 'U')[0].toUpperCase();

  useEffect(() => {
    const fetchCounts = () => {
      axios.get('/api/notifications/count').then(r => setUnreadCount(r.data.count)).catch(() => {});
      axios.get('/api/messages/unread/count').then(r => setUnreadDMs(r.data.count)).catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showAccountSwitch) axios.get('/api/users/all').then(r => setAccounts(r.data)).catch(() => {});
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

  const openSearch         = () => { setShowSearch(true); setShowNotifications(false); setExpanded(false); };
  const closeSearch        = () => setShowSearch(false);
  const openNotifications  = () => { setShowNotifications(true); setExpanded(false); setUnreadCount(0); };
  const closeNotifications = () => setShowNotifications(false);

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
      if (location.trim()) fd.append('location', location.trim());
      if (image) fd.append('image', image);
      const { data } = await axios.post('/api/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onNewPost(data);
      toast.success('Post shared! ✨');
      closeCreate();
    } catch { toast.error('Failed to post'); }
    finally { setPosting(false); }
  };

  // Reset all create-post state when modal closes
  const closeCreate = () => {
    setShowCreate(false);
    setCaption('');
    setLocation('');
    setImage(null);
    setPreview(null);
  };

  const navItems = [
    {
      label: 'Home', onClick: () => navigate('/'),
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9.005 16.545a2.997 2.997 0 012.997-2.997A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z"/></svg>,
    },
    {
      label: 'Search', onClick: openSearch,
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
    },
    {
      label: 'Explore', onClick: () => navigate('/explore'),
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
    },
    {
      label: 'Reels', onClick: () => navigate('/reels'),
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
    },
    {
      label: 'Messages', onClick: () => { navigate('/messages'); setUnreadDMs(0); },
      icon: (
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          {unreadDMs > 0 && <div className="notif-badge">{unreadDMs > 9 ? '9+' : unreadDMs}</div>}
        </div>
      ),
    },
    {
      label: 'Notifications', onClick: openNotifications,
      icon: (
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill={showNotifications ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {unreadCount > 0 && <div className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</div>}
        </div>
      ),
    },
    {
      label: 'Create', onClick: () => setShowCreate(true),
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>,
    },
  ];

  return (
    <>
      <nav className="nav" style={{ width: expanded ? 244 : 72 }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="nav__logo">
          {expanded
            ? <span className="nav__logo-text">Instagram</span>
            : <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
          }
        </div>

        <div className="nav__items">
          {navItems.map(item => (
            <button key={item.label} className="nav__item"
              style={{ fontWeight: item.label === 'Notifications' && showNotifications ? 700 : 400 }}
              onClick={item.onClick} title={item.label}>
              <span className="nav__icon">{item.icon}</span>
              {expanded && <span className="nav__label">{item.label}</span>}
            </button>
          ))}
          <button className="nav__item" title="Profile" onClick={() => navigate(`/${user?.username}`)}>
            <span className="nav__icon">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="avatar avatar--26" />
                : <div className="avatar-ph avatar-ph--26">{initials}</div>
              }
            </span>
            {expanded && <span className="nav__label">Profile</span>}
          </button>
        </div>

        <div className="nav__more">
          <button className="nav__item" onClick={() => setShowMore(p => !p)} title="More">
            <span className="nav__icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </span>
            {expanded && <span className="nav__label">More</span>}
          </button>
          {showMore && (
            <div className="nav__more-menu">
              <div className="nav__more-item" onClick={() => { setShowMore(false); setShowAccountSwitch(true); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                <span>Switch Account</span>
              </div>
              <div className="divider-lt" />
              <div className="nav__more-item" onClick={logout}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                <span>Log out</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {showSearch        && <SearchPanel onClose={closeSearch} />}
      {showNotifications && <NotificationsPanel onClose={closeNotifications} />}

      {/* Account Switcher Modal */}
      {showAccountSwitch && (
        <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && setShowAccountSwitch(false)}>
          <div className="modal modal--switch">
            <div className="modal__header">
              <span style={{ fontWeight: 600, fontSize: 16 }}>Switch Account</span>
              <button className="modal__close" onClick={() => setShowAccountSwitch(false)}>×</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="avatar avatar--44" /> : <div className="avatar-ph avatar-ph--44">{initials}</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.username}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{user?.full_name}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
                </div>
              </div>
              {accounts.filter(a => a.id !== user?.id).map(acc => {
                const aUrl  = mediaUrl(acc.avatar);
                const aInit = (acc.username || 'U')[0].toUpperCase();
                return (
                  <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer' }}
                    onClick={() => { setShowAccountSwitch(false); logout(); toast(`Switching to @${acc.username} — please log in`); }}>
                    {aUrl ? <img src={aUrl} alt="" className="avatar avatar--44" /> : <div className="avatar-ph avatar-ph--44 avatar-ph--pink">{aInit}</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{acc.username}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{acc.full_name}</div>
                    </div>
                    <span className="text-accent" style={{ fontSize: 12, fontWeight: 600 }}>Switch</span>
                  </div>
                );
              })}
            </div>
            <div className="divider" />
            <button style={{ display: 'block', width: '100%', padding: '14px 20px', textAlign: 'left', fontWeight: 600, fontSize: 14, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
              onClick={() => { setShowAccountSwitch(false); logout(); }}>+ Add account</button>
            <button style={{ display: 'block', width: '100%', padding: '14px 20px', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: 8 }}
              onClick={() => { setShowAccountSwitch(false); logout(); }}>Log out</button>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreate && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeCreate()}>
          <div className="modal modal--post">
            <div className="modal__header modal__header--sm">
              <span style={{ fontSize: 16, fontWeight: 600 }}>Create new post</span>
              <button className="modal__close" onClick={closeCreate}>×</button>
            </div>

            {!preview ? (
              /* ── Step 1: pick a file ── */
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '60px 20px', cursor: 'pointer', minHeight: 400 }}
                onClick={() => fileRef.current.click()}
              >
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#262626" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p style={{ marginTop: 16, fontSize: 20, color: 'var(--text-primary)' }}>
                  Drag photos and videos here
                </p>
                <button
                  className="btn btn--primary"
                  style={{ marginTop: 20 }}
                  onClick={e => { e.stopPropagation(); fileRef.current.click(); }}
                >
                  Select from computer
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </div>
            ) : (
              /* ── Step 2: caption + location ── */
              <div style={{ display: 'flex', flex: 1, minHeight: 400 }}>
                <img
                  src={preview} alt="preview"
                  style={{ width: 500, height: 450, objectFit: 'cover',
                    borderRight: '1px solid var(--border)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Author row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 12px' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="avatar avatar--32" />
                      : <div className="avatar-ph avatar-ph--32">{initials}</div>
                    }
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{user?.username}</span>
                  </div>

                  {/* Caption textarea */}
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    style={{ flex: 1, padding: '0 16px', border: 'none', outline: 'none',
                      resize: 'none', fontSize: 14, lineHeight: 1.6, minHeight: 120,
                      fontFamily: 'inherit' }}
                    maxLength={2200}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)',
                    textAlign: 'right', padding: '4px 16px 8px' }}>
                    {caption.length}/2,200
                  </div>

                  {/* Location input */}
                  <div className="post-location-input-wrap">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                      stroke="#8e8e8e" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Add location"
                      maxLength={100}
                      className="post-location-input"
                    />
                  </div>

                  {/* Share button */}
                  <div style={{ padding: '12px 16px' }}>
                    <button
                      onClick={submitPost}
                      className="btn btn--primary"
                      disabled={posting}
                      style={{ width: '100%' }}
                    >
                      {posting ? 'Sharing...' : 'Share'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}