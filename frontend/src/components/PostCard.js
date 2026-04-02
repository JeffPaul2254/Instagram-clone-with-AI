import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { timeAgo, mediaUrl } from '../utils/helpers';

export default function PostCard({ post, currentUser, onDeleted, onUpdated }) {
  const [liked, setLiked]               = useState(post.user_liked > 0);
  const [likesCount, setLikesCount]     = useState(Number(post.likes_count));
  const [comments, setComments]         = useState([]);
  const [commentsCount, setCommentsCount] = useState(Number(post.comments_count));
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [heartAnim, setHeartAnim]       = useState(false);
  const [bookmarked, setBookmarked]     = useState(false);
  const [following, setFollowing]       = useState(false);
  const [showDots, setShowDots]         = useState(false);
  const [caption, setCaption]           = useState(post.caption || '');
  const [showEditModal, setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLikes, setShowLikes]           = useState(false);

  const isOwnPost   = currentUser?.id === post.user_id;
  const navigate    = useNavigate();
  const goToProfile = () => navigate(`/${post.username}`);
  const avatarUrl   = mediaUrl(post.avatar);
  const postImageUrl = mediaUrl(post.image_url);
  const initials    = (post.username || 'U')[0].toUpperCase();

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => newLiked ? c + 1 : c - 1);
    if (newLiked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 700); }
    try { await axios.post(`/api/posts/${post.id}/like`); }
    catch { setLiked(!newLiked); setLikesCount(c => newLiked ? c - 1 : c + 1); }
  };

  const loadComments = async () => {
    if (!showComments && comments.length === 0) {
      const { data } = await axios.get(`/api/posts/${post.id}/comments`);
      setComments(data);
    }
    setShowComments(p => !p);
  };

  const addComment = async e => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await axios.post(`/api/posts/${post.id}/comments`, { text: commentText });
      setComments(p => [...p, data]);
      setCommentsCount(c => c + 1);
      setCommentText('');
    } catch { toast.error('Failed to comment'); }
  };

  const toggleFollow = async () => {
    const newVal = !following;
    setFollowing(newVal);
    try {
      await axios.post(`/api/users/${post.user_id}/follow`);
      toast.success(newVal ? `Following ${post.username}` : `Unfollowed ${post.username}`);
    } catch { setFollowing(!newVal); }
  };

  const handleCaptionSaved = (newCaption) => {
    setCaption(newCaption);
    setShowEditModal(false);
    if (onUpdated) onUpdated({ ...post, caption: newCaption });
    toast.success('Post updated!');
  };

  const handleDeleted = () => {
    setShowDeleteModal(false);
    if (onDeleted) onDeleted(post.id);
  };

  const ownDotsActions = [
    { label: 'Edit',               action: () => { setShowDots(false); setShowEditModal(true); } },
    { label: 'Delete',             action: () => { setShowDots(false); setShowDeleteModal(true); }, danger: true },
    { label: 'Hide like count',    action: () => { toast('Done'); setShowDots(false); } },
    { label: 'Turn off commenting',action: () => { toast('Done'); setShowDots(false); } },
    { label: 'Copy link',          action: () => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); setShowDots(false); } },
    { label: 'Cancel',             action: () => setShowDots(false), bold: true },
  ];

  const otherDotsActions = [
    { label: 'Report',             action: () => { toast('Reported'); setShowDots(false); }, danger: true },
    { label: 'Not interested',     action: () => { toast('Got it!'); setShowDots(false); } },
    { label: 'Go to post',         action: () => setShowDots(false) },
    { label: 'Share to...',        action: () => { toast('Share coming soon'); setShowDots(false); } },
    { label: 'Copy link',          action: () => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); setShowDots(false); } },
    { label: 'Embed',              action: () => { toast('Embed coming soon'); setShowDots(false); } },
    { label: 'About this account', action: () => { goToProfile(); setShowDots(false); } },
    { label: 'Cancel',             action: () => setShowDots(false), bold: true },
  ];

  const dotsActions = isOwnPost ? ownDotsActions : otherDotsActions;

  return (
    <>
      <div className="post-card">
        {/* Header */}
        <div className="post-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={goToProfile} style={{ cursor: 'pointer' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="avatar avatar--32" />
                : <div className="avatar-ph avatar-ph--32">{initials}</div>
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span onClick={goToProfile} className="font-semi" style={{ fontSize: 14, cursor: 'pointer' }}>{post.username}</span>
              <span className="text-muted">•</span>
              <span className="text-muted" style={{ fontSize: 13 }}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isOwnPost && (
              <button
                onClick={toggleFollow}
                className={`btn ${following ? 'btn--following-sm' : 'btn--follow-sm'}`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDots(p => !p)}
                style={{ fontSize: 20, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', lineHeight: 1, letterSpacing: 2 }}>···</button>
              {showDots && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowDots(false)} />
                  <div className="dropdown" style={{ right: 0, top: '100%', minWidth: 260, marginTop: 4 }}>
                    {dotsActions.map((a, i) => (
                      <React.Fragment key={a.label}>
                        {i > 0 && <div className="divider-lt" />}
                        <button onClick={a.action}
                          className={`dropdown__item${a.danger ? ' dropdown__item--danger' : ''}${a.bold ? ' dropdown__item--bold' : ''}`}>
                          {a.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Image */}
        {postImageUrl && (
          <div className="post-card__img-wrap" onDoubleClick={toggleLike}>
            <img src={postImageUrl} alt="post" className="post-card__img" />
            {heartAnim && (
              <div className="post-card__heart">
                <svg viewBox="0 0 24 24" width="90" height="90" fill="white" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))' }}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="post-card__actions">
          <div className="post-card__act-grp">
            <button onClick={toggleLike} className="icon-btn" style={{ color: liked ? 'var(--danger)' : 'var(--text-primary)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill={liked ? 'var(--danger)' : 'none'} stroke={liked ? 'var(--danger)' : 'currentColor'} strokeWidth="2"
                style={{ transition: 'transform .15s', transform: liked ? 'scale(1.2)' : 'scale(1)' }}>
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
            <button onClick={loadComments} className="icon-btn">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <button onClick={() => { setBookmarked(p => !p); toast.success(bookmarked ? 'Removed from saved' : 'Saved!'); }} className="icon-btn">
            <svg viewBox="0 0 24 24" width="24" height="24" fill={bookmarked ? 'var(--text-primary)' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>

        {/* Likes */}
        <div style={{ padding: '0 16px 4px' }}>
          <button
            onClick={() => likesCount > 0 && setShowLikes(true)}
            style={{
              fontWeight: 600, fontSize: 14, background: 'none', border: 'none',
              padding: 0, cursor: likesCount > 0 ? 'pointer' : 'default',
              color: 'var(--text-primary)',
            }}
          >
            {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
          </button>
        </div>

        {/* Caption */}
        {caption && (
          <div style={{ padding: '2px 16px 6px', fontSize: 14, lineHeight: 1.5 }}>
            <span className="font-semi">{post.username}</span> {caption}
          </div>
        )}

        {/* View comments toggle */}
        {commentsCount > 0 && (
          <button onClick={loadComments}
            style={{ padding: '0 16px 4px', display: 'block', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
            className="text-muted">
            {showComments ? 'Hide comments' : `View all ${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* Comments */}
        {showComments && (
          <div className="post-card__cmts">
            {comments.map(c => (
              <div key={c.id} className="post-card__cmt-row">
                <span className="font-semi">{c.username}</span> {c.text}
                <span className="text-muted" style={{ fontSize: 11, marginLeft: 8 }}>{timeAgo(c.created_at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        <form onSubmit={addComment} className="post-card__cmt-form">
          <input value={commentText} onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment..." className="post-card__cmt-input" />
          {commentText && (
            <button type="submit" className="btn btn--accent font-bold" style={{ fontSize: 14 }}>Post</button>
          )}
        </form>
      </div>

      {showEditModal && (
        <EditPostModal
          post={{ ...post, caption }}
          onClose={() => setShowEditModal(false)}
          onSaved={handleCaptionSaved}
        />
      )}
      {showDeleteModal && (
        <DeletePostModal
          postId={post.id}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleDeleted}
        />
      )}
      {showLikes && (
        <LikesModal
          postId={post.id}
          currentUser={currentUser}
          onClose={() => setShowLikes(false)}
        />
      )}
    </>
  );
}

// ── EDIT POST MODAL ───────────────────────────────────────────
function EditPostModal({ post, onClose, onSaved }) {
  const [caption, setCaption] = useState(post.caption || '');
  const [saving, setSaving]   = useState(false);
  const textareaRef = useRef();
  const MAX = 2200;

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/posts/${post.id}/caption`, { caption });
      onSaved(caption);
    } catch { toast.error('Failed to update post'); }
    finally { setSaving(false); }
  };

  const imgUrl    = mediaUrl(post.image_url);
  const avatarUrl = mediaUrl(post.avatar);
  const initials  = (post.username || 'U')[0].toUpperCase();

  return (
    <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--edit-post">
        <div className="epm__header">
          <button className="epm__hdr-btn" onClick={onClose}>Cancel</button>
          <span className="font-bold" style={{ fontSize: 16 }}>Edit info</span>
          <button className="epm__hdr-btn text-accent font-bold" onClick={save} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
        <div className="epm__body">
          {imgUrl && (
            <div className="epm__img-pane">
              <img src={imgUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div className="epm__edit">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="avatar avatar--32" />
                : <div className="avatar-ph avatar-ph--32">{initials}</div>
              }
              <span className="font-semi" style={{ fontSize: 14 }}>{post.username}</span>
            </div>
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, MAX))}
              placeholder="Write a caption..."
              autoFocus
              className="epm__textarea"
            />
            <div style={{ padding: '6px 16px 12px', textAlign: 'right', fontSize: 12, color: caption.length > MAX - 50 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {caption.length} / {MAX}
            </div>
            <div className="divider-lt" />
            <div className="epm__extra">
              <span style={{ fontSize: 14 }}>Add alt text</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
            <div className="divider-lt" />
            <div className="epm__extra">
              <span style={{ fontSize: 14 }}>Add location</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8e8e8e" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DELETE CONFIRMATION MODAL ─────────────────────────────────
function DeletePostModal({ postId, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/posts/${postId}`);
      onDeleted();
    } catch {
      toast.error('Failed to delete post');
      setDeleting(false);
    }
  };

  return (
    <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--delete">
        <div className="del-modal__top">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--text-primary)" strokeWidth="1.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Delete post?</h3>
          <p className="text-muted" style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
            Are you sure you want to delete this post? This action cannot be undone.
          </p>
        </div>
        <div className="divider" />
        <button onClick={handleDelete} disabled={deleting}
          style={{ display: 'block', width: '100%', padding: 16, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none', opacity: deleting ? 0.6 : 1 }}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
        <div className="divider" />
        <button onClick={onClose}
          style={{ display: 'block', width: '100%', padding: 16, textAlign: 'center', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
// ── LIKES MODAL ───────────────────────────────────────────────
// Shows the list of users who liked a post.
// Each row has a Follow / Following button (hidden for your own row).
function LikesModal({ postId, currentUser, onClose }) {
  const navigate = useNavigate();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [following, setFollowing] = useState({});

  useEffect(() => {
    axios.get(`/api/posts/${postId}/likes`)
      .then(r => {
        setUsers(r.data);
        const init = {};
        r.data.forEach(u => { init[u.id] = !!u.is_following; });
        setFollowing(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const toggleFollow = async (userId) => {
    const was = following[userId];
    setFollowing(f => ({ ...f, [userId]: !was }));
    try {
      await axios.post(`/api/users/${userId}/follow`);
      toast.success(was ? 'Unfollowed' : 'Followed!');
    } catch {
      setFollowing(f => ({ ...f, [userId]: was }));
    }
  };

  return (
    <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--likes">

        {/* Header */}
        <div className="modal__header" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <button className="modal__close" onClick={onClose}>×</button>
          <span className="font-bold" style={{ fontSize: 16 }}>Likes</span>
          <div style={{ width: 24 }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Skeleton */}
          {loading && [1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div className="shimmer" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="shimmer" style={{ width: '45%', height: 12, borderRadius: 4, marginBottom: 6 }} />
                <div className="shimmer" style={{ width: '30%', height: 11, borderRadius: 4 }} />
              </div>
              <div className="shimmer" style={{ width: 80, height: 30, borderRadius: 8 }} />
            </div>
          ))}

          {/* Empty */}
          {!loading && users.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <p className="text-muted" style={{ marginTop: 16, fontSize: 14 }}>No likes yet.</p>
            </div>
          )}

          {/* User rows */}
          {!loading && users.map(u => {
            const avatarUrl  = mediaUrl(u.avatar);
            const initials   = (u.username || 'U')[0].toUpperCase();
            const isSelf     = u.id === currentUser?.id;
            const isFollowed = following[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <div
                  style={{ flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => { onClose(); navigate(`/${u.username}`); }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="avatar avatar--44" />
                    : <div className="avatar-ph avatar-ph--44">{initials}</div>
                  }
                </div>
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => { onClose(); navigate(`/${u.username}`); }}
                >
                  <div className="truncate font-semi" style={{ fontSize: 14 }}>{u.username}</div>
                  {u.full_name && (
                    <div className="truncate text-muted" style={{ fontSize: 13 }}>{u.full_name}</div>
                  )}
                </div>
                {!isSelf && (
                  <button
                    onClick={() => toggleFollow(u.id)}
                    className={`btn ${isFollowed ? 'btn--following' : 'btn--follow'}`}
                    style={{ flexShrink: 0, fontSize: 13, padding: '6px 16px' }}
                  >
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
