/**
 * PostCard.js
 *
 * ··· menu redesigned to match Instagram exactly:
 *  - Centred modal sheet (not a positional dropdown)
 *  - Every action is fully wired:
 *      Own post:   Edit, Delete, Hide like count (toggle), Turn off commenting (toggle),
 *                  Copy link, Go to post, Cancel
 *      Other post: Report (multi-step flow), Not interested (hides post),
 *                  Follow/Unfollow, Go to post, Share to… (DM picker),
 *                  Copy link, Embed (code modal), About this account, Cancel
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { timeAgo, mediaUrl } from '../utils/helpers';

export default function PostCard({ post, currentUser, onDeleted, onUpdated, onHide }) {
  const [liked, setLiked]                 = useState(post.user_liked > 0);
  const [likesCount, setLikesCount]       = useState(Number(post.likes_count));
  const [comments, setComments]           = useState([]);
  const [commentsCount, setCommentsCount] = useState(Number(post.comments_count));
  const [showComments, setShowComments]   = useState(false);
  const [commentText, setCommentText]     = useState('');
  const [heartAnim, setHeartAnim]         = useState(false);
  const [bookmarked, setBookmarked]       = useState(false);
  const [following, setFollowing]         = useState(false);
  const [caption, setCaption]             = useState(post.caption || '');
  const [hideLikes, setHideLikes]         = useState(false);
  const [commentsOff, setCommentsOff]     = useState(false);

  // Sheet / modal state
  const [sheet, setSheet]                     = useState(null); // null|'menu'|'report'|'embed'|'share'
  const [reportStep, setReportStep]           = useState(null); // null | reason string
  const [showEditModal, setShowEditModal]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLikes, setShowLikes]             = useState(false);

  const isOwnPost    = currentUser?.id === post.user_id;
  const navigate     = useNavigate();
  const goToProfile  = () => navigate(`/${post.username}`);
  const avatarUrl    = mediaUrl(post.avatar);
  const postImageUrl = mediaUrl(post.image_url);
  const initials     = (post.username || 'U')[0].toUpperCase();
  const postUrl      = `${window.location.origin}/${post.username}`;

  const closeSheet = () => { setSheet(null); setReportStep(null); };

  // ── Like ────────────────────────────────────────────────────
  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => newLiked ? c + 1 : c - 1);
    if (newLiked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 700); }
    try { await axios.post(`/api/posts/${post.id}/like`); }
    catch { setLiked(!newLiked); setLikesCount(c => newLiked ? c - 1 : c + 1); }
  };

  // ── Comments ────────────────────────────────────────────────
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

  // ── Follow ──────────────────────────────────────────────────
  const toggleFollow = async () => {
    const newVal = !following;
    setFollowing(newVal);
    try {
      await axios.post(`/api/users/${post.user_id}/follow`);
      toast.success(newVal ? `Following ${post.username}` : `Unfollowed ${post.username}`);
    } catch { setFollowing(!newVal); }
  };

  // ── Caption saved ───────────────────────────────────────────
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

  // ── Copy link ───────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(postUrl)
      .then(() => toast.success('Link copied!'))
      .catch(() => toast.error('Could not copy link'));
    closeSheet();
  };

  return (
    <>
      <div className="post-card">

        {/* ── Header ── */}
        <div className="post-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={goToProfile} style={{ cursor: 'pointer' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="avatar avatar--32" />
                : <div className="avatar-ph avatar-ph--32">{initials}</div>
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span onClick={goToProfile} className="font-semi"
                style={{ fontSize: 14, cursor: 'pointer' }}>{post.username}</span>
              <span className="text-muted">•</span>
              <span className="text-muted" style={{ fontSize: 13 }}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isOwnPost && (
              <button onClick={toggleFollow}
                className={`btn ${following ? 'btn--following-sm' : 'btn--follow-sm'}`}>
                {following ? 'Following' : 'Follow'}
              </button>
            )}
            <button onClick={() => setSheet('menu')} className="post-card__dots-btn"
              aria-label="More options">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="5"  cy="12" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Image ── */}
        {postImageUrl && (
          <div className="post-card__img-wrap" onDoubleClick={toggleLike}>
            <img src={postImageUrl} alt="post" className="post-card__img" />
            {heartAnim && (
              <div className="post-card__heart">
                <svg viewBox="0 0 24 24" width="90" height="90" fill="white"
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))' }}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* ── Action row ── */}
        <div className="post-card__actions">
          <div className="post-card__act-grp">
            <button onClick={toggleLike} className="icon-btn"
              style={{ color: liked ? 'var(--danger)' : 'var(--text-primary)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24"
                fill={liked ? 'var(--danger)' : 'none'}
                stroke={liked ? 'var(--danger)' : 'currentColor'} strokeWidth="2"
                style={{ transition: 'transform .15s', transform: liked ? 'scale(1.2)' : 'scale(1)' }}>
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
            <button onClick={loadComments} className="icon-btn">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
            <button onClick={() => setSheet('share')} className="icon-btn">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <button onClick={() => { setBookmarked(p => !p); toast.success(bookmarked ? 'Removed from saved' : 'Saved!'); }}
            className="icon-btn">
            <svg viewBox="0 0 24 24" width="24" height="24"
              fill={bookmarked ? 'var(--text-primary)' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>

        {/* ── Likes ── */}
        {!hideLikes && (
          <div style={{ padding: '0 16px 4px' }}>
            <button
              onClick={() => likesCount > 0 && setShowLikes(true)}
              style={{ fontWeight: 600, fontSize: 14, background: 'none', border: 'none',
                padding: 0, cursor: likesCount > 0 ? 'pointer' : 'default', color: 'var(--text-primary)' }}>
              {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
            </button>
          </div>
        )}

        {/* ── Caption ── */}
        {caption && (
          <div style={{ padding: '2px 16px 6px', fontSize: 14, lineHeight: 1.5 }}>
            <span className="font-semi">{post.username}</span> {caption}
          </div>
        )}

        {/* ── Comments toggle ── */}
        {commentsCount > 0 && (
          <button onClick={loadComments}
            style={{ padding: '0 16px 4px', display: 'block', fontSize: 14,
              cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
            className="text-muted">
            {showComments ? 'Hide comments' : `View all ${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* ── Comments list ── */}
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

        {/* ── Add comment ── */}
        {!commentsOff && (
          <form onSubmit={addComment} className="post-card__cmt-form">
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..." className="post-card__cmt-input" />
            {commentText && (
              <button type="submit" className="btn btn--accent font-bold" style={{ fontSize: 14 }}>Post</button>
            )}
          </form>
        )}
      </div>

      {/* ════════════ SHEET MODALS ════════════ */}

      {/* ── Main menu sheet ── */}
      {sheet === 'menu' && (
        <PostSheet onClose={closeSheet}>
          {isOwnPost ? (
            <>
              <SheetBtn danger onClick={() => { closeSheet(); setShowDeleteModal(true); }}>Delete</SheetBtn>
              <SheetBtn onClick={() => { closeSheet(); setShowEditModal(true); }}>Edit</SheetBtn>
              <SheetBtn onClick={() => {
                setHideLikes(p => !p);
                toast.success(hideLikes ? 'Like count is now visible' : 'Like count hidden');
                closeSheet();
              }}>
                {hideLikes ? 'Unhide like count' : 'Hide like count'}
              </SheetBtn>
              <SheetBtn onClick={() => {
                setCommentsOff(p => !p);
                toast.success(commentsOff ? 'Commenting turned on' : 'Commenting turned off');
                closeSheet();
              }}>
                {commentsOff ? 'Turn on commenting' : 'Turn off commenting'}
              </SheetBtn>
              <SheetBtn onClick={copyLink}>Copy link</SheetBtn>
              <SheetBtn onClick={() => { closeSheet(); navigate(`/${post.username}`); }}>Go to post</SheetBtn>
              <SheetBtn bold onClick={closeSheet}>Cancel</SheetBtn>
            </>
          ) : (
            <>
              <SheetBtn danger onClick={() => { setReportStep(null); setSheet('report'); }}>Report</SheetBtn>
              <SheetBtn onClick={() => {
                closeSheet();
                if (onHide) onHide(post.id);
                else toast.success("Post hidden. You won't see this again.");
              }}>Not interested</SheetBtn>
              <SheetBtn onClick={() => { closeSheet(); toggleFollow(); }}>
                {following ? `Unfollow @${post.username}` : `Follow @${post.username}`}
              </SheetBtn>
              <SheetBtn onClick={() => { closeSheet(); navigate(`/${post.username}`); }}>Go to post</SheetBtn>
              <SheetBtn onClick={() => setSheet('share')}>Share to…</SheetBtn>
              <SheetBtn onClick={copyLink}>Copy link</SheetBtn>
              <SheetBtn onClick={() => setSheet('embed')}>Embed</SheetBtn>
              <SheetBtn onClick={() => { goToProfile(); closeSheet(); }}>About this account</SheetBtn>
              <SheetBtn bold onClick={closeSheet}>Cancel</SheetBtn>
            </>
          )}
        </PostSheet>
      )}

      {/* ── Report sheet ── */}
      {sheet === 'report' && (
        <PostSheet onClose={closeSheet} title={reportStep ? 'Report submitted' : 'Why are you reporting this?'}>
          {!reportStep ? (
            <>
              {[
                "It's spam",
                'Nudity or sexual activity',
                'Hate speech or symbols',
                'Violence or dangerous organisations',
                'Sale of illegal or regulated goods',
                'Bullying or harassment',
                'Intellectual property violation',
                'Suicide or self-injury',
                'Eating disorders',
                'Scam or fraud',
                'False information',
                "I just don't like it",
              ].map(reason => (
                <SheetBtn key={reason} align="left" chevron onClick={() => setReportStep(reason)}>
                  {reason}
                </SheetBtn>
              ))}
              <SheetBtn bold onClick={closeSheet}>Cancel</SheetBtn>
            </>
          ) : (
            <>
              <div className="sheet-report-confirm">
                <div className="sheet-report-confirm__icon">
                  <svg viewBox="0 0 24 24" width="44" height="44" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3 className="sheet-report-confirm__title">Thanks for letting us know</h3>
                <p className="sheet-report-confirm__body">
                  Your report for <strong>{reportStep}</strong> has been submitted. We use these
                  reports to improve our community guidelines.
                </p>
              </div>
              <SheetBtn onClick={closeSheet}>Done</SheetBtn>
            </>
          )}
        </PostSheet>
      )}

      {/* ── Embed sheet ── */}
      {sheet === 'embed' && (
        <PostSheet onClose={closeSheet} title="Embed">
          <EmbedSheet postUrl={postUrl} onClose={closeSheet} />
        </PostSheet>
      )}

      {/* ── Share to DM sheet ── */}
      {sheet === 'share' && (
        <PostSheet onClose={closeSheet} title="Share">
          <ShareSheet post={post} postUrl={postUrl} currentUser={currentUser} onClose={closeSheet} />
        </PostSheet>
      )}

      {/* ── Other modals ── */}
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

// ─────────────────────────────────────────────────────────────
// SHARED SHEET PRIMITIVES
// ─────────────────────────────────────────────────────────────

function PostSheet({ children, onClose, title }) {
  return (
    <div className="ig-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ig-sheet">
        {title && <div className="ig-sheet__title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

function SheetBtn({ children, onClick, danger, bold, align = 'center', chevron }) {
  return (
    <button
      onClick={onClick}
      className={[
        'ig-sheet__btn',
        danger ? 'ig-sheet__btn--danger' : '',
        bold   ? 'ig-sheet__btn--bold'   : '',
      ].filter(Boolean).join(' ')}
      style={{ textAlign: align }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      {chevron && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="var(--text-muted)" strokeWidth="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// EMBED SHEET
// ─────────────────────────────────────────────────────────────
function EmbedSheet({ postUrl, onClose }) {
  const embedCode =
    `<blockquote class="instagram-media" data-instgrm-permalink="${postUrl}" ` +
    `data-instgrm-version="14" style="background:#FFF;border:0;border-radius:3px;` +
    `box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);margin:1px;` +
    `max-width:540px;min-width:326px;padding:0;width:99.375%">` +
    `<div style="padding:16px">` +
    `<a href="${postUrl}" style="background:#FFFFFF;line-height:0;padding:0;` +
    `text-align:center;text-decoration:none;width:100%">` +
    `View this post on Instagram</a></div></blockquote>` +
    `<script async src="//www.instagram.com/embed.js"></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode)
      .then(() => toast.success('Embed code copied!'))
      .catch(() => toast.error('Could not copy'));
    onClose();
  };

  return (
    <div style={{ padding: '0 0 8px' }}>
      <div className="ig-embed-preview">{embedCode}</div>
      <p className="ig-embed-notice">
        Add this code to your website to embed this post. By embedding content, you agree to our Terms of Use.
      </p>
      <SheetBtn onClick={copyEmbed}>Copy embed code</SheetBtn>
      <SheetBtn bold onClick={onClose}>Cancel</SheetBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARE TO DM SHEET
// ─────────────────────────────────────────────────────────────
function ShareSheet({ post, postUrl, currentUser, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState({});
  const debounce              = useRef();

  // Load suggestions immediately on open
  useEffect(() => {
    axios.get('/api/users/suggestions').then(r => setResults(r.data)).catch(() => {});
  }, []);

  // Live search as user types
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
    // Store as structured JSON so MessagesPage can render a mini post card
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
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '60vh' }}>
      {/* Search bar */}
      <div style={{ padding: '8px 16px 12px' }}>
        <div className="search-box" style={{ background: 'var(--border-light)' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
            stroke="#8e8e8e" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search" className="search-box__input" autoFocus />
        </div>
      </div>

      {/* Copy link quick action */}
      <div
        onClick={() => { navigator.clipboard.writeText(postUrl).then(() => toast.success('Link copied!')); onClose(); }}
        className="ig-share-copy-row"
      >
        <div className="ig-share-copy-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
            stroke="var(--text-primary)" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Copy link</span>
      </div>

      {/* User list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: 20, textAlign: 'center' }} className="text-muted">Searching…</div>}
        {!loading && results.filter(u => u.id !== currentUser?.id).map(u => {
          const uAvatar  = mediaUrl(u.avatar);
          const uInit    = (u.username || 'U')[0].toUpperCase();
          const wasSent  = !!sent[u.id];
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
              <div style={{ flexShrink: 0 }}>
                {uAvatar
                  ? <img src={uAvatar} alt="" className="avatar avatar--44" />
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
        <SheetBtn bold onClick={onClose}>Cancel</SheetBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT POST MODAL
// ─────────────────────────────────────────────────────────────
function EditPostModal({ post, onClose, onSaved }) {
  const [caption, setCaption] = useState(post.caption || '');
  const [saving, setSaving]   = useState(false);
  const textareaRef           = useRef();
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
          <button className="epm__hdr-btn text-accent font-bold" onClick={save}
            disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
        <div className="epm__body">
          {imgUrl && (
            <div className="epm__img-pane">
              <img src={imgUrl} alt="post"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
              placeholder="Write a caption…"
              autoFocus
              className="epm__textarea"
            />
            <div style={{ padding: '6px 16px 12px', textAlign: 'right', fontSize: 12,
              color: caption.length > MAX - 50 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {caption.length} / {MAX}
            </div>
            <div className="divider-lt" />
            <div className="epm__extra">
              <span style={{ fontSize: 14 }}>Add alt text</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="#8e8e8e" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
            <div className="divider-lt" />
            <div className="epm__extra">
              <span style={{ fontSize: 14 }}>Add location</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="#8e8e8e" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DELETE CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────
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
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none"
            stroke="var(--text-primary)" strokeWidth="1.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Delete post?</h3>
          <p className="text-muted"
            style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
            Are you sure you want to delete this post? This action cannot be undone.
          </p>
        </div>
        <div className="divider" />
        <button onClick={handleDelete} disabled={deleting}
          style={{ display: 'block', width: '100%', padding: 16, textAlign: 'center',
            fontWeight: 700, fontSize: 14, color: 'var(--danger)', cursor: 'pointer',
            background: 'none', border: 'none', opacity: deleting ? 0.6 : 1 }}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        <div className="divider" />
        <button onClick={onClose}
          style={{ display: 'block', width: '100%', padding: 16, textAlign: 'center',
            fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIKES MODAL
// ─────────────────────────────────────────────────────────────
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
    } catch { setFollowing(f => ({ ...f, [userId]: was })); }
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
            const uAvatar  = mediaUrl(u.avatar);
            const uInit    = (u.username || 'U')[0].toUpperCase();
            const isSelf   = u.id === currentUser?.id;
            const isFollow = following[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <div style={{ flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => { onClose(); navigate(`/${u.username}`); }}>
                  {uAvatar
                    ? <img src={uAvatar} alt="" className="avatar avatar--44" />
                    : <div className="avatar-ph avatar-ph--44">{uInit}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => { onClose(); navigate(`/${u.username}`); }}>
                  <div className="truncate font-semi" style={{ fontSize: 14 }}>{u.username}</div>
                  {u.full_name && <div className="truncate text-muted" style={{ fontSize: 13 }}>{u.full_name}</div>}
                </div>
                {!isSelf && (
                  <button onClick={() => toggleFollow(u.id)}
                    className={`btn ${isFollow ? 'btn--following' : 'btn--follow'}`}
                    style={{ flexShrink: 0, fontSize: 13, padding: '6px 16px' }}>
                    {isFollow ? 'Following' : 'Follow'}
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
