import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { timeAgo, formatCount, mediaUrl } from '../utils/helpers';
import Navbar from '../components/Navbar';

export default function ReelsPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [reels, setReels]             = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [showUpload, setShowUpload]   = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    axios.get('/api/reels')
      .then(r => setReels(r.data))
      .catch(() => toast.error('Failed to load reels'))
      .finally(() => setLoading(false));
  }, []);

  const goNext = useCallback(() => {
    if (transitioning || currentIndex >= reels.length - 1) return;
    setTransitioning(true);
    setTimeout(() => { setCurrentIndex(i => i + 1); setTransitioning(false); setShowComments(false); }, 200);
  }, [currentIndex, reels.length, transitioning]);

  const goPrev = useCallback(() => {
    if (transitioning || currentIndex <= 0) return;
    setTransitioning(true);
    setTimeout(() => { setCurrentIndex(i => i - 1); setTransitioning(false); setShowComments(false); }, 200);
  }, [currentIndex, transitioning]);

  useEffect(() => {
    const handler = e => { if (e.key === 'ArrowDown') goNext(); if (e.key === 'ArrowUp') goPrev(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  const handleLikeUpdate = (reelId, liked, count) => {
    setReels(prev => prev.map(r => r.id === reelId ? { ...r, user_liked: liked ? 1 : 0, likes_count: count } : r));
  };

  const handleDeleted = (reelId) => {
    const newReels = reels.filter(r => r.id !== reelId);
    setReels(newReels);
    setCurrentIndex(i => Math.min(i, newReels.length - 1));
    toast.success('Reel deleted');
  };

  const currentReel = reels[currentIndex];

  return (
    <div className="reels-layout">
      <Navbar onNewPost={() => {}} darkMode />
      <div className="reels-inner">

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="spinner spinner--lg spinner--white" />
            <span style={{ color: '#fff', fontSize: 14 }}>Loading reels...</span>
          </div>
        )}

        {!loading && reels.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.2">
              <rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,.5)"/>
            </svg>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 300 }}>No reels yet</h2>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
              Be the first to share a reel. Upload a short video to get started.
            </p>
            <button onClick={() => setShowUpload(true)}
              style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Upload reel
            </button>
          </div>
        )}

        {!loading && currentReel && (
          <>
            <div style={{ position: 'relative', opacity: transitioning ? 0 : 1, transition: 'opacity .2s', display: 'flex', alignItems: 'center', gap: 16 }}>
              <ReelCard
                reel={currentReel}
                currentUser={currentUser}
                onLikeUpdate={handleLikeUpdate}
                onDeleted={handleDeleted}
                onShowComments={() => setShowComments(true)}
                navigate={navigate}
              />
              <ReelActions
                reel={currentReel}
                currentUser={currentUser}
                onLikeUpdate={handleLikeUpdate}
                onDeleted={handleDeleted}
                onShowComments={() => setShowComments(s => !s)}
              />
            </div>

            {/* Nav arrows */}
            <div className="reel-nav-btns">
              <button className="reel-nav-btn" onClick={goPrev} disabled={currentIndex === 0}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
              <button className="reel-nav-btn" onClick={goNext} disabled={currentIndex >= reels.length - 1}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>

            {/* Messages pill */}
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
              <button onClick={() => navigate('/messages')}
                style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 24, padding: '10px 20px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Messages
              </button>
            </div>

            {/* Upload button */}
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
              <button onClick={() => setShowUpload(true)}
                style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 24, padding: '10px 20px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Upload
              </button>
            </div>

            {showComments && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={e => e.target === e.currentTarget && setShowComments(false)}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={() => setShowComments(false)} />
                <CommentsDrawer reel={currentReel} currentUser={currentUser} onClose={() => setShowComments(false)} />
              </div>
            )}
          </>
        )}
      </div>

      {showUpload && (
        <div className="overlay overlay--dark overlay--dm" onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <UploadReelModal onClose={() => setShowUpload(false)} onUploaded={(reel) => { setReels(p => [reel, ...p]); setCurrentIndex(0); setShowUpload(false); toast.success('Reel shared!'); }} />
        </div>
      )}
    </div>
  );
}

