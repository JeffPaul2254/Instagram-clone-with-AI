import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { timeAgo, mediaUrl } from '../utils/helpers';
import Navbar from '../components/Navbar';

export default function ProfilePage() {
  const { username }           = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate               = useNavigate();
  const [profile, setProfile]       = useState(null);
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [following, setFollowing]   = useState(false);
  const [activeTab, setActiveTab]   = useState('posts');
  const [showEditModal, setShowEditModal]   = useState(false);
  const [selectedPost, setSelectedPost]     = useState(null);
  const [followListModal, setFollowListModal] = useState(null); // 'followers' | 'following' | null

  useEffect(() => {
    setLoading(true); setProfile(null); setPosts([]); setActiveTab('posts');
    (async () => {
      try {
        const [pr, po] = await Promise.all([
          axios.get(`/api/users/${username}/profile`),
          axios.get(`/api/users/${username}/posts`),
        ]);
        setProfile(pr.data); setFollowing(pr.data.is_following); setPosts(po.data);
      } catch (err) {
        if (err.response?.status === 404) navigate('/'); else toast.error('Failed to load profile');
      } finally { setLoading(false); }
    })();
  }, [username]); // eslint-disable-line

  const toggleFollow = async () => {
    const prev = following; setFollowing(!prev);
    setProfile(p => ({ ...p, followers_count: prev ? p.followers_count - 1 : p.followers_count + 1 }));
    try { await axios.post(`/api/users/${profile.id}/follow`); toast.success(!prev ? `Following ${profile.username}` : `Unfollowed ${profile.username}`); }
    catch { setFollowing(prev); setProfile(p => ({ ...p, followers_count: prev ? p.followers_count + 1 : p.followers_count - 1 })); }
  };

  const handleNewPost       = (post) => { setPosts(p => [post, ...p]); setProfile(p => p ? { ...p, posts_count: Number(p.posts_count) + 1 } : p); };
  const handlePostDeleted   = (id)   => { setPosts(p => p.filter(x => x.id !== id)); setSelectedPost(null); setProfile(p => ({ ...p, posts_count: Math.max(0, p.posts_count - 1) })); };
  const handleProfileUpdated = (u)   => { setProfile(p => ({ ...p, ...u })); updateUser(u); setShowEditModal(false); toast.success('Profile updated!'); };

  if (loading) return (
    <div className="profile-layout">
      <Navbar onNewPost={handleNewPost} />
      <div className="profile-inner" style={{ paddingTop: 60 }}>
        <ProfileSkeleton />
      </div>
    </div>
  );
  if (!profile) return null;

  const avatarUrl = mediaUrl(profile.avatar);
  const initials  = (profile.username || 'U')[0].toUpperCase();
  const isOwn     = profile.is_own;

  return (
    <div className="profile-layout">
      <Navbar onNewPost={handleNewPost} />
      <div className="profile-inner">
        <div className="profile-content">

          {/* HEADER */}
          <div className="profile-header">
            <div className="profile-hdr__av">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="avatar avatar--150" style={{ border: '1px solid var(--border)' }} />
                : <div className="avatar-ph avatar-ph--150">{initials}</div>
              }
            </div>
            <div className="profile-hdr__info">
              {/* Username row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 300, margin: 0 }}>{profile.username}</h1>
                {!isOwn && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={toggleFollow} className={`btn ${following ? 'btn--following' : 'btn--follow'}`}>
                      {following ? 'Following' : 'Follow'}
                    </button>
                    <button className="btn btn--secondary">Message</button>
                  </div>
                )}
              </div>
              {/* Own buttons */}
              {isOwn && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowEditModal(true)} className="btn btn--secondary" style={{ flex: 1 }}>Edit profile</button>
                  <button className="btn btn--secondary" style={{ flex: 1 }}>View archive</button>
                </div>
              )}
              {/* Stats */}
              <div className="profile-stats">
                <span><strong>{Number(profile.posts_count).toLocaleString()}</strong> posts</span>
                <span
                  onClick={() => setFollowListModal('followers')}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>{Number(profile.followers_count).toLocaleString()}</strong> followers
                </span>
                <span
                  onClick={() => setFollowListModal('following')}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>{Number(profile.following_count).toLocaleString()}</strong> following
                </span>
              </div>
              {/* Bio */}
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                {profile.full_name && <div className="font-semi" style={{ marginBottom: 2 }}>{profile.full_name}</div>}
                {profile.bio
                  ? <div style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</div>
                  : isOwn && <button onClick={() => setShowEditModal(true)} className="btn btn--accent" style={{ fontSize: 14, fontWeight: 600 }}>+ Add bio</button>
                }
              </div>
            </div>
          </div>

          {/* Stories row (own only) */}
          {isOwn && (
            <div className="profile-stories">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', width: 66 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed #c7c7c7', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: 12, textAlign: 'center' }}>New</span>
              </div>
            </div>
          )}

          {/* TABS */}
          <div className="profile-tabs">
            {[
              { key: 'posts', label: 'POSTS', icon: (active) => <svg viewBox="0 0 24 24" width="12" height="12" fill={active ? 'var(--text-primary)' : 'var(--text-secondary)'}><rect x="1" y="1" width="9.5" height="9.5" rx="1"/><rect x="13.5" y="1" width="9.5" height="9.5" rx="1"/><rect x="1" y="13.5" width="9.5" height="9.5" rx="1"/><rect x="13.5" y="13.5" width="9.5" height="9.5" rx="1"/></svg> },
              ...(isOwn ? [{ key: 'saved', label: 'SAVED', icon: (active) => <svg viewBox="0 0 24 24" width="12" height="12" fill={active ? 'var(--text-primary)' : 'none'} stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> }] : []),
              { key: 'tagged', label: 'TAGGED', icon: (active) => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`profile-tab${activeTab === tab.key ? ' profile-tab--active' : ''}`}>
                {tab.icon(activeTab === tab.key)}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Saved info bar */}
          {activeTab === 'saved' && isOwn && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--border-light)' }}>
              <span className="text-muted" style={{ fontSize: 13 }}>Only you can see what you've saved</span>
              <button className="btn btn--accent font-bold" style={{ fontSize: 13 }}>+ New Collection</button>
            </div>
          )}

          {/* POSTS GRID */}
          {activeTab === 'posts' && (
            posts.length === 0 ? (
              <div className="profile-empty">
                <div className="profile-empty__icon">
                  <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" strokeLinecap="round"/></svg>
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{isOwn ? 'Share Photos' : 'No Posts Yet'}</h2>
                <p className="text-muted" style={{ fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                  {isOwn ? 'When you share photos, they will appear on your profile.' : `When ${profile.username} shares photos, they'll appear here.`}
                </p>
                {isOwn && <button onClick={() => toast('Click the + in the sidebar!')} className="btn btn--accent font-bold" style={{ fontSize: 14, marginTop: 12 }}>Share your first photo</button>}
              </div>
            ) : (
              <div className="profile-grid">
                {posts.map(post => <GridItem key={post.id} post={post} onClick={() => setSelectedPost(post)} />)}
              </div>
            )
          )}

          {/* SAVED TAB */}
          {activeTab === 'saved' && (
            <div className="profile-empty">
              <div className="profile-empty__icon">
                <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Save</h2>
              <p className="text-muted" style={{ fontSize: 14, textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.</p>
            </div>
          )}

          {/* TAGGED TAB */}
          {activeTab === 'tagged' && (
            <div className="profile-empty">
              <div className="profile-empty__icon">
                <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Photos of you</h2>
              <p className="text-muted" style={{ fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>When people tag you in photos, they'll appear here.</p>
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onDeleted={handlePostDeleted}
          onUpdated={(u) => { setPosts(p => p.map(x => x.id === u.id ? { ...x, ...u } : x)); setSelectedPost(p => ({ ...p, ...u })); }}
        />
      )}
      {showEditModal && (
        <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} onSaved={handleProfileUpdated} />
      )}
      {followListModal && (
        <FollowListModal
          profile={profile}
          tab={followListModal}
          currentUser={currentUser}
          onClose={() => setFollowListModal(null)}
          onTabChange={setFollowListModal}
          onFollowChange={(delta) =>
            setProfile(p => ({ ...p, followers_count: Number(p.followers_count) + delta }))
          }
        />
      )}
    </div>
  );
}

// ── GRID ITEM ─────────────────────────────────────────────────
function GridItem({ post, onClick }) {
  const [hovered, setHovered] = useState(false);
  const imgUrl = mediaUrl(post.image_url);
  return (
    <div className="profile-cell" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {imgUrl
        ? <img src={imgUrl} alt="" />
        : <div style={{ width: '100%', height: '100%', background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <p style={{ color: '#fff', fontSize: 13, textAlign: 'center', lineHeight: 1.4 }}>{post.caption}</p>
          </div>
      }
      {hovered && (
        <div className="grid-cell__hover">
          <span className="grid-cell__stat grid-cell__stat--sm">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {Number(post.likes_count).toLocaleString()}
          </span>
          <span className="grid-cell__stat grid-cell__stat--sm">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {Number(post.comments_count).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── POST DETAIL MODAL ─────────────────────────────────────────
function PostDetailModal({ post, currentUser, onClose, onDeleted, onUpdated }) {
  const [comments, setComments]           = useState([]);
  const [commentText, setCommentText]     = useState('');
  const [liked, setLiked]                 = useState(post.user_liked > 0);
  const [likesCount, setLikesCount]       = useState(Number(post.likes_count));
  const [bookmarked, setBookmarked]       = useState(false);
  const [showDots, setShowDots]           = useState(false);
  const [showLikes, setShowLikes]         = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText]     = useState(post.caption || '');
  const isOwn = currentUser?.id === post.user_id;

  useEffect(() => { axios.get(`/api/posts/${post.id}/comments`).then(r => setComments(r.data)).catch(() => {}); }, [post.id]);

  const toggleLike = async () => { setLiked(p => !p); setLikesCount(c => liked ? c - 1 : c + 1); await axios.post(`/api/posts/${post.id}/like`).catch(() => {}); };
  const addComment = async e => {
    e.preventDefault(); if (!commentText.trim()) return;
    try { const { data } = await axios.post(`/api/posts/${post.id}/comments`, { text: commentText }); setComments(p => [...p, data]); setCommentText(''); }
    catch { toast.error('Failed to comment'); }
  };
  const deletePost = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await axios.delete(`/api/posts/${post.id}`); toast.success('Post deleted'); onDeleted(post.id); }
    catch { toast.error('Failed to delete'); }
  };
  const saveCaption = async () => {
    try { await axios.put(`/api/posts/${post.id}/caption`, { caption: captionText }); onUpdated({ id: post.id, caption: captionText }); setEditingCaption(false); toast.success('Caption updated!'); }
    catch { toast.error('Failed to update'); }
  };

  const av     = mediaUrl(post.avatar);
  const imgUrl = mediaUrl(post.image_url);
  const init   = (post.username || 'U')[0].toUpperCase();
  const avatarEl = av
    ? <img src={av} alt="" className="avatar avatar--32" />
    : <div className="avatar-ph avatar-ph--32">{init}</div>;

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
              <span className="font-semi" style={{ fontSize: 14 }}>{post.username}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDots(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '2px 8px', letterSpacing: 2 }}>···</button>
              {showDots && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowDots(false)} />
                  <div className="dropdown" style={{ right: 0, top: '100%', minWidth: 220, marginTop: 4 }}>
                    {isOwn ? (
                      <>
                        <button className="dropdown__item" onClick={() => { setEditingCaption(true); setShowDots(false); }}>Edit caption</button>
                        <div className="divider-lt" />
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
            {(captionText || editingCaption) && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {avatarEl}
                <div style={{ flex: 1 }}>
                  {editingCaption ? (
                    <>
                      <textarea value={captionText} onChange={e => setCaptionText(e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: 8, fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
                        rows={3} autoFocus />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button onClick={saveCaption} className="btn btn--accent font-bold" style={{ fontSize: 13 }}>Save</button>
                        <button onClick={() => { setEditingCaption(false); setCaptionText(post.caption || ''); }} className="text-muted" style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}><strong>{post.username}</strong> {captionText}</p>
                  )}
                </div>
              </div>
            )}
            {comments.length === 0 && !captionText && <div style={{ textAlign: 'center', padding: '40px 0' }} className="text-muted">No comments yet. Be the first!</div>}
            {comments.map(c => {
              const ca = mediaUrl(c.avatar);
              const ci = (c.username || 'U')[0].toUpperCase();
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
                <button className="icon-btn"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>
                <button className="icon-btn"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
              </div>
              <button onClick={() => setBookmarked(p => !p)} className="icon-btn">
                <svg viewBox="0 0 24 24" width="24" height="24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
            <button
              onClick={() => likesCount > 0 && setShowLikes(true)}
              className="font-bold"
              style={{
                fontSize: 14, marginBottom: 4, background: 'none', border: 'none',
                padding: 0, cursor: likesCount > 0 ? 'pointer' : 'default',
                color: 'var(--text-primary)',
              }}
            >
              {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
            </button>
            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>{timeAgo(post.created_at)}</div>
          </div>

          <form onSubmit={addComment} className="post-detail__cmt-form">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
            <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14 }} />
            {commentText && <button type="submit" className="btn btn--accent font-bold" style={{ fontSize: 14, flexShrink: 0 }}>Post</button>}
          </form>
        </div>
      </div>
      {showLikes && (
        <LikesModal
          postId={post.id}
          currentUser={currentUser}
          onClose={() => setShowLikes(false)}
        />
      )}
    </div>
  );
}

// ── EDIT PROFILE MODAL ────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSaved }) {
  const [form, setForm]               = useState({ full_name: profile.full_name || '', bio: profile.bio || '' });
  const [avatarPreview, setAvatarPreview] = useState(mediaUrl(profile.avatar));
  const [avatarFile, setAvatarFile]   = useState(null);
  const [saving, setSaving]           = useState(false);
  const fileRef   = useRef();
  const initials  = (profile.username || 'U')[0].toUpperCase();

  const handleFile = e => { const f = e.target.files[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); };
  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData(); fd.append('full_name', form.full_name); fd.append('bio', form.bio); if (avatarFile) fd.append('avatar', avatarFile);
      const { data } = await axios.put('/api/users/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved(data);
    } catch { toast.error('Failed to save profile'); } finally { setSaving(false); }
  };

  return (
    <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--edit-profile">
        <div className="modal__header modal__header--sm">
          <button className="modal__close" onClick={onClose}>×</button>
          <span className="font-bold" style={{ fontSize: 16 }}>Edit profile</span>
          <button onClick={save} disabled={saving} className="btn btn--accent font-bold" style={{ fontSize: 14, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={() => fileRef.current.click()}>
          {avatarPreview
            ? <img src={avatarPreview} alt="" className="avatar avatar--56" />
            : <div className="avatar-ph avatar-ph--56">{initials}</div>
          }
          <button type="button" className="btn btn--accent font-bold" style={{ fontSize: 14 }}>Change profile photo</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {[
            { label: 'Name',     field: 'full_name', placeholder: 'Full name',  disabled: false },
            { label: 'Username', field: 'username',  placeholder: '',           disabled: true  },
          ].map(row => (
            <React.Fragment key={row.field}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16 }}>
                <label className="font-semi" style={{ width: 80, fontSize: 14, paddingTop: 8, flexShrink: 0 }}>{row.label}</label>
                <input
                  style={{ flex: 1, padding: '8px 0', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', fontSize: 14, background: 'transparent', color: row.disabled ? 'var(--text-secondary)' : 'inherit' }}
                  value={row.disabled ? profile.username : form[row.field]}
                  onChange={row.disabled ? undefined : e => setForm(p => ({ ...p, [row.field]: e.target.value }))}
                  placeholder={row.placeholder}
                  disabled={row.disabled}
                />
              </div>
              <div className="divider-lt" />
            </React.Fragment>
          ))}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16 }}>
            <label className="font-semi" style={{ width: 80, fontSize: 14, paddingTop: 8, flexShrink: 0 }}>Bio</label>
            <div style={{ flex: 1 }}>
              <textarea style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', fontSize: 14, background: 'transparent', resize: 'none', height: 80, boxSizing: 'border-box' }}
                value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Bio" maxLength={150} />
              <div style={{ textAlign: 'right', fontSize: 12 }} className="text-muted">{form.bio.length} / 150</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SKELETON ──────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div style={{ width: '100%', maxWidth: 935 }}>
      <div style={{ display: 'flex', gap: 80, alignItems: 'center', marginBottom: 44, padding: '0 20px' }}>
        <div className="shimmer" style={{ width: 150, height: 150, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="shimmer" style={{ width: 180, height: 22, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="shimmer" style={{ flex: 1, height: 32, borderRadius: 8 }} />
            <div className="shimmer" style={{ flex: 1, height: 32, borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ width: 80, height: 16, borderRadius: 4 }} />)}
          </div>
          <div className="shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

// ── FOLLOW LIST MODAL ─────────────────────────────────────────
// Shows followers or following for a given profile.
// Tabs switch between the two lists without closing the modal.
// Each row has a Follow / Following button (hidden for your own row).
function FollowListModal({ profile, tab, currentUser, onClose, onTabChange, onFollowChange }) {
  const navigate = useNavigate();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [following, setFollowing] = useState({});   // userId → bool

  useEffect(() => {
    setLoading(true);
    setUsers([]);
    axios.get(`/api/users/${profile.id}/${tab}`)
      .then(r => {
        setUsers(r.data);
        const init = {};
        r.data.forEach(u => { init[u.id] = !!u.is_following; });
        setFollowing(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile.id, tab]);

  const toggleFollow = async (userId) => {
    const wasFollowing = following[userId];
    setFollowing(f => ({ ...f, [userId]: !wasFollowing }));
    if (userId === profile.id) onFollowChange(wasFollowing ? -1 : 1);
    try {
      await axios.post(`/api/users/${userId}/follow`);
      toast.success(wasFollowing ? 'Unfollowed' : 'Followed!');
    } catch {
      setFollowing(f => ({ ...f, [userId]: wasFollowing }));
    }
  };

  const isOwn = currentUser?.id === profile.id;

  return (
    <div className="overlay overlay--dm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--follow-list">

        {/* ── Header + tab switcher ── */}
        <div style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="modal__header">
            <button className="modal__close" onClick={onClose}>×</button>
            <span className="font-bold" style={{ fontSize: 16 }}>{profile.username}</span>
            <div style={{ width: 24 }} />
          </div>
          <div style={{ display: 'flex' }}>
            {['followers', 'following'].map(t => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                style={{
                  flex: 1, padding: '12px 0', background: 'none', border: 'none',
                  borderBottom: tab === t ? '1px solid var(--text-primary)' : '1px solid transparent',
                  fontWeight: tab === t ? 700 : 400,
                  fontSize: 14,
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Loading skeleton */}
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

          {/* Empty state */}
          {!loading && users.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <p className="text-muted" style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
                {tab === 'followers'
                  ? `${isOwn ? 'You have' : `${profile.username} has`} no followers yet.`
                  : `${isOwn ? 'You are' : `${profile.username} is`} not following anyone yet.`}
              </p>
            </div>
          )}

          {/* User rows */}
          {!loading && users.map(u => {
            const avatarUrl = mediaUrl(u.avatar);
            const initials  = (u.username || 'U')[0].toUpperCase();
            const isSelf    = u.id === currentUser?.id;
            const isFollowed = following[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${u.username}`); }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="avatar avatar--44" />
                    : <div className="avatar-ph avatar-ph--44">{initials}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${u.username}`); }}>
                  <div className="truncate font-semi" style={{ fontSize: 14 }}>{u.username}</div>
                  {u.full_name && <div className="truncate text-muted" style={{ fontSize: 13 }}>{u.full_name}</div>}
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

// ── LIKES MODAL ───────────────────────────────────────────────
// Shows who liked a post. Each row navigates to that user's profile
// and has a Follow / Following button (hidden for your own row).
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
        <div className="modal__header" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <button className="modal__close" onClick={onClose}>×</button>
          <span className="font-bold" style={{ fontSize: 16 }}>Likes</span>
          <div style={{ width: 24 }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
          {!loading && users.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dbdbdb" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <p className="text-muted" style={{ marginTop: 16, fontSize: 14 }}>No likes yet.</p>
            </div>
          )}
          {!loading && users.map(u => {
            const avatarUrl  = mediaUrl(u.avatar);
            const initials   = (u.username || 'U')[0].toUpperCase();
            const isSelf     = u.id === currentUser?.id;
            const isFollowed = following[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${u.username}`); }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="avatar avatar--44" />
                    : <div className="avatar-ph avatar-ph--44">{initials}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/${u.username}`); }}>
                  <div className="truncate font-semi" style={{ fontSize: 14 }}>{u.username}</div>
                  {u.full_name && <div className="truncate text-muted" style={{ fontSize: 13 }}>{u.full_name}</div>}
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
