import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function formatCount(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ReelsPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
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

  // Keyboard navigation
  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
    };
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
    <div style={{ background: '#000', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Navbar — always visible on dark bg */}
      <Navbar onNewPost={() => {}} darkMode />

      {/* Main content — offset sidebar */}
      <div style={{ marginLeft: 72, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <span style={{ color: '#fff', fontSize: 14 }}>Loading reels...</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
            <button onClick={() => setShowUpload(true)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Upload reel
            </button>
          </div>
        )}

        {!loading && currentReel && (
          <>
            {/* Reel card */}
            <div style={{ position: 'relative', opacity: transitioning ? 0 : 1, transition: 'opacity .2s', display: 'flex', alignItems: 'center', gap: 16 }}>
              <ReelCard
                reel={currentReel}
                currentUser={currentUser}
                onLikeUpdate={handleLikeUpdate}
                onDeleted={handleDeleted}
                onShowComments={() => setShowComments(true)}
                navigate={navigate}
              />

              {/* Right action buttons */}
              <ReelActions
                reel={currentReel}
                currentUser={currentUser}
                onLikeUpdate={handleLikeUpdate}
                onDeleted={handleDeleted}
                onShowComments={() => setShowComments(s => !s)}
              />
            </div>

            {/* Up/Down navigation arrows — right side of screen */}
            <div style={{ position: 'fixed', right: 40, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100 }}>
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', cursor: currentIndex === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: currentIndex === 0 ? 0.3 : 1, backdropFilter: 'blur(4px)', transition: 'opacity .2s' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
              <button
                onClick={goNext}
                disabled={currentIndex >= reels.length - 1}
                style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', cursor: currentIndex >= reels.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: currentIndex >= reels.length - 1 ? 0.3 : 1, backdropFilter: 'blur(4px)', transition: 'opacity .2s' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>

            {/* Messages pill — bottom right like real Instagram */}
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
              <button onClick={() => navigate('/messages')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 24, padding: '10px 18px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Messages
              </button>
            </div>

            {/* Reel counter */}
            <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
              {currentIndex + 1} / {reels.length}
            </div>
          </>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <UploadReelModal
          onClose={() => setShowUpload(false)}
          onUploaded={(reel) => { setReels(prev => [reel, ...prev]); setCurrentIndex(0); setShowUpload(false); toast.success('Reel uploaded!'); }}
        />
      )}

      {/* Comments drawer */}
      {showComments && currentReel && (
        <CommentsDrawer
          reel={currentReel}
          currentUser={currentUser}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}

// ── REEL CARD (video player) ──────────────────────────────────
function ReelCard({ reel, currentUser, onLikeUpdate, onDeleted, onShowComments, navigate }) {
  const videoRef = useRef();
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const lastTap = useRef(0);
  const viewTracked = useRef(false);

  const videoUrl = reel.video_url ? `http://localhost:5000${reel.video_url}` : null;
  const avatarUrl = reel.avatar ? `http://localhost:5000${reel.avatar}` : null;
  const initials = (reel.username || 'U')[0].toUpperCase();
  const isOwn = currentUser?.id === reel.user_id;

  // Autoplay on mount
  useEffect(() => {
    viewTracked.current = false;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    return () => { if (videoRef.current) videoRef.current.pause(); };
  }, [reel.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      // Double tap — like
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 900);
      if (!reel.user_liked) {
        axios.post(`/api/reels/${reel.id}/like`).then(() => {
          onLikeUpdate(reel.id, true, Number(reel.likes_count) + 1);
        }).catch(() => {});
      }
    }
    lastTap.current = now;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    const d = videoRef.current.duration || 1;
    setProgress((t / d) * 100);
    // Track view after 3 seconds
    if (t > 3 && !viewTracked.current) {
      viewTracked.current = true;
      axios.post(`/api/reels/${reel.id}/view`).catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = pct * videoRef.current.duration;
    }
  };

  const deleteReel = async () => {
    setShowDots(false);
    try { await axios.delete(`/api/reels/${reel.id}`); onDeleted(reel.id); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div style={{ position: 'relative', width: 400, height: '100vh', maxHeight: 780, borderRadius: 12, overflow: 'hidden', background: '#111', boxShadow: '0 8px 40px rgba(0,0,0,.6)' }}
      onClick={handleDoubleTap}>

      {/* Video */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted={muted}
          playsInline
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 18, padding: 24, textAlign: 'center' }}>{reel.caption}</p>
        </div>
      )}

      {/* Double-tap heart animation */}
      {doubleTapLike && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}>
          <svg viewBox="0 0 24 24" width="120" height="120" fill="white" style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.5))', animation: 'reelHeart .9s ease forwards' }}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </div>
      )}

      {/* Play/pause overlay — tap center */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} onClick={e => { e.stopPropagation(); togglePlay(); }}>
        {!playing && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.2)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        )}
      </div>

      {/* Top controls — mute + more */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 10, zIndex: 20 }}>
        <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} style={BS.topBtn}>
          {muted
            ? <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          }
        </button>
        {isOwn && (
          <div style={{ position: 'relative' }}>
            <button onClick={e => { e.stopPropagation(); setShowDots(p => !p); }} style={BS.topBtn}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            {showDots && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowDots(false)} />
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,.3)', minWidth: 180, zIndex: 51, overflow: 'hidden' }}>
                  <button onClick={deleteReel} style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#ed4956', cursor: 'pointer', background: 'none', border: 'none' }}>Delete reel</button>
                  <div style={{ height: 1, background: '#efefef' }} />
                  <button onClick={() => setShowDots(false)} style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'center', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom info overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '60px 16px 20px', background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 100%)', zIndex: 10, pointerEvents: 'none' }}>
        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, pointerEvents: 'all' }}>
          <div onClick={e => { e.stopPropagation(); navigate(`/${reel.username}`); }} style={{ cursor: 'pointer' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.8)' }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600, border: '2px solid rgba(255,255,255,.8)' }}>{initials}</div>
            }
          </div>
          <span onClick={e => { e.stopPropagation(); navigate(`/${reel.username}`); }} style={{ color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{reel.username}</span>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>•</span>
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>{timeAgo(reel.created_at)}</span>
          {!isOwn && (
            <button onClick={e => { e.stopPropagation(); axios.post(`/api/users/${reel.user_id}/follow`).catch(() => {}); toast.success(`Following ${reel.username}`); }} style={{ color: '#fff', fontWeight: 700, fontSize: 13, background: 'none', border: '1px solid rgba(255,255,255,.7)', borderRadius: 6, padding: '3px 12px', cursor: 'pointer', pointerEvents: 'all' }}>Follow</button>
          )}
        </div>

        {/* Caption */}
        {reel.caption && (
          <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.5, margin: '0 0 10px', textShadow: '0 1px 4px rgba(0,0,0,.5)', maxWidth: 300, pointerEvents: 'none' }}>{reel.caption}</p>
        )}

        {/* Audio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="white" style={{ flexShrink: 0 }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{reel.audio_name || 'Original audio'} · {reel.username}</span>
          {/* Spinning vinyl disc */}
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#262626,#555)', border: '2px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: playing ? 'spin 4s linear infinite' : 'none', flexShrink: 0, marginLeft: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,.3)', cursor: 'pointer', zIndex: 20 }} onClick={e => { e.stopPropagation(); handleSeek(e); }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#fff', transition: 'width .1s linear' }} />
      </div>

      <style>{`
        @keyframes reelHeart { 0%{opacity:0;transform:scale(0.3)} 30%{opacity:1;transform:scale(1.2)} 60%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── RIGHT ACTIONS ─────────────────────────────────────────────
function ReelActions({ reel, currentUser, onLikeUpdate, onDeleted, onShowComments }) {
  const [liked, setLiked] = useState(reel.user_liked > 0);
  const [likesCount, setLikesCount] = useState(Number(reel.likes_count));
  const [saved, setSaved] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  // Sync if reel changes
  useEffect(() => {
    setLiked(reel.user_liked > 0);
    setLikesCount(Number(reel.likes_count));
  }, [reel.id]);

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
      setLiked(!newLiked);
      setLikesCount(likesCount);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Like */}
      <ActionBtn
        icon={
          <svg viewBox="0 0 24 24" width="28" height="28" fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : 'white'} strokeWidth="2"
            style={{ transform: likeAnim ? 'scale(1.4)' : 'scale(1)', transition: 'transform .2s' }}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        }
        label={formatCount(likesCount)}
        onClick={toggleLike}
      />

      {/* Comment */}
      <ActionBtn
        icon={
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        }
        label={formatCount(reel.comments_count)}
        onClick={onShowComments}
      />

      {/* Share */}
      <ActionBtn
        icon={
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        }
        label="Share"
        onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
      />

      {/* Save */}
      <ActionBtn
        icon={
          <svg viewBox="0 0 24 24" width="28" height="28" fill={saved ? 'white' : 'none'} stroke="white" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        }
        label={saved ? 'Saved' : 'Save'}
        onClick={() => { setSaved(s => !s); toast.success(saved ? 'Removed' : 'Saved!'); }}
      />

      {/* More */}
      <ActionBtn
        icon={
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        }
        label=""
        onClick={() => toast('More options coming soon')}
      />

      {/* Spinning disc */}
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#333,#666)', border: '3px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 4s linear infinite', marginTop: 4 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#222', border: '2px solid #888' }} />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', opacity: hovered ? 0.8 : 1, transition: 'opacity .15s' }}
    >
      {icon}
      {label !== '' && <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{label}</span>}
    </button>
  );
}

// ── COMMENTS DRAWER ───────────────────────────────────────────
function CommentsDrawer({ reel, currentUser, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();
  const endRef = useRef();

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

  function timeAgoC(d) { const s=(Date.now()-new Date(d))/1000; if(s<60) return 'just now'; if(s<3600) return `${Math.floor(s/60)}m`; return `${Math.floor(s/3600)}h`; }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 500, maxWidth: '100vw', background: '#1a1a1a', borderRadius: '16px 16px 0 0', maxHeight: '70vh', display: 'flex', flexDirection: 'column', zIndex: 201 }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.3)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Comments</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', padding: 20 }}>Loading...</div>}
          {!loading && comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,.5)', fontSize: 14 }}>
              No comments yet. Be the first!
            </div>
          )}
          {comments.map(c => {
            const av = c.avatar ? `http://localhost:5000${c.avatar}` : null;
            const ci = (c.username || 'U')[0].toUpperCase();
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {av ? <img src={av} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{ci}</div>}
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{c.username} </span>
                  <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{c.text}</span>
                  <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, marginTop: 3 }}>{timeAgoC(c.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {currentUser?.avatar
            ? <img src={`http://localhost:5000${currentUser.avatar}`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{(currentUser?.username || 'U')[0].toUpperCase()}</div>
          }
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            style={{ flex: 1, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 20, padding: '8px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
          />
          {text && <button type="submit" style={{ color: '#0095f6', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Post</button>}
        </form>
      </div>
    </div>
  );
}

// ── UPLOAD REEL MODAL ─────────────────────────────────────────
function UploadReelModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [audioName, setAudioName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('select'); // select | edit
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#262626', borderRadius: 12, width: step === 'edit' ? 700 : 440, maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          {step === 'edit'
            ? <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14 }}>Back</button>
            : <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#fff', lineHeight: 1 }}>×</button>
          }
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
            {step === 'select' ? 'New reel' : 'Edit reel'}
          </span>
          {step === 'edit'
            ? <button onClick={upload} disabled={uploading} style={{ color: '#0095f6', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? `${progress}%` : 'Share'}
              </button>
            : <div style={{ width: 40 }} />
          }
        </div>

        {/* Select step */}
        {step === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 40px', gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,.7)"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 400, marginBottom: 6 }}>Select a video to share</h3>
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>MP4, MOV, or WebM · Up to 200MB</p>
            </div>
            <button onClick={() => fileRef.current.click()} style={{ background: '#0095f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Select from computer
            </button>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        )}

        {/* Edit step */}
        {step === 'edit' && (
          <div style={{ display: 'flex', overflow: 'hidden', maxHeight: 'calc(90vh - 60px)' }}>
            {/* Preview */}
            <div style={{ flex: '0 0 280px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {preview && <video src={preview} style={{ width: '100%', maxHeight: 500, objectFit: 'cover' }} controls muted loop autoPlay playsInline />}
            </div>
            {/* Fields */}
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
                    <div style={{ height: '100%', width: `${progress}%`, background: '#0095f6', transition: 'width .3s' }} />
                  </div>
                  <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 6, textAlign: 'center' }}>Uploading... {progress}%</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const BS = {
  topBtn: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
