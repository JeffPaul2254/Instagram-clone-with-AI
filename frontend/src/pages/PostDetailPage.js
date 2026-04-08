/**
 * PostDetailPage.js  —  /p/:postId
 *
 * Standalone post page. Layout mirrors Instagram:
 *   Left  : post image (or caption-only card)
 *   Right : author header, scrollable comments, action row, likes count, add-comment form
 *
 * Features
 *  - Fetches the post by ID from GET /api/posts/:id
 *  - Like / unlike with optimistic update
 *  - Add comment, view all comments
 *  - Bookmark (local state — saved posts feature wires this up later)
 *  - Share via DM sheet (same ShareSheet pattern as PostCard)
 *  - Copy link
 *  - Follow / Unfollow the post author
 *  - Delete post (own posts only) → redirects to profile
 *  - Proper 404 page when post doesn't exist
 *  - Responsive: stacks vertically on narrow screens
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { timeAgo, mediaUrl } from '../utils/helpers';
import Navbar from '../components/Navbar';

export default function PostDetailPage() {
  const { postId }               = useParams();
  const { user: currentUser }    = useAuth();
  const navigate                 = useNavigate();

  const [post, setPost]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  const [liked, setLiked]             = useState(false);
  const [likesCount, setLikesCount]   = useState(0);
  const [comments, setComments]       = useState([]);
  const [commentText, setCommentText] = useState('');
  const [bookmarked, setBookmarked]   = useState(false);
  const [following, setFollowing]     = useState(false);
  const [sheet, setSheet]             = useState(null); // null | 'share' | 'menu'
  const cmtInputRef                   = useRef();

  const isOwn   = post && currentUser?.id === post.user_id;
  const postUrl = `${window.location.origin}/p/${postId}`;

  // ── Fetch post + comments on mount ──────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`/api/posts/${postId}`),
      axios.get(`/api/posts/${postId}/comments`),
    ])
      .then(([postRes, cmtRes]) => {
        const p = postRes.data;
        setPost(p);
        setLiked(p.user_liked > 0);
        setLikesCount(Number(p.likes_count));
        setComments(cmtRes.data);
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
        else toast.error('Failed to load post');
      })
      .finally(() => setLoading(false));
  }, [postId]);

  // ── Like ────────────────────────────────────────────────────
  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => newLiked ? c + 1 : c - 1);
    try { await axios.post(`/api/posts/${postId}/like`); }
    catch { setLiked(!newLiked); setLikesCount(c => newLiked ? c - 1 : c + 1); }
  };

  // ── Comment ─────────────────────────────────────────────────
  const addComment = async e => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await axios.post(`/api/posts/${postId}/comments`, { text: commentText });
      setComments(p => [...p, data]);
      setCommentText('');
    } catch { toast.error('Failed to comment'); }
  };

  // ── Follow ──────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (!post) return;
    const newVal = !following;
    setFollowing(newVal);
    try {
      await axios.post(`/api/users/${post.user_id}/follow`);
      toast.success(newVal ? `Following ${post.username}` : `Unfollowed ${post.username}`);
    } catch { setFollowing(!newVal); }
  };

  // ── Delete ──────────────────────────────────────────────────
  const deletePost = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/posts/${postId}`);
      toast.success('Post deleted');
      navigate(`/${post.username}`);
    } catch { toast.error('Failed to delete'); }
  };

  // ── Copy link ───────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(postUrl)
      .then(() => toast.success('Link copied!'))
      .catch(() => toast.error('Could not copy'));
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div className="pdp-layout">
      <Navbar onNewPost={() => {}} />
      <div className="pdp-inner">
        <div className="pdp-skeleton">
          <div className="shimmer pdp-skeleton__img" />
          <div className="pdp-skeleton__side">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px' }}>
              <div className="shimmer" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div className="shimmer" style={{ width: 120, height: 13, borderRadius: 4 }} />
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div className="shimmer" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="shimmer" style={{ width: '80%', height: 12, borderRadius: 4, marginBottom: 6 }} />
                    <div className="shimmer" style={{ width: '50%', height: 11, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 404 ─────────────────────────────────────────────────────
  if (notFound) return (
    <div className="pdp-layout">
      <Navbar onNewPost={() => {}} />
      <div className="pdp-inner">
        <div className="pdp-not-found">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#dbdbdb" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <h2>Page not found</h2>
          <p>The post you're looking for may have been deleted or the link is broken.</p>
          <button className="btn btn--primary" style={{ padding: '10px 24px' }} onClick={() => navigate('/')}>Go home</button>
        </div>
      </div>
    </div>
  );

  if (!post) return null;

  const avatarUrl  = mediaUrl(post.avatar);
  const postImgUrl = mediaUrl(post.image_url);
  const initials   = (post.username || 'U')[0].toUpperCase();

  return (
    <div className="pdp-layout">
      <Navbar onNewPost={() => {}} />
      <div className="pdp-inner">
        <div className="pdp-card">

          {/* ── Left: image ── */}
          <div className="pdp-card__img">
            {postImgUrl
              ? <img src={postImgUrl} alt="post" onDoubleClick={toggleLike} />
              : (
                <div className="pdp-card__no-img" onDoubleClick={toggleLike}>
                  <p>{post.caption}</p>
                </div>
              )
            }
          </div>

          {/* ── Right: details ── */}
          <div className="pdp-card__side">

            {/* Header */}
            <div className="pdp-card__hdr">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => navigate(`/${post.username}`)}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="avatar avatar--36" />
                    : <div className="avatar-ph avatar-ph--36">{initials}</div>
                  }
                </div>
                <div>
                  <div
                    className="font-semi"
                    style={{ fontSize: 14, cursor: 'pointer', lineHeight: 1.3 }}
                    onClick={() => navigate(`/${post.username}`)}
                  >
                    {post.username}
                  </div>
                  {post.full_name && (
                    <div className="text-muted" style={{ fontSize: 12 }}>{post.full_name}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!isOwn && (
                  <button
                    onClick={toggleFollow}
                    className={`btn ${following ? 'btn--following-sm' : 'btn--follow-sm'}`}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                )}
                <button
                  onClick={() => setSheet('menu')}
                  className="post-card__dots-btn"
                  aria-label="More options"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <circle cx="5" cy="12" r="1.5"/>
                    <circle cx="12" cy="12" r="1.5"/>
                    <circle cx="19" cy="12" r="1.5"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable comments + caption */}
            <div className="pdp-card__scroll">
              {/* Caption row */}
              {post.caption && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate(`/${post.username}`)}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="avatar avatar--32" />
                      : <div className="avatar-ph avatar-ph--32">{initials}</div>
                    }
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 2 }}>
                    <span
                      className="font-semi"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/${post.username}`)}
                    >
                      {post.username}
                    </span>
                    {' '}{post.caption}
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                      {timeAgo(post.created_at)}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {comments.length === 0 && !post.caption && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                  No comments yet. Be the first!
                </div>
              )}
              {comments.map(c => {
                const ca   = mediaUrl(c.avatar);
                const ci   = (c.username || 'U')[0].toUpperCase();
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    {ca
                      ? <img src={ca} alt="" className="avatar avatar--32" style={{ flexShrink: 0 }} />
                      : <div className="avatar-ph avatar-ph--32" style={{ flexShrink: 0 }}>{ci}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                        <strong>{c.username}</strong> {c.text}
                      </p>
                      <span className="text-muted" style={{ fontSize: 11 }}>{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action row */}
            <div className="pdp-card__actions">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  {/* Like */}
                  <button onClick={toggleLike} className="icon-btn"
                    style={{ color: liked ? 'var(--danger)' : 'var(--text-primary)' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24"
                      fill={liked ? 'var(--danger)' : 'none'}
                      stroke={liked ? 'var(--danger)' : 'currentColor'} strokeWidth="2"
                      style={{ transition: 'transform .15s', transform: liked ? 'scale(1.2)' : 'scale(1)' }}>
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>
                  {/* Comment — focus input */}
                  <button className="icon-btn" onClick={() => cmtInputRef.current?.focus()}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </button>
                  {/* Share */}
                  <button className="icon-btn" onClick={() => setSheet('share')}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
                {/* Bookmark */}
                <button
                  onClick={() => { setBookmarked(p => !p); toast.success(bookmarked ? 'Removed from saved' : 'Saved!'); }}
                  className="icon-btn"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24"
                    fill={bookmarked ? 'var(--text-primary)' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                  </svg>
                </button>
              </div>

              {/* Likes count */}
              <div className="font-bold" style={{ fontSize: 14, marginBottom: 4 }}>
                {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
              </div>

              {/* Timestamp */}
              <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                {timeAgo(post.created_at)}
              </div>
            </div>

            {/* Comment input */}
            <form onSubmit={addComment} className="pdp-card__cmt-form">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
              </svg>
              <input
                ref={cmtInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }}
              />
              {commentText.trim() && (
                <button type="submit" className="btn btn--accent font-bold" style={{ fontSize: 14, flexShrink: 0 }}>
                  Post
                </button>
              )}
            </form>
          </div>
        </div>

        {/* ── ··· Menu sheet ── */}
        {sheet === 'menu' && (
          <div className="ig-sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(null)}>
            <div className="ig-sheet">
              {isOwn ? (
                <>
                  <button className="ig-sheet__btn ig-sheet__btn--danger" onClick={deletePost}>Delete</button>
                  <button className="ig-sheet__btn" onClick={copyLink}>Copy link</button>
                  <button className="ig-sheet__btn ig-sheet__btn--bold" onClick={() => setSheet(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="ig-sheet__btn ig-sheet__btn--danger" onClick={() => {
                    toast.success('Report submitted');
                    setSheet(null);
                  }}>Report</button>
                  <button className="ig-sheet__btn" onClick={() => { toggleFollow(); setSheet(null); }}>
                    {following ? `Unfollow @${post.username}` : `Follow @${post.username}`}
                  </button>
                  <button className="ig-sheet__btn" onClick={() => { copyLink(); setSheet(null); }}>Copy link</button>
                  <button className="ig-sheet__btn" onClick={() => { navigate(`/${post.username}`); setSheet(null); }}>
                    About this account
                  </button>
                  <button className="ig-sheet__btn ig-sheet__btn--bold" onClick={() => setSheet(null)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Share to DM sheet ── */}
        {sheet === 'share' && (
          <PdpShareSheet
            post={post}
            postUrl={postUrl}
            currentUser={currentUser}
            onClose={() => setSheet(null)}
          />
        )}
      </div>
    </div>
  );
}

// ── SHARE SHEET ───────────────────────────────────────────────
function PdpShareSheet({ post, postUrl, currentUser, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState({});
  const debounce              = useRef();

  useEffect(() => {
    axios.get('/api/users/suggestions').then(r => setResults(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) {
      axios.get('/api/users/suggestions').then(r => setResults(r.data)).catch(() => {});
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const sendTo = async (userId, username) => {
    if (sent[userId]) return;
    const payload = JSON.stringify({
      type:      'post_share',
      post_id:   post.id,
      image_url: post.image_url || null,
      caption:   post.caption   || '',
      username:  post.username,
    });
    try {
      await axios.post(`/api/messages/${userId}`, { text: payload });
      setSent(s => ({ ...s, [userId]: true }));
      toast.success(`Sent to ${username}!`);
    } catch { toast.error('Failed to send'); }
  };

  return (
    <div className="ig-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ig-sheet">
        <div className="ig-sheet__title">Share</div>
        <div style={{ padding: '8px 16px 12px' }}>
          <div className="search-box" style={{ background: 'var(--border-light)' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              className="search-box__input"
              autoFocus
            />
          </div>
        </div>

        {/* Copy link quick row */}
        <div
          onClick={() => { navigator.clipboard.writeText(postUrl).then(() => toast.success('Link copied!')); onClose(); }}
          className="ig-share-copy-row"
        >
          <div className="ig-share-copy-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--text-primary)" strokeWidth="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Copy link</span>
        </div>

        {/* User list */}
        <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center' }} className="text-muted">Searching…</div>}
          {!loading && results.filter(u => u.id !== currentUser?.id).map(u => {
            const uAv    = mediaUrl(u.avatar);
            const uInit  = (u.username || 'U')[0].toUpperCase();
            const wasSent = !!sent[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <div style={{ flexShrink: 0 }}>
                  {uAv
                    ? <img src={uAv} alt="" className="avatar avatar--44" />
                    : <div className="avatar-ph avatar-ph--44">{uInit}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate font-semi" style={{ fontSize: 14 }}>{u.username}</div>
                  {u.full_name && <div className="truncate text-muted" style={{ fontSize: 13 }}>{u.full_name}</div>}
                </div>
                <button
                  onClick={() => sendTo(u.id, u.username)}
                  className={wasSent ? 'btn btn--secondary' : 'btn btn--primary'}
                  style={{ flexShrink: 0, fontSize: 13, padding: '6px 18px' }}
                  disabled={wasSent}
                >
                  {wasSent ? 'Sent' : 'Send'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '8px 16px 4px', borderTop: '1px solid var(--border-light)' }}>
          <button className="ig-sheet__btn ig-sheet__btn--bold" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
