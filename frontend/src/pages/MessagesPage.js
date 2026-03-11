import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { timeAgo, fullTime, mediaUrl } from '../utils/helpers';
import { useWindowWidth } from '../hooks/useWindowWidth';
import Navbar from '../components/Navbar';

export default function MessagesPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams(); // optional: /messages/:userId to open a convo directly

  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/messages/conversations');
      setConversations(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setLoadingConvos(false));
  }, [fetchConversations]);

  // Open conversation if userId in URL
  useEffect(() => {
    if (userId && !activeUser) {
      axios.get(`/api/users/${userId}/profile`).then(r => openConversation(r.data)).catch(() => {});
    }
  }, [userId]);

  // Poll for new messages every 3s when a conversation is open
  useEffect(() => {
    if (!activeUser) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/messages/${activeUser.id}`);
        setMessages(data);
      } catch {}
      fetchConversations();
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeUser, fetchConversations]);

  const openConversation = async (user) => {
    setActiveUser(user);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const { data } = await axios.get(`/api/messages/${user.id}`);
      setMessages(data);
      // Mark convo as read
      setConversations(prev => prev.map(c => c.id === user.id ? { ...c, unread_count: 0 } : c));
    } catch { toast.error('Failed to load messages'); }
    finally { setLoadingMsgs(false); }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeUser || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic update
    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: currentUser.id,
      recipient_id: activeUser.id,
      text,
      created_at: new Date().toISOString(),
      username: currentUser.username,
      avatar: currentUser.avatar,
      pending: true,
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
    } finally { setSending(false); }
  };

  const deleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await axios.delete(`/api/messages/${msgId}`); }
    catch { toast.error('Failed to delete'); }
  };

  const isMobile = windowWidth < 768;
  const showSidebar = !isMobile || !activeUser;
  const showChat = !isMobile || activeUser;

  const avatarEl = (user, size = 44) => {
    const url = user?.avatar ? `http://localhost:5000${user.avatar}` : null;
    const init = (user?.username || 'U')[0].toUpperCase();
    const style = { width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 };
    return url
      ? <img src={url} alt="" style={style} />
      : <div style={{ ...style, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.4, fontWeight: 600 }}>{init}</div>;
  };

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <Navbar onNewPost={() => {}} />

      <div style={{ marginLeft: 72, height: '100vh', display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Conversations sidebar ── */}
        {showSidebar && (
          <div style={S.sidebar}>
            {/* Header */}
            <div style={S.sidebarHeader}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{currentUser?.username}</span>
              <button onClick={() => setShowNewDM(true)} style={S.iconBtn} title="New message">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            </div>

            {/* Messages label */}
            <div style={{ padding: '16px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Messages</span>
              <button style={{ color: '#8e8e8e', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Requests</button>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingConvos ? (
                <ConvoSkeleton />
              ) : conversations.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: '#8e8e8e', fontSize: 14 }}>No messages yet.</p>
                  <button onClick={() => setShowNewDM(true)} style={{ color: '#0095f6', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>Start a conversation</button>
                </div>
              ) : (
                conversations.map(convo => (
                  <div
                    key={convo.id}
                    onClick={() => openConversation(convo)}
                    style={{
                      ...S.convoRow,
                      background: activeUser?.id === convo.id ? '#fafafa' : '#fff',
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {avatarEl(convo, 56)}
                      {convo.unread_count > 0 && (
                        <div style={S.unreadDot} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: convo.unread_count > 0 ? 700 : 400, fontSize: 14, color: '#262626' }}>{convo.username}</span>
                        <span style={{ fontSize: 12, color: '#8e8e8e', flexShrink: 0, marginLeft: 8 }}>{timeAgo(convo.last_message_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: convo.unread_count > 0 ? '#262626' : '#8e8e8e', fontWeight: convo.unread_count > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
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
          <div style={S.chatPane}>
            {!activeUser ? (
              /* Empty state */
              <div style={S.emptyChat}>
                <div style={S.emptyChatIcon}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#262626" strokeWidth="1.2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 300, marginBottom: 8 }}>Your messages</h3>
                <p style={{ color: '#8e8e8e', fontSize: 14, marginBottom: 20, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
                  Send private photos and messages to a friend or group.
                </p>
                <button onClick={() => setShowNewDM(true)} style={S.sendMsgBtn}>Send message</button>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={S.chatHeader}>
                  {isMobile && (
                    <button onClick={() => setActiveUser(null)} style={S.iconBtn}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    </button>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/${activeUser.username}`)}>
                    {avatarEl(activeUser, 44)}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{activeUser.username}</div>
                      {activeUser.full_name && <div style={{ fontSize: 13, color: '#8e8e8e' }}>{activeUser.full_name}</div>}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/${activeUser.username}`)} style={S.iconBtn} title="View profile">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </button>
                </div>

                {/* Messages area */}
                <div style={S.messagesArea}>
                  {loadingMsgs ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div style={{ width: 24, height: 24, border: '2px solid #dbdbdb', borderTopColor: '#262626', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                      {avatarEl(activeUser, 80)}
                      <div style={{ fontWeight: 600, fontSize: 16, marginTop: 16 }}>{activeUser.username}</div>
                      {activeUser.full_name && <div style={{ color: '#8e8e8e', fontSize: 14, marginTop: 4 }}>{activeUser.full_name}</div>}
                      <button onClick={() => navigate(`/${activeUser.username}`)} style={{ color: '#262626', fontWeight: 600, fontSize: 14, background: '#efefef', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 16 }}>View profile</button>
                    </div>
                  ) : (
                    <>
                      {/* Profile info at top of chat */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px' }}>
                        {avatarEl(activeUser, 64)}
                        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 12 }}>{activeUser.username}</div>
                        {activeUser.full_name && <div style={{ color: '#8e8e8e', fontSize: 13, marginTop: 2 }}>{activeUser.full_name}</div>}
                        <button onClick={() => navigate(`/${activeUser.username}`)} style={{ color: '#262626', fontWeight: 600, fontSize: 13, background: '#efefef', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', marginTop: 12 }}>View profile</button>
                      </div>

                      {/* Message bubbles */}
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        const prevMsg = messages[idx - 1];
                        const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                        const isLast = !messages[idx + 1] || messages[idx + 1].sender_id !== msg.sender_id;

                        return (
                          <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2, padding: '0 16px', position: 'relative' }}
                            onMouseEnter={() => setHoveredMsg(msg.id)}
                            onMouseLeave={() => setHoveredMsg(null)}>

                            {/* Avatar (other user, only on last consecutive msg) */}
                            {!isMe && (
                              <div style={{ width: 28, flexShrink: 0 }}>
                                {isLast ? avatarEl(activeUser, 28) : <div style={{ width: 28 }} />}
                              </div>
                            )}

                            {/* Delete button (own messages, on hover) */}
                            {isMe && hoveredMsg === msg.id && !msg.pending && (
                              <button onClick={() => deleteMessage(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#8e8e8e', alignSelf: 'center' }} title="Delete">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                              </button>
                            )}

                            {/* Bubble */}
                            <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                background: isMe ? '#262626' : '#efefef',
                                color: isMe ? '#fff' : '#262626',
                                borderRadius: isMe
                                  ? `18px 18px ${isLast ? '4px' : '18px'} 18px`
                                  : `18px 18px 18px ${isLast ? '4px' : '18px'}`,
                                padding: '10px 14px',
                                fontSize: 14,
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                                opacity: msg.pending ? 0.6 : 1,
                              }}>
                                {msg.text}
                              </div>
                              {/* Timestamp on hover */}
                              {hoveredMsg === msg.id && (
                                <div style={{ fontSize: 11, color: '#8e8e8e', marginTop: 3, padding: '0 2px' }}>
                                  {fullTime(msg.created_at)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} style={{ height: 16 }} />
                    </>
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={sendMessage} style={S.inputBar}>
                  <div style={S.inputWrap}>
                    <button type="button" style={S.inputIconBtn}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
                      </svg>
                    </button>
                    <input
                      ref={inputRef}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      placeholder="Message..."
                      style={S.input}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { sendMessage(e); } }}
                    />
                    {messageText.trim() ? (
                      <button type="submit" style={S.sendBtn} disabled={sending}>Send</button>
                    ) : (
                      <div style={{ display: 'flex', gap: 12, paddingRight: 12 }}>
                        <button type="button" style={S.inputIconBtn}>
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#262626" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </button>
                        <button type="button" style={S.inputIconBtn}>
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
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

      {/* New DM Modal */}
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
  const [query, setQuery] = useState('');
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: 400, maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #dbdbdb' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: '#262626' }}>×</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>New message</span>
          <div style={{ width: 24 }} />
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #efefef' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#efefef', borderRadius: 8, padding: '8px 12px' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#8e8e8e', fontSize: 14 }}>Searching...</div>}
          {!loading && query && results.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#8e8e8e', fontSize: 14 }}>No results for "{query}"</div>}
          {!loading && !query && <div style={{ padding: 20, textAlign: 'center', color: '#8e8e8e', fontSize: 14 }}>Search for people to message</div>}
          {results.map(user => {
            const url = user.avatar ? `http://localhost:5000${user.avatar}` : null;
            const init = (user.username || 'U')[0].toUpperCase();
            return (
              <div key={user.id} onClick={() => onSelect(user)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer' }}>
                {url
                  ? <img src={url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>{init}</div>
                }
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.username}</div>
                  <div style={{ color: '#8e8e8e', fontSize: 13 }}>{user.full_name}</div>
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
  const p = { background: 'linear-gradient(90deg,#efefef 25%,#e0e0e0 50%,#efefef 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 4 };
  return (
    <>
      <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
          <div style={{ ...p, width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...p, width: '60%', height: 13, marginBottom: 8 }} />
            <div style={{ ...p, width: '80%', height: 12 }} />
          </div>
        </div>
      ))}
    </>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const S = {
  sidebar: { width: 350, borderRight: '1px solid #dbdbdb', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 16px', borderBottom: '1px solid #dbdbdb' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: '#262626' },
  convoRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', cursor: 'pointer', transition: 'background .15s' },
  unreadDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#0095f6', border: '2px solid #fff' },
  chatPane: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 },
  chatHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #dbdbdb', flexShrink: 0 },
  messagesArea: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyChatIcon: { width: 80, height: 80, borderRadius: '50%', border: '2px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sendMsgBtn: { background: '#0095f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  inputBar: { padding: '12px 16px', borderTop: '1px solid #dbdbdb', flexShrink: 0 },
  inputWrap: { display: 'flex', alignItems: 'center', border: '1px solid #dbdbdb', borderRadius: 24, overflow: 'hidden' },
  inputIconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', flexShrink: 0 },
  input: { flex: 1, border: 'none', outline: 'none', fontSize: 14, padding: '10px 4px', minWidth: 0 },
  sendBtn: { color: '#0095f6', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', flexShrink: 0 },
};
