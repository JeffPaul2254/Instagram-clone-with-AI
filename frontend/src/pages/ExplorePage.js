import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { timeAgo, mediaUrl } from '../utils/helpers';
import Navbar from '../components/Navbar';

export default function ExplorePage() {
  const { user: currentUser } = useAuth();
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    axios.get('/api/posts/explore')
      .then(r => setPosts(r.data))
      .catch(() => toast.error('Failed to load explore'))
      .finally(() => setLoading(false));
  }, []);

  const handleNewPost = (post) => setPosts(p => [post, ...p]);

  const buildGrid = (posts) => {
    const sections = [];
    let i = 0, si = 0;
    while (i < posts.length) {
      const bigRight = si % 2 === 1;
      sections.push({ posts: posts.slice(i, i + 6), bigRight });
      i += 6; si++;
    }
    return sections;
  };

  const sections = buildGrid(posts);

  return (
    <div className="explore-layout">
      <Navbar onNewPost={handleNewPost} />
      <div className="explore-inner">
        <div className="explore-content">
          {loading && <ExploreSkeleton />}

          {!loading && posts.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
              <div className="profile-empty__icon">
                <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 300, marginBottom: 12 }}>Nothing to explore yet</h2>
              <p className="text-muted" style={{ fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
                Start following accounts and create posts to see content here.
              </p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="explore-grid">
              {sections.map((section, si) => (
                <ExploreSection key={si} posts={section.posts} bigRight={section.bigRight} onPostClick={setSelectedPost} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onDeleted={(id) => { setPosts(p => p.filter(x => x.id !== id)); setSelectedPost(null); }}
          onUpdated={(u)  => { setPosts(p => p.map(x => x.id === u.id ? { ...x, ...u } : x)); setSelectedPost(p => ({ ...p, ...u })); }}
        />
      )}
    </div>
  );
}

// ── EXPLORE SECTION ───────────────────────────────────────────
function ExploreSection({ posts, bigRight, onPostClick }) {
  if (posts.length === 0) return null;
  const topTwo      = posts.slice(1, 3);
  const bottomThree = posts.slice(3, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: bigRight ? '1fr 2fr' : '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 3, aspectRatio: '3/1' }}>
        {bigRight ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {topTwo.map((p, i) => p ? <GridCell key={p.id} post={p} onClick={() => onPostClick(p)} /> : <div key={i} style={{ flex: 1, background: 'var(--bg)' }} />)}
            </div>
            <div style={{ gridRow: 'span 2' }}>
              {posts[0] && <GridCell post={posts[0]} onClick={() => onPostClick(posts[0])} big />}
            </div>
          </>
        ) : (
          <>
            <div style={{ gridRow: 'span 2' }}>
              {posts[0] && <GridCell post={posts[0]} onClick={() => onPostClick(posts[0])} big />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {topTwo.map((p, i) => p ? <GridCell key={p.id} post={p} onClick={() => onPostClick(p)} /> : <div key={i} style={{ flex: 1, background: 'var(--bg)' }} />)}
            </div>
          </>
        )}
      </div>
      {bottomThree.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {bottomThree.map((p, i) => p
            ? <GridCell key={p.id} post={p} onClick={() => onPostClick(p)} />
            : <div key={i} style={{ aspectRatio: '1', background: 'var(--bg)' }} />
          )}
        </div>
      )}
    </div>
  );
}

