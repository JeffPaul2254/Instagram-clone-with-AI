import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function ExplorePage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    axios.get('/api/posts/explore')
      .then(r => setPosts(r.data))
      .catch(() => toast.error('Failed to load explore'))
      .finally(() => setLoading(false));
  }, []);

  const handleNewPost = (post) => setPosts(p => [post, ...p]);

  // Real Instagram explore grid layout:
  // Every 7 posts = 1 featured block (large) + 2 small + 4 small
  // Row pattern: [big(spans 2 rows), small, small] then [small, small, small]
  // We tile this pattern repeatedly
  const buildGrid = (posts) => {
    const sections = [];
    let i = 0;
    let sectionIndex = 0;
    while (i < posts.length) {
      const isRightBig = sectionIndex % 2 === 1; // alternate big left / big right
      const chunk = posts.slice(i, i + 6);
      sections.push({ posts: chunk, bigRight: isRightBig });
      i += 6;
      sectionIndex++;
    }
    return sections;
  };

  const sections = buildGrid(posts);

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <Navbar onNewPost={handleNewPost} />

      <div style={{ marginLeft: 72, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 935, padding: '20px 0 60px' }}>

          {/* Loading skeleton */}
          {loading && <ExploreSkeleton />}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
              <div style={{ width: 62, height: 62, borderRadius: '50%', border: '2px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="#262626" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 300, marginBottom: 12 }}>Nothing to explore yet</h2>
              <p style={{ color: '#8e8e8e', fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
                Start following accounts and create posts to see content here.
              </p>
            </div>
          )}

          {/* Explore grid */}
          {!loading && posts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sections.map((section, si) => (
                <ExploreSection
                  key={si}
                  posts={section.posts}
                  bigRight={section.bigRight}
                  onPostClick={setSelectedPost}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onDeleted={(id) => { setPosts(p => p.filter(x => x.id !== id)); setSelectedPost(null); }}
          onUpdated={(u) => { setPosts(p => p.map(x => x.id === u.id ? { ...x, ...u } : x)); setSelectedPost(p => ({ ...p, ...u })); }}
        />
      )}
    </div>
  );
}

// ── EXPLORE SECTION ───────────────────────────────────────────
// Each section = 6 posts: 1 big (2x2) + 2 small on one side, then 3 small row
// Layout A (bigLeft):  [BIG | sm] [BIG | sm] [sm sm sm]
// Layout B (bigRight): [sm | BIG] [sm | BIG] [sm sm sm]
function ExploreSection({ posts, bigRight, onPostClick }) {
  if (posts.length === 0) return null;

  const topTwo = posts.slice(1, 3);   // 2 smalls alongside the big
  const bottomThree = posts.slice(3, 6); // 3 smalls in a row

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top 2 rows: big + 2 smalls */}
      <div style={{ display: 'grid', gridTemplateColumns: bigRight ? '1fr 2fr' : '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 3, aspectRatio: '3/1' }}>
        {bigRight ? (
          <>
            {/* Left: 2 smalls stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {topTwo.map((p, i) => p ? <GridCell key={p.id} post={p} onClick={() => onPostClick(p)} /> : <div key={i} style={{ flex: 1, background: '#fafafa' }} />)}
            </div>
            {/* Right: big spanning 2 rows */}
            <div style={{ gridRow: 'span 2' }}>
              {posts[0] && <GridCell post={posts[0]} onClick={() => onPostClick(posts[0])} big />}
            </div>
          </>
        ) : (
          <>
            {/* Left: big spanning 2 rows */}
            <div style={{ gridRow: 'span 2' }}>
              {posts[0] && <GridCell post={posts[0]} onClick={() => onPostClick(posts[0])} big />}
            </div>
            {/* Right: 2 smalls stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {topTwo.map((p, i) => p ? <GridCell key={p.id} post={p} onClick={() => onPostClick(p)} /> : <div key={i} style={{ flex: 1, background: '#fafafa' }} />)}
            </div>
          </>
        )}
      </div>

      {/* Bottom row: 3 equal smalls */}
      {bottomThree.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {bottomThree.map((p, i) => p
            ? <GridCell key={p.id} post={p} onClick={() => onPostClick(p)} />
            : <div key={i} style={{ aspectRatio: '1', background: '#fafafa' }} />
          )}
        </div>
      )}
    </div>
  );
}

// ── GRID CELL ─────────────────────────────────────────────────
function GridCell({ post, onClick, big = false }) {
  const [hovered, setHovered] = useState(false);
  const imgUrl = post.image_url ? `http://localhost:5000${post.image_url}` : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: big ? '100%' : undefined,
        aspectRatio: big ? undefined : '1',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#efefef',
        flex: big ? undefined : 1,
      }}
    >
      {imgUrl
        ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', minHeight: 120, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <p style={{ color: '#fff', fontSize: big ? 16 : 12, textAlign: 'center', lineHeight: 1.4 }}>{post.caption}</p>
          </div>
      }

      {/* Hover overlay */}
      {hovered && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: 700, fontSize: big ? 18 : 15 }}>
            <svg viewBox="0 0 24 24" width={big ? 22 : 18} height={big ? 22 : 18} fill="white">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {Number(post.likes_count).toLocaleString()}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: 700, fontSize: big ? 18 : 15 }}>
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
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(post.user_liked > 0);
  const [likesCount, setLikesCount] = useState(Number(post.likes_count));
  const [bookmarked, setBookmarked] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const [captionText] = useState(post.caption || '');
  const isOwn = currentUser?.id === post.user_id;

  useEffect(() => {
    axios.get(`/api/posts/${post.id}/comments`).then(r => setComments(r.data)).catch(() => {});
  }, [post.id]);

  const toggleLike = async () => {
    setLiked(p => !p);
    setLikesCount(c => liked ? c - 1 : c + 1);
    await axios.post(`/api/posts/${post.id}/like`).catch(() => {});
  };

  const [localComment, setLocalComment] = useState('');
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

  function timeAgo(d) {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  const av = post.avatar ? `http://localhost:5000${post.avatar}` : null;
  const imgUrl = post.image_url ? `http://localhost:5000${post.image_url}` : null;
  const init = (post.username || 'U')[0].toUpperCase();
  const avatarEl = av
    ? <img src={av} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${post.username}`); }} />
    : <div onClick={() => { onClose(); navigate(`/${post.username}`); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{init}</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <button onClick={onClose} style={{ position: 'fixed', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 32, lineHeight: 1, zIndex: 2001 }}>×</button>

      <div style={{ background: '#fff', borderRadius: 4, overflow: 'hidden', display: 'flex', width: '90vw', maxWidth: 900, height: '80vh' }}>
        {/* Image */}
        <div style={{ flex: '0 0 55%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {imgUrl
            ? <img src={imgUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <p style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>{captionText}</p>
              </div>
          }
        </div>

        {/* Detail */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderLeft: '1px solid #dbdbdb' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #efefef', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {avatarEl}
              <span onClick={() => { onClose(); navigate(`/${post.username}`); }} style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{post.username}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDots(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '2px 8px', letterSpacing: 2 }}>···</button>
              {showDots && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowDots(false)} />
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #dbdbdb', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,.15)', minWidth: 220, zIndex: 999, overflow: 'hidden', marginTop: 4 }}>
                    {isOwn ? (
                      <>
                        <button style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'center', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none', color: '#ed4956', fontWeight: 700 }} onClick={deletePost}>Delete post</button>
                        <div style={{ height: 1, background: '#efefef' }} />
                        <button style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'center', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setShowDots(false)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'center', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none', color: '#ed4956', fontWeight: 700 }} onClick={() => { toast('Reported'); setShowDots(false); }}>Report</button>
                        <div style={{ height: 1, background: '#efefef' }} />
                        <button style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'center', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setShowDots(false)}>Cancel</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Comments scroll */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {captionText && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {avatarEl}
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}><strong>{post.username}</strong> {captionText}</p>
              </div>
            )}
            {comments.length === 0 && !captionText && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8e8e8e', fontSize: 14 }}>No comments yet.</div>
            )}
            {comments.map(c => {
              const ca = c.avatar ? `http://localhost:5000${c.avatar}` : null;
              const ci = (c.username || 'U')[0].toUpperCase();
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {ca ? <img src={ca} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{ci}</div>}
                  <div>
                    <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}><strong>{c.username}</strong> {c.text}</p>
                    <span style={{ color: '#8e8e8e', fontSize: 11 }}>{timeAgo(c.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ padding: '8px 16px 4px', borderTop: '1px solid #efefef', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <button onClick={toggleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : '#262626'} strokeWidth="2" style={{ transition: 'transform .15s', transform: liked ? 'scale(1.15)' : 'scale(1)' }}>
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </button>
              </div>
              <button onClick={() => setBookmarked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill={bookmarked ? '#262626' : 'none'} stroke="#262626" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</div>
            <div style={{ color: '#8e8e8e', fontSize: 11, textTransform: 'uppercase' }}>{timeAgo(post.created_at)}</div>
          </div>

          {/* Comment form */}
          <form onSubmit={addComment} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: '1px solid #efefef', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
            <input
              value={localComment}
              onChange={e => setLocalComment(e.target.value)}
              placeholder="Add a comment..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14 }}
            />
            {localComment && <button type="submit" style={{ color: '#0095f6', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Post</button>}
          </form>
        </div>
      </div>
    </div>
  );
}

// ── SKELETON ──────────────────────────────────────────────────
function ExploreSkeleton() {
  const p = { background: 'linear-gradient(90deg,#efefef 25%,#e0e0e0 50%,#efefef 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' };
  return (
    <div>
      <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
      {[0, 1].map(i => (
        <div key={i} style={{ marginBottom: 3 }}>
          <div style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '2fr 1fr' : '1fr 2fr', gap: 3, marginBottom: 3 }}>
            <div style={{ ...p, aspectRatio: '1', gridRow: 'span 2' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ ...p, flex: 1, minHeight: 100 }} />
              <div style={{ ...p, flex: 1, minHeight: 100 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
            {[0, 1, 2].map(j => <div key={j} style={{ ...p, aspectRatio: '1' }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