// ── REEL CARD ─────────────────────────────────────────────────
function ReelCard({ reel, currentUser, onLikeUpdate, onDeleted, onShowComments, navigate }) {
  const [playing, setPlaying]   = useState(true);
  const [muted, setMuted]       = useState(true);
  const [progress, setProgress] = useState(0);
  const [showDots, setShowDots] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const videoRef = useRef();
  const isOwn    = currentUser?.id === reel.user_id;

  const videoUrl  = mediaUrl(reel.video_url);
  const avatarUrl = mediaUrl(reel.avatar);
  const initials  = (reel.username || 'U')[0].toUpperCase();

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause(); else videoRef.current.play();
    setPlaying(p => !p);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const handleDoubleTap = () => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 700);
  };

  const deleteReel = async () => {
    if (!window.confirm('Delete this reel?')) return;
    try { await axios.delete(`/api/reels/${reel.id}`); onDeleted(reel.id); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="reel-card" onClick={togglePlay} onDoubleClick={handleDoubleTap}>
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          loop
          muted={muted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onClick={e => e.stopPropagation()}
        />
      )}

      {heartAnim && (
        <div className="reel-card__heart">
          <svg viewBox="0 0 24 24" width="80" height="80" fill="white" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))' }}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </div>
      )}

      {/* Top controls */}
      <div className="reel-card__ctrls">
        <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} className="reel-card__topbtn">
          {muted
            ? <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          }
        </button>
        {isOwn && (
          <div style={{ position: 'relative' }}>
            <button onClick={e => { e.stopPropagation(); setShowDots(p => !p); }} className="reel-card__topbtn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            {showDots && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowDots(false)} />
                <div className="dropdown" style={{ right: 0, top: '110%', minWidth: 180, zIndex: 51 }}>
                  <button className="dropdown__item dropdown__item--danger" onClick={deleteReel}>Delete reel</button>
                  <div className="divider-lt" />
                  <button className="dropdown__item" onClick={() => setShowDots(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom info overlay */}
      <div className="reel-card__overlay">
        <div className="reel-card__user">
          <div onClick={e => { e.stopPropagation(); navigate(`/${reel.username}`); }} style={{ cursor: 'pointer' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="avatar avatar--36" style={{ border: '2px solid rgba(255,255,255,.8)' }} />
              : <div className="avatar-ph avatar-ph--36" style={{ border: '2px solid rgba(255,255,255,.8)' }}>{initials}</div>
            }
          </div>
          <span onClick={e => { e.stopPropagation(); navigate(`/${reel.username}`); }}
            style={{ color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{reel.username}</span>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>•</span>
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>{timeAgo(reel.created_at)}</span>
          {!isOwn && (
            <button onClick={e => { e.stopPropagation(); axios.post(`/api/users/${reel.user_id}/follow`).catch(() => {}); toast.success(`Following ${reel.username}`); }}
              style={{ color: '#fff', fontWeight: 700, fontSize: 13, background: 'none', border: '1px solid rgba(255,255,255,.7)', borderRadius: 6, padding: '3px 12px', cursor: 'pointer' }}>
              Follow
            </button>
          )}
        </div>
        {reel.caption && (
          <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.5, margin: '0 0 10px', textShadow: '0 1px 4px rgba(0,0,0,.5)', maxWidth: 300, pointerEvents: 'none' }}>{reel.caption}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="white" style={{ flexShrink: 0 }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
            {reel.audio_name || 'Original audio'} · {reel.username}
          </span>
          <div className="reel-disc" style={{ animation: playing ? 'spinSlow 4s linear infinite' : 'none' }}>
            <div className="reel-disc__center" />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="reel-card__progress" onClick={e => { e.stopPropagation(); handleSeek(e); }}>
        <div className="reel-card__prog-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ── RIGHT ACTIONS ─────────────────────────────────────────────
function ReelActions({ reel, currentUser, onLikeUpdate, onDeleted, onShowComments }) {
  const [liked, setLiked]         = useState(reel.user_liked > 0);
  const [likesCount, setLikesCount] = useState(Number(reel.likes_count));
  const [saved, setSaved]         = useState(false);
  const [likeAnim, setLikeAnim]   = useState(false);

  useEffect(() => {
    setLiked(reel.user_liked > 0);
    setLikesCount(Number(reel.likes_count));
  }, [reel.id, reel.user_liked, reel.likes_count]);

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    const newCount = newLiked ? likesCount + 1 : likesCount - 1;
    setLikesCount(newCount);
    if (newLiked) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 400); }
    try {
      await axios.post(`/api/reels/${reel.id}/like`);
      onLikeUpdate(reel.id, newLiked, newCount);
    } catch {
      setLiked(!newLiked); setLikesCount(likesCount);
    }
  };

  return (
    <div className="reel-actions">
      <ReelActionBtn
        icon={<svg viewBox="0 0 24 24" width="28" height="28" fill={liked ? 'var(--danger)' : 'none'} stroke={liked ? 'var(--danger)' : 'white'} strokeWidth="2"
          style={{ transform: likeAnim ? 'scale(1.4)' : 'scale(1)', transition: 'transform .2s' }}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>}
        label={formatCount(likesCount)}
        onClick={toggleLike}
      />
      <ReelActionBtn
        icon={<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
        label={formatCount(reel.comments_count)}
        onClick={onShowComments}
      />
      <ReelActionBtn
        icon={<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
        label="Share"
        onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
      />
      <ReelActionBtn
        icon={<svg viewBox="0 0 24 24" width="28" height="28" fill={saved ? 'white' : 'none'} stroke="white" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>}
        label={saved ? 'Saved' : 'Save'}
        onClick={() => { setSaved(s => !s); toast.success(saved ? 'Removed' : 'Saved!'); }}
      />
      <ReelActionBtn
        icon={<svg viewBox="0 0 24 24" width="28" height="28" fill="white"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>}
        label=""
        onClick={() => toast('More options coming soon')}
      />
      <div className="reel-disc" style={{ marginTop: 4 }}>
        <div className="reel-disc__center" />
      </div>
    </div>
  );
}

function ReelActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="reel-action-btn">
      {icon}
      {label !== '' && <span>{label}</span>}
    </button>
  );
}

// ── COMMENTS DRAWER ───────────────────────────────────────────
function CommentsDrawer({ reel, currentUser, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const inputRef = useRef();
  const endRef   = useRef();

  useEffect(() => {
    axios.get(`/api/reels/${reel.id}/comments`)
      .then(r => setComments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [reel.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const submit = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await axios.post(`/api/reels/${reel.id}/comments`, { text });
      setComments(p => [...p, data]);
      setText('');
    } catch { toast.error('Failed to comment'); }
  };

  return (
    <div className="reel-drawer">
      <div className="reel-drawer__hdl"><div className="reel-drawer__bar" /></div>
      <div className="reel-drawer__hdr">
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Comments</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', fontSize: 22, lineHeight: 1 }}>×</button>
      </div>
      <div className="reel-drawer__body">
        {loading && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', padding: 20 }}>Loading...</div>}
        {!loading && comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,.5)', fontSize: 14 }}>No comments yet. Be the first!</div>
        )}
        {comments.map(c => {
          const av = mediaUrl(c.avatar);
          const ci = (c.username || 'U')[0].toUpperCase();
          return (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {av ? <img src={av} alt="" className="avatar avatar--32" /> : <div className="avatar-ph avatar-ph--32">{ci}</div>}
              <div style={{ flex: 1 }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{c.username} </span>
                <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{c.text}</span>
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, marginTop: 3 }}>{timeAgo(c.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="reel-drawer__foot">
        {mediaUrl(currentUser?.avatar)
          ? <img src={mediaUrl(currentUser.avatar)} alt="" className="avatar avatar--32" />
          : <div className="avatar-ph avatar-ph--32">{(currentUser?.username || 'U')[0].toUpperCase()}</div>
        }
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          placeholder="Add a comment..." className="reel-cmt-input" />
        {text && <button type="submit" className="btn btn--accent font-bold" style={{ fontSize: 14 }}>Post</button>}
      </form>
    </div>
  );
}

// ── UPLOAD REEL MODAL ─────────────────────────────────────────
function UploadReelModal({ onClose, onUploaded }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [caption, setCaption]   = useState('');
  const [audioName, setAudioName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep]         = useState('select');
  const fileRef = useRef();

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    if (f.size > 200 * 1024 * 1024) { toast.error('Video must be under 200MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('edit');
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('caption', caption);
      fd.append('audio_name', audioName || 'Original audio');
      const { data } = await axios.post('/api/reels', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      onUploaded(data);
    } catch { toast.error('Upload failed. Try a smaller video.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="reel-upload" style={{ width: step === 'edit' ? 700 : 440 }}>
      <div className="reel-upload__hdr">
        {step === 'edit'
          ? <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14 }}>Back</button>
          : <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#fff', lineHeight: 1 }}>×</button>
        }
        <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{step === 'select' ? 'New reel' : 'Edit reel'}</span>
        {step === 'edit'
          ? <button onClick={upload} disabled={uploading}
              style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? `${progress}%` : 'Share'}
            </button>
          : <div style={{ width: 40 }} />
        }
      </div>

      {step === 'select' && (
        <div className="reel-upload__select">
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,.7)"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 400, marginBottom: 6 }}>Select a video to share</h3>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>MP4, MOV, or WebM · Up to 200MB</p>
          </div>
          <button onClick={() => fileRef.current.click()}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Select from computer
          </button>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      )}

      {step === 'edit' && (
        <div className="reel-upload__edit">
          <div style={{ flex: '0 0 280px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {preview && <video src={preview} style={{ width: '100%', maxHeight: 500, objectFit: 'cover' }} controls muted loop autoPlay playsInline />}
          </div>
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>Caption</label>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..." maxLength={2200}
                style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box', minHeight: 100, fontFamily: 'inherit' }} />
              <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>{caption.length} / 2200</div>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>Audio name</label>
              <input value={audioName} onChange={e => setAudioName(e.target.value)} placeholder="Original audio"
                style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: 12 }}>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>✓ Your reel will be visible to everyone</div>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 4 }}>✓ Recommended: vertical video (9:16)</div>
            </div>
            {uploading && (
              <div>
                <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width .3s' }} />
                </div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 6, textAlign: 'center' }}>Uploading... {progress}%</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
