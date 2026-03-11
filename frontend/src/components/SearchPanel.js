import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState({});
  const navigate = useNavigate();
  const inputRef = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
    // Load recent searches from localStorage
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
    const saved = JSON.parse(localStorage.getItem('ig_recent_searches') || '[]');
    const filtered = saved.filter(u => u.id !== user.id);
    const updated = [user, ...filtered].slice(0, 10);
    localStorage.setItem('ig_recent_searches', JSON.stringify(updated));
    setRecent(updated);
  };

  const removeRecent = (userId, e) => {
    e.stopPropagation();
    const updated = recent.filter(u => u.id !== userId);
    localStorage.setItem('ig_recent_searches', JSON.stringify(updated));
    setRecent(updated);
  };

  const clearAll = () => {
    localStorage.removeItem('ig_recent_searches');
    setRecent([]);
  };

  const toggleFollow = async (userId, e) => {
    e.stopPropagation();
    const prev = following[userId];
    setFollowing(f => ({ ...f, [userId]: !prev }));
    try { await axios.post(`/api/users/${userId}/follow`); }
    catch { setFollowing(f => ({ ...f, [userId]: prev })); }
  };

  const UserRow = ({ user, showRemove, onRemove }) => {
    const avatarUrl = user.avatar ? `http://localhost:5000${user.avatar}` : null;
    const initials = (user.username || 'U')[0].toUpperCase();
    const isFollowing = following[user.id];

    return (
      <div style={S.userRow} onClick={() => { saveRecent(user); navigate(`/${user.username}`); onClose(); }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={S.avatar} />
            : <div style={{ ...S.avatarPh, background: stringToColor(user.username) }}>{initials}</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.username}
          </div>
          <div style={{ color: '#8e8e8e', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.full_name || ''}
            {user.followers_count > 0 ? ` • ${Number(user.followers_count).toLocaleString()} followers` : ' • New to Instagram'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {showRemove && (
            <button onClick={onRemove} style={S.removeBtn} title="Remove">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#8e8e8e"><path d="M18 6L6 18M6 6l12 12" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.panel}>
        {/* Header */}
        <div style={S.header}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Search</h2>
          <div style={S.searchBox}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              style={S.searchInput}
            />
            {query && (
              <button onClick={() => setQuery('')} style={S.clearBtn}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#8e8e8e">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* No query — show recent */}
          {!query.trim() ? (
            <div>
              {recent.length > 0 ? (
                <>
                  <div style={S.sectionHeader}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Recent</span>
                    <button onClick={clearAll} style={S.clearAllBtn}>Clear all</button>
                  </div>
                  {recent.map(u => (
                    <UserRow key={u.id} user={u} showRemove onRemove={(e) => removeRecent(u.id, e)} />
                  ))}
                </>
              ) : (
                <div style={S.emptyState}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <p style={{ color: '#8e8e8e', marginTop: 16, fontSize: 14 }}>No recent searches.</p>
                </div>
              )}
            </div>
          ) : loading ? (
            /* Loading state */
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#efefef', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '60%', height: 12, borderRadius: 4, background: '#efefef', marginBottom: 8 }} />
                    <div style={{ width: '40%', height: 12, borderRadius: 4, background: '#efefef' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            /* No results */
            <div style={S.emptyState}>
              <p style={{ color: '#262626', fontWeight: 600, fontSize: 14 }}>No results for "{query}"</p>
              <p style={{ color: '#8e8e8e', fontSize: 13, marginTop: 4 }}>Try searching for a different username or name.</p>
            </div>
          ) : (
            /* Results */
            results.map(u => <UserRow key={u.id} user={u} />)
          )}
        </div>
      </div>

      <style>{`@keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
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

const S = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 1099 },
  panel: {
    position: 'fixed', top: 0, left: 72, bottom: 0, width: 397,
    background: '#fff', borderRight: '1px solid #dbdbdb',
    zIndex: 1100, display: 'flex', flexDirection: 'column',
    boxShadow: '4px 0 24px rgba(0,0,0,.08)',
    animation: 'slideIn .2s ease',
  },
  header: { padding: '24px 24px 16px', borderBottom: '1px solid #efefef', flexShrink: 0 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#efefef', borderRadius: 8, padding: '8px 12px' },
  searchInput: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#262626' },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 8px' },
  clearAllBtn: { color: '#0095f6', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' },
  userRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', cursor: 'pointer', transition: 'background .15s' },
  avatar: { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' },
  avatarPh: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  emptyState: { padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
};
