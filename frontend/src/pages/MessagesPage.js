/**
 * MessagesPage.js
 *
 * CHANGES from v1:
 *  • setInterval polling replaced by Socket.io real-time events.
 *    — Old: poll GET /api/messages/:id every 3 s AND poll
 *           GET /api/messages/conversations every 3 s.
 *           That was ~40 API calls per minute per open Messages tab.
 *    — New: server emits 'dm:new' the instant a message is received;
 *           'conversations:update' refreshes the sidebar simultaneously.
 *           Zero polling loops remain in this component.
 *  • axios and react-hot-toast are unchanged.
 *  • activeUserRef keeps socket callbacks aligned with current state
 *    without causing stale closure bugs.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { timeAgo, fullTime, mediaUrl } from '../utils/helpers';
import { useWindowWidth } from '../hooks/useWindowWidth';
import { useSocket } from '../hooks/useSocket';
import Navbar from '../components/Navbar';

export default function MessagesPage() {
  const { user: currentUser, token } = useAuth();
  const navigate   = useNavigate();
  const { userId } = useParams();

  const [conversations, setConversations]   = useState([]);
  const [activeUser, setActiveUser]         = useState(null);
  const [messages, setMessages]             = useState([]);
  const [messageText, setMessageText]       = useState('');
  const [sending, setSending]               = useState(false);
  const [loadingConvos, setLoadingConvos]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [showNewDM, setShowNewDM]           = useState(false);
  const [hoveredMsg, setHoveredMsg]         = useState(null);

  const windowWidth    = useWindowWidth();
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  // Ref mirrors activeUser so socket callbacks always see the latest value
  // without needing to be re-registered every time activeUser changes.
  const activeUserRef  = useRef(null);

  useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);

  // ── Socket.io replaces the 3-second polling loops ───────────
  const socket = useSocket(token);

  useEffect(() => {
    if (!socket) return;

    socket.on('dm:new', (message) => {
      const current = activeUserRef.current;
      if (current && (message.sender_id === current.id || message.recipient_id === current.id)) {
        setMessages(prev => {
          // Guard against duplicate (our own optimistic message already in the list)
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      fetchConversations();
    });

    socket.on('conversations:update', () => fetchConversations());

    return () => {
      socket.off('dm:new');
      socket.off('conversations:update');
    };
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps
  // ────────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/messages/conversations');
      setConversations(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setLoadingConvos(false));
  }, [fetchConversations]);

  useEffect(() => {
    if (userId && !activeUser) {
      axios.get(`/api/users/${userId}/profile`)
        .then(r => openConversation(r.data))
        .catch(() => {});
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openConversation = async (user) => {
    setActiveUser(user);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const { data } = await axios.get(`/api/messages/${user.id}`);
      setMessages(data);
      setConversations(prev => prev.map(c => c.id === user.id ? { ...c, unread_count: 0 } : c));
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeUser || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    const optimistic = {
      id:           `temp-${Date.now()}`,
      sender_id:    currentUser.id,
      recipient_id: activeUser.id,
      text,
      created_at:   new Date().toISOString(),
      username:     currentUser.username,
      avatar:       currentUser.avatar,
      pending:      true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const { data } = await axios.post(`/api/messages/${activeUser.id}`, { text });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
      fetchConversations();
    } catch {
      toast.error('Failed to send');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await axios.delete(`/api/messages/${msgId}`); }
    catch { toast.error('Failed to delete'); }
  };

  const isMobile    = windowWidth < 768;
  const showSidebar = !isMobile || !activeUser;
  const showChat    = !isMobile || activeUser;

  const avatarEl = (user, size = 44) => {
    const url   = mediaUrl(user?.avatar);
    const init  = (user?.username || 'U')[0].toUpperCase();
    const cls   = `avatar avatar--${size}`;
    const phCls = `avatar-ph avatar-ph--${size}`;
    return url
      ? <img src={url} alt="" className={cls} />
      : <div className={phCls}>{init}</div>;
  };

  return (
    <div className="messages-layout">
      <Navbar onNewPost={() => {}} />
      <div className="messages-inner">

        {/* ── LEFT: Conversations sidebar ── */}
        {showSidebar && (
          <div className="convo-sidebar">
            <div className="convo-sidebar__header">
              <span className="font-bold" style={{ fontSize: 16 }}>{currentUser?.username}</span>
              <button className="icon-btn" onClick={() => setShowNewDM(true)} title="New message">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: '16px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-bold" style={{ fontSize: 16 }}>Messages</span>
              <button className="text-muted" style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Requests</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingConvos ? (
                <ConvoSkeleton />
              ) : conversations.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p className="text-muted" style={{ fontSize: 14 }}>No messages yet.</p>
                  <button onClick={() => setShowNewDM(true)}
                    className="btn btn--accent font-bold" style={{ fontSize: 14, marginTop: 8 }}>
                    Start a conversation
                  </button>
                </div>
              ) : (
                conversations.map(convo => (
                  <div key={convo.id} onClick={() => openConversation(convo)}
                    className={`convo-row${activeUser?.id === convo.id ? ' convo-row--active' : ''}`}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {avatarEl(convo, 56)}
                      {convo.unread_count > 0 && <div className="convo-row__dot" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: convo.unread_count > 0 ? 700 : 400, fontSize: 14 }}>{convo.username}</span>
                        <span className="text-muted" style={{ fontSize: 12, flexShrink: 0, marginLeft: 8 }}>{timeAgo(convo.last_message_at)}</span>
                      </div>
                      <div className="truncate" style={{ fontSize: 13, color: convo.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: convo.unread_count > 0 ? 600 : 400, marginTop: 2 }}>
                        {convo.last_sender_id === currentUser?.id ? `You: ${convo.last_message}` : convo.last_message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── RIGHT: Chat window ── */}
        {showChat && (
          <div className="chat-pane">
            {!activeUser ? (
              <div className="chat-empty">
                <div className="chat-empty__icon">
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 300, marginBottom: 8 }}>Your messages</h3>
                <p className="text-muted" style={{ fontSize: 14, marginBottom: 20, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
                  Send private photos and messages to a friend or group.
                </p>
                <button onClick={() => setShowNewDM(true)} className="btn btn--primary" style={{ padding: '10px 24px' }}>Send message</button>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="chat-header">
                  {isMobile && (
                    <button className="icon-btn" onClick={() => setActiveUser(null)}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    </button>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/${activeUser.username}`)}>
                    {avatarEl(activeUser, 44)}
                    <div>
                      <div className="font-semi" style={{ fontSize: 14 }}>{activeUser.username}</div>
                      {activeUser.full_name && <div className="text-muted" style={{ fontSize: 13 }}>{activeUser.full_name}</div>}
                    </div>
                  </div>
                  <button className="icon-btn" onClick={() => navigate(`/${activeUser.username}`)} title="View profile">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </button>
                </div>

                {/* Messages area */}
                <div className="chat-msgs">
                  {loadingMsgs ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="spinner spinner--sm" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                      {avatarEl(activeUser, 80)}
                      <div className="font-semi" style={{ fontSize: 16, marginTop: 16 }}>{activeUser.username}</div>
                      {activeUser.full_name && <div className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>{activeUser.full_name}</div>}
                      <button onClick={() => navigate(`/${activeUser.username}`)}
                        style={{ background: 'var(--border-light)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 16, fontWeight: 600, fontSize: 14 }}>
                        View profile
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px' }}>
                        {avatarEl(activeUser, 64)}
                        <div className="font-semi" style={{ fontSize: 15, marginTop: 12 }}>{activeUser.username}</div>
                        {activeUser.full_name && <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>{activeUser.full_name}</div>}
                        <button onClick={() => navigate(`/${activeUser.username}`)}
                          style={{ background: 'var(--border-light)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', marginTop: 12, fontWeight: 600, fontSize: 13 }}>
                          View profile
                        </button>
                      </div>

                      {messages.map((msg, idx) => {
                        const isMe  = msg.sender_id === currentUser?.id;
                        const isLast = !messages[idx + 1] || messages[idx + 1].sender_id !== msg.sender_id;
                        return (
                          <div key={msg.id}
                            style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2, padding: '0 16px', position: 'relative' }}
                            onMouseEnter={() => setHoveredMsg(msg.id)}
                            onMouseLeave={() => setHoveredMsg(null)}>

                            {!isMe && (
                              <div style={{ width: 28, flexShrink: 0 }}>
                                {isLast ? avatarEl(activeUser, 28) : <div style={{ width: 28 }} />}
                              </div>
                            )}

                            {isMe && hoveredMsg === msg.id && !msg.pending && (
                              <button onClick={() => deleteMessage(msg.id)} className="icon-btn" title="Delete" style={{ padding: '0 4px', alignSelf: 'center' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                              </button>
                            )}

                            <div className={`bubble bubble--${isMe ? 'me' : 'them'}`}>
                              <div
                                className={`bubble__txt bubble__txt--${isMe ? 'me' : 'them'}`}
                                style={{
                                  borderRadius: isMe
                                    ? `18px 18px ${isLast ? '4px' : '18px'} 18px`
                                    : `18px 18px 18px ${isLast ? '4px' : '18px'}`,
                                  opacity: msg.pending ? 0.6 : 1,
                                }}>
                                {msg.text}
                              </div>
                              {hoveredMsg === msg.id && (
                                <div className="bubble__time">{fullTime(msg.created_at)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} style={{ height: 16 }} />
                    </>
                  )}
                </div>

                {/* Input bar */}
                <form onSubmit={sendMessage} className="chat-input-bar">
                  <div className="chat-input-wrap">
                    <button type="button" className="icon-btn" style={{ padding: '8px 12px', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
                      </svg>
                    </button>
                    <input
                      ref={inputRef}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      placeholder="Message..."
                      className="chat-input"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e); }}
                    />
                    {messageText.trim() ? (
                      <button type="submit" className="btn btn--accent font-bold" style={{ padding: '8px 16px', flexShrink: 0 }} disabled={sending}>Send</button>
                    ) : (
                      <div style={{ display: 'flex', gap: 12, paddingRight: 12 }}>
                        <button type="button" className="icon-btn" style={{ padding: '8px 0' }}>
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </button>
                        <button type="button" className="icon-btn" style={{ padding: '8px 0' }}>
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {showNewDM && (
        <NewDMModal
          currentUser={currentUser}
          onClose={() => setShowNewDM(false)}
          onSelect={(user) => { setShowNewDM(false); openConversation(user); navigate(`/messages/${user.id}`); }}
        />
      )}
    </div>
  );
}

// ── NEW DM MODAL ──────────────────────────────────────────────
function NewDMModal({ currentUser, onClose, onSelect }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef();

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  return (
    <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--dm">
        <div className="modal__header">
          <button className="modal__close" onClick={onClose}>×</button>
          <span className="font-bold" style={{ fontSize: 16 }}>New message</span>
          <div style={{ width: 24 }} />
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..."
              autoFocus className="search-box__input" />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center' }} className="text-muted">Searching...</div>}
          {!loading && query && results.length === 0 && <div style={{ padding: 20, textAlign: 'center' }} className="text-muted">No results for "{query}"</div>}
          {!loading && !query && <div style={{ padding: 20, textAlign: 'center' }} className="text-muted">Search for people to message</div>}
          {results.map(user => {
            const url  = mediaUrl(user.avatar);
            const init = (user.username || 'U')[0].toUpperCase();
            return (
              <div key={user.id} onClick={() => onSelect(user)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer' }}>
                {url ? <img src={url} alt="" className="avatar avatar--44" /> : <div className="avatar-ph avatar-ph--44">{init}</div>}
                <div>
                  <div className="font-semi" style={{ fontSize: 14 }}>{user.username}</div>
                  <div className="text-muted" style={{ fontSize: 13 }}>{user.full_name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── SKELETON ──────────────────────────────────────────────────
function ConvoSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
          <div className="shimmer" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="shimmer" style={{ width: '60%', height: 13, borderRadius: 4, marginBottom: 8 }} />
            <div className="shimmer" style={{ width: '80%', height: 12, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </>
  );
}
