import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../utils/helpers';

export default function RightSidebar({ showSuggestionsOnly = false }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [suggestions, setSuggestions]       = useState([]);
  const [following, setFollowing]           = useState({});
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [accounts, setAccounts]             = useState([]);

  useEffect(() => {
    axios.get('/api/users/suggestions').then(r => {
      setSuggestions(r.data);
      const init = {};
      r.data.forEach(s => { init[s.id] = !!s.is_following; });
      setFollowing(init);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (showSwitchModal) axios.get('/api/users/all').then(r => setAccounts(r.data)).catch(() => {});
  }, [showSwitchModal]);

  const toggleFollow = async (userId) => {
    const prev = following[userId];
    setFollowing(f => ({ ...f, [userId]: !prev }));
    try {
      await axios.post(`/api/users/${userId}/follow`);
      toast.success(prev ? 'Unfollowed' : 'Followed!');
    } catch { setFollowing(f => ({ ...f, [userId]: prev })); }
  };

  const avatarUrl = mediaUrl(user?.avatar);
  const initials  = (user?.username || 'U')[0].toUpperCase();

  return (
    <>
      <div className="sidebar-widget">
        {!showSuggestionsOnly && (
          <div className="sidebar__user-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="avatar avatar--56" />
                : <div className="avatar-ph avatar-ph--56">{initials}</div>
              }
              <div>
                <div className="font-semi" style={{ fontSize: 14 }}>{user?.username}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{user?.full_name || ''}</div>
              </div>
            </div>
            <button className="btn btn--accent font-bold" style={{ fontSize: 13 }} onClick={() => setShowSwitchModal(true)}>Switch</button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div style={{ marginTop: showSuggestionsOnly ? 0 : 16 }}>
            <div className="sidebar__sugg-hdr">
              <span className="text-muted font-semi" style={{ fontSize: 14 }}>Suggested for you</span>
              <button className="font-semi" style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>See All</button>
            </div>
            {suggestions.map(s => {
              const sUrl     = mediaUrl(s.avatar);
              const sInitials = (s.username || 'U')[0].toUpperCase();
              const isFollowing = following[s.id];
              return (
                <div key={s.id} className="sidebar__sugg-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    {sUrl
                      ? <img src={sUrl} alt="" className="avatar avatar--32" />
                      : <div className="avatar-ph avatar-ph--32 avatar-ph--pink">{sInitials}</div>
                    }
                    <div style={{ minWidth: 0 }}>
                      <div className="truncate font-semi" style={{ fontSize: 13, cursor: 'pointer' }}
                        onClick={() => navigate(`/${s.username}`)}>{s.username}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {s.followers_count > 0 ? `${s.followers_count} follower${s.followers_count !== 1 ? 's' : ''}` : 'New to Instagram'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(s.id)}
                    className={`btn ${isFollowing ? 'btn--following-sm' : 'btn--follow-sm'}`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!showSuggestionsOnly && (
          <div className="sidebar__footer">
            <div className="sidebar__foot-links">
              {['About','Help','Press','API','Jobs','Privacy','Terms','Locations','Language'].map(l => (
                <button key={l} className="sidebar__foot-link">{l}</button>
              ))}
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 16 }}>© 2024 INSTAGRAM CLONE</div>
          </div>
        )}
      </div>

      {/* Switch Account Modal */}
      {showSwitchModal && (
        <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && setShowSwitchModal(false)}>
          <div className="modal modal--switch">
            <div className="modal__header">
              <span className="font-semi" style={{ fontSize: 16 }}>Switch Account</span>
              <button className="modal__close" onClick={() => setShowSwitchModal(false)}>×</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="avatar avatar--44" /> : <div className="avatar-ph avatar-ph--44">{initials}</div>}
                <div style={{ flex: 1 }}>
                  <div className="font-semi" style={{ fontSize: 14 }}>{user?.username}</div>
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
                    onClick={() => { setShowSwitchModal(false); logout(); toast(`Switching account — please log in`); }}>
                    {aUrl ? <img src={aUrl} alt="" className="avatar avatar--44" /> : <div className="avatar-ph avatar-ph--44 avatar-ph--pink">{aInit}</div>}
                    <div style={{ flex: 1 }}>
                      <div className="font-semi" style={{ fontSize: 14 }}>{acc.username}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{acc.full_name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="divider" />
            <button style={{ display: 'block', width: '100%', padding: '14px 20px', textAlign: 'left', fontWeight: 600, fontSize: 14, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
              onClick={() => { setShowSwitchModal(false); logout(); }}>+ Add account</button>
            <button style={{ display: 'block', width: '100%', padding: '14px 20px', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: 8 }}
              onClick={() => { setShowSwitchModal(false); logout(); }}>Log out</button>
          </div>
        </div>
      )}
    </>
  );
}