// ── GRID CELL ─────────────────────────────────────────────────
function GridCell({ post, onClick, big = false }) {
  const [hovered, setHovered] = useState(false);
  const imgUrl = mediaUrl(post.image_url);

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`grid-cell${big ? ' grid-cell--big' : ' grid-cell--aspect'}`}
      style={!big ? { aspectRatio: '1' } : {}}>
      {imgUrl
        ? <img src={imgUrl} alt="" />
        : <div style={{ width: '100%', height: '100%', minHeight: 120, background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <p style={{ color: '#fff', fontSize: big ? 16 : 12, textAlign: 'center', lineHeight: 1.4 }}>{post.caption}</p>
          </div>
      }
      {hovered && (
        <div className="grid-cell__hover">
          <span className={`grid-cell__stat grid-cell__stat--${big ? 'big' : 'sm'}`}>
            <svg viewBox="0 0 24 24" width={big ? 22 : 18} height={big ? 22 : 18} fill="white">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {Number(post.likes_count).toLocaleString()}
          </span>
          <span className={`grid-cell__stat grid-cell__stat--${big ? 'big' : 'sm'}`}>
            <svg viewBox="0 0 24 24" width={big ? 22 : 18} height={big ? 22 : 18} fill="white">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            {Number(post.comments_count).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── POST DETAIL MODAL ─────────────────────────────────────────
function PostDetailModal({ post, currentUser, onClose, onDeleted, onUpdated }) {
  const navigate = useNavigate();
  const [comments, setComments]       = useState([]);
  const [localComment, setLocalComment] = useState('');
  const [liked, setLiked]             = useState(post.user_liked > 0);
  const [likesCount, setLikesCount]   = useState(Number(post.likes_count));
  const [bookmarked, setBookmarked]   = useState(false);
  const [showDots, setShowDots]       = useState(false);
  const [captionText]                 = useState(post.caption || '');
  const isOwn = currentUser?.id === post.user_id;

  useEffect(() => {
    axios.get(`/api/posts/${post.id}/comments`).then(r => setComments(r.data)).catch(() => {});
  }, [post.id]);

  const toggleLike = async () => {
    setLiked(p => !p);
    setLikesCount(c => liked ? c - 1 : c + 1);
    await axios.post(`/api/posts/${post.id}/like`).catch(() => {});
  };

  const addComment = async e => {
    e.preventDefault();
    if (!localComment.trim()) return;
    try {
      const { data } = await axios.post(`/api/posts/${post.id}/comments`, { text: localComment });
      setComments(p => [...p, data]);
      setLocalComment('');
    } catch { toast.error('Failed to comment'); }
  };

  const deletePost = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await axios.delete(`/api/posts/${post.id}`); toast.success('Post deleted'); onDeleted(post.id); }
    catch { toast.error('Failed to delete'); }
  };

  const av     = mediaUrl(post.avatar);
  const imgUrl = mediaUrl(post.image_url);
  const init   = (post.username || 'U')[0].toUpperCase();

  const avatarEl = av
    ? <img src={av} alt="" className="avatar avatar--32" style={{ cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${post.username}`); }} />
    : <div className="avatar-ph avatar-ph--32" style={{ cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${post.username}`); }}>{init}</div>;

  return (
    <div className="overlay overlay--dark" onClick={e => e.target === e.currentTarget && onClose()}>
      <button onClick={onClose} style={{ position: 'fixed', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 32, lineHeight: 1, zIndex: 2001 }}>×</button>
      <div className="post-detail">
        <div className="post-detail__img">
          {imgUrl
            ? <img src={imgUrl} alt="post" />
            : <div style={{ width: '100%', height: '100%', background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <p style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>{captionText}</p>
              </div>
          }
        </div>
        <div className="post-detail__side">
          <div className="post-detail__hdr">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {avatarEl}
              <span className="font-semi" style={{ fontSize: 14, cursor: 'pointer' }}
                onClick={() => { onClose(); navigate(`/${post.username}`); }}>{post.username}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDots(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '2px 8px', letterSpacing: 2 }}>···</button>
              {showDots && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowDots(false)} />
                  <div className="dropdown" style={{ right: 0, top: '100%', minWidth: 220, marginTop: 4 }}>
                    {isOwn ? (
                      <>
                        <button className="dropdown__item dropdown__item--danger" onClick={deletePost}>Delete post</button>
                        <div className="divider-lt" />
                        <button className="dropdown__item" onClick={() => setShowDots(false)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="dropdown__item dropdown__item--danger" onClick={() => { toast('Reported'); setShowDots(false); }}>Report</button>
                        <div className="divider-lt" />
                        <button className="dropdown__item" onClick={() => setShowDots(false)}>Cancel</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="post-detail__scroll">
            {captionText && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {avatarEl}
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}><strong>{post.username}</strong> {captionText}</p>
              </div>
            )}
            {comments.length === 0 && !captionText && (
              <div style={{ textAlign: 'center', padding: '40px 0' }} className="text-muted">No comments yet.</div>
            )}
            {comments.map(c => {
              const ca  = mediaUrl(c.avatar);
              const ci  = (c.username || 'U')[0].toUpperCase();
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {ca ? <img src={ca} alt="" className="avatar avatar--32" /> : <div className="avatar-ph avatar-ph--32">{ci}</div>}
                  <div>
                    <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}><strong>{c.username}</strong> {c.text}</p>
                    <span className="text-muted" style={{ fontSize: 11 }}>{timeAgo(c.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="post-detail__actions">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <button onClick={toggleLike} className="icon-btn">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill={liked ? 'var(--danger)' : 'none'} stroke={liked ? 'var(--danger)' : 'currentColor'} strokeWidth="2"
                    style={{ transition: 'transform .15s', transform: liked ? 'scale(1.15)' : 'scale(1)' }}>
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <button className="icon-btn">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </button>
              </div>
              <button onClick={() => setBookmarked(p => !p)} className="icon-btn">
                <svg viewBox="0 0 24 24" width="24" height="24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                </svg>
              </button>
            </div>
            <div className="font-bold" style={{ fontSize: 14, marginBottom: 4 }}>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</div>
            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{timeAgo(post.created_at)}</div>
          </div>

          <form onSubmit={addComment} className="post-detail__cmt-form">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
            <input value={localComment} onChange={e => setLocalComment(e.target.value)}
              placeholder="Add a comment..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14 }} />
            {localComment && (
              <button type="submit" className="btn btn--accent font-bold" style={{ fontSize: 14, flexShrink: 0 }}>Post</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ── SKELETON ──────────────────────────────────────────────────
function ExploreSkeleton() {
  return (
    <div>
      {[0, 1].map(i => (
        <div key={i} style={{ marginBottom: 3 }}>
          <div style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '2fr 1fr' : '1fr 2fr', gap: 3, marginBottom: 3 }}>
            <div className="shimmer" style={{ aspectRatio: '1', gridRow: 'span 2' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="shimmer" style={{ flex: 1, minHeight: 100 }} />
              <div className="shimmer" style={{ flex: 1, minHeight: 100 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
            {[0, 1, 2].map(j => <div key={j} className="shimmer" style={{ aspectRatio: '1' }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
