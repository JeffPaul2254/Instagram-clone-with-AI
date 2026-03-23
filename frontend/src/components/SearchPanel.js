import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { mediaUrl } from '../utils/helpers';

export default function SearchPanel({ onClose }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [following, setFollowing] = useState({});
  const navigate   = useNavigate();
  const inputRef   = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
    const saved = JSON.parse(localStorage.getItem('ig_recent_searches') || '[]');
    setRecent(saved);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const saveRecent = (user) => {
    const saved   = JSON.parse(localStorage.getItem('ig_recent_searches') || '[]');
    const filtered = saved.filter(u => u.id !== user.id);
    const updated  = [user, ...filtered].slice(0, 10);
    localStorage.setItem('ig_recent_searches', JSON.stringify(updated));
    setRecent(updated);
  };

  const removeRecent = (userId, e) => {
    e.stopPropagation();
    const updated = recent.filter(u => u.id !== userId);
    localStorage.setItem('ig_recent_searches', JSON.stringify(updated));
    setRecent(updated);
  };

  const clearAll = () => { localStorage.removeItem('ig_recent_searches'); setRecent([]); };

  const toggleFollow = async (userId, e) => {
    e.stopPropagation();
    const prev = following[userId];
    setFollowing(f => ({ ...f, [userId]: !prev }));
    try { await axios.post(`/api/users/${userId}/follow`); }
    catch { setFollowing(f => ({ ...f, [userId]: prev })); }
  };

  const UserRow = ({ user, showRemove, onRemove }) => {
    const avatarUrl  = mediaUrl(user.avatar);
    const initials   = (user.username || 'U')[0].toUpperCase();
    return (
      <div className="notif-item" style={{ cursor: 'pointer' }}
        onClick={() => { saveRecent(user); navigate(`/${user.username}`); onClose(); }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="avatar avatar--44" />
            : <div className="avatar-ph avatar-ph--44" style={{ background: stringToColor(user.username) }}>{initials}</div>
          }
        </div>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="truncate font-semi" style={{ fontSize: 14 }}>{user.username}</div>
          <div className="truncate text-muted" style={{ fontSize: 13 }}>
            {user.full_name || ''}
            {user.followers_count > 0 ? ` • ${Number(user.followers_count).toLocaleString()} followers` : ' • New to Instagram'}
          </div>
        </div>
        {showRemove && (
          <button onClick={onRemove} className="icon-btn" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#8e8e8e"><path d="M18 6L6 18M6 6l12 12" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="slide-panel__backdrop" onClick={onClose} />
      <div className="slide-panel">
        <div className="slide-panel__header">
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Search</h2>
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              className="search-box__input"
            />
            {query && (
              <button className="search-box__clear" onClick={() => setQuery('')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#8e8e8e">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="slide-panel__body">
          {!query.trim() ? (
            <div>
              {recent.length > 0 ? (
                <>
                  <div className="search-section-hdr">
                    <span className="font-bold" style={{ fontSize: 16 }}>Recent</span>
                    <button className="btn btn--accent font-bold" style={{ fontSize: 14 }} onClick={clearAll}>Clear all</button>
                  </div>
                  {recent.map(u => (
                    <UserRow key={u.id} user={u} showRemove onRemove={(e) => removeRecent(u.id, e)} />
                  ))}
                </>
              ) : (
                <div className="search-empty">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <p className="text-muted" style={{ marginTop: 16, fontSize: 14 }}>No recent searches.</p>
                </div>
              )}
            </div>
          ) : loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="shimmer" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="shimmer" style={{ width: '60%', height: 12, borderRadius: 4, marginBottom: 8 }} />
                    <div className="shimmer" style={{ width: '40%', height: 12, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty">
              <p className="font-semi" style={{ fontSize: 14 }}>No results for "{query}"</p>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>Try searching for a different username or name.</p>
            </div>
          ) : (
            results.map(u => <UserRow key={u.id} user={u} />)
          )}
        </div>
      </div>
    </>
  );
}

function stringToColor(str = '') {
  const colors = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
