/**
 * components/StoryViewer.js
 *
 * Full-screen story viewer.
 *
 * Features:
 *  - Progress bars across the top (one per story slide)
 *  - Auto-advances after 5 seconds per slide
 *  - Tap left third → previous slide / user
 *  - Tap right third → next slide / user
 *  - Pause while holding down (mousedown / touchstart)
 *  - Swipe left/right on touch devices to change users
 *  - Owner sees view count badge; tapping it shows viewer list
 *  - Owner can delete a story via the ··· menu
 *  - Calls onViewed(storyId) as each slide becomes active
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { timeAgo, mediaUrl } from '../utils/helpers';

const STORY_DURATION = 5000; // ms per slide

export default function StoryViewer({
  groups,
  initialGroupIndex,
  currentUser,
  onClose,
  onViewed,
  onDeleted,
  onAddStory,
}) {
  const navigate = useNavigate();
  const [groupIdx, setGroupIdx]   = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx]   = useState(0);
  const [paused, setPaused]       = useState(false);
  const [progress, setProgress]   = useState(0);   // 0–100 for current slide
  const [showMenu, setShowMenu]   = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [viewers, setViewers]     = useState([]);
  const [imgLoaded, setImgLoaded] = useState(false);

  const timerRef    = useRef(null);
  const startRef    = useRef(null);   // timestamp when current slide started
  const elapsedRef  = useRef(0);      // ms already elapsed before a pause
  const touchStartX = useRef(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwn = group?.user_id === currentUser?.id;

  // ── Mark story as viewed ────────────────────────────────────
  useEffect(() => {
    if (story) {
      setImgLoaded(false);
      onViewed(story.id);
    }
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Progress timer ──────────────────────────────────────────
  const clearTimer = useCallback(() => {
    cancelAnimationFrame(timerRef.current);
  }, []);

  const goNextSlide = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, group?.stories.length, groups.length, onClose]);

  const goPrevSlide = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, groupIdx]);

  // Run the rAF-based progress ticker
  const startTimer = useCallback(() => {
    clearTimer();
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = elapsedRef.current + (now - startRef.current);
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        timerRef.current = requestAnimationFrame(tick);
      } else {
        elapsedRef.current = 0;
        goNextSlide();
      }
    };
    timerRef.current = requestAnimationFrame(tick);
  }, [clearTimer, goNextSlide]);

  // Start / stop timer based on paused state and image load
  useEffect(() => {
    if (paused || !imgLoaded) {
      clearTimer();
      if (!paused && !imgLoaded) {
        // waiting for image — freeze elapsed
        elapsedRef.current += performance.now() - (startRef.current || performance.now());
      }
    } else {
      startTimer();
    }
    return clearTimer;
  }, [paused, imgLoaded, startTimer, clearTimer]);

  // Reset progress when slide changes
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
  }, [storyIdx, groupIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') goNextSlide();
      if (e.key === 'ArrowLeft')  goPrevSlide();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNextSlide, goPrevSlide, onClose]);

  // ── Touch swipe to change users ─────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const handleTouchEnd = (e) => {
    setPaused(false);
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNextSlide(); else goPrevSlide();
    }
  };

  // ── Tap zones (left/right thirds) ───────────────────────────
  const handleTap = (e) => {
    if (showMenu || showViews) return;
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w / 3) goPrevSlide();
    else goNextSlide();
  };

  // ── Owner: fetch viewers when panel opens ───────────────────
  useEffect(() => {
    if (!showViews || !story || !isOwn) return;
    axios.get(`/api/stories/${story.id}/views`)
      .then(r => setViewers(r.data))
      .catch(() => {});
  }, [showViews, story?.id, isOwn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete story ────────────────────────────────────────────
  const deleteStory = async () => {
    if (!story) return;
    try {
      await axios.delete(`/api/stories/${story.id}`);
      toast.success('Story deleted');
      onDeleted(story.id);
    } catch { toast.error('Failed to delete'); }
    setShowMenu(false);
  };

  if (!group || !story) return null;

  const avatarUrl  = mediaUrl(group.avatar);
  const initials   = (group.username || 'U')[0].toUpperCase();
  const imageUrl   = mediaUrl(story.image_url);

  return (
    <div
      className="story-viewer"
      onClick={handleTap}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Background image ── */}
      <img
        key={story.id}
        src={imageUrl}
        alt=""
        className="story-viewer__img"
        onLoad={() => setImgLoaded(true)}
        draggable={false}
      />
      {!imgLoaded && <div className="story-viewer__loader"><div className="spinner spinner--md spinner--white" /></div>}

      {/* ── Progress bars ── */}
      <div className="story-viewer__bars" onClick={e => e.stopPropagation()}>
        {group.stories.map((s, i) => (
          <div key={s.id} className="story-bar">
            <div
              className="story-bar__fill"
              style={{
                width: i < storyIdx ? '100%'
                     : i === storyIdx ? `${progress}%`
                     : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Header row ── */}
      <div className="story-viewer__header" onClick={e => e.stopPropagation()}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => { onClose(); navigate(`/${group.username}`); }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="avatar avatar--36" style={{ border: '2px solid rgba(255,255,255,.8)' }} />
            : <div className="avatar-ph avatar-ph--36" style={{ border: '2px solid rgba(255,255,255,.8)' }}>{initials}</div>
          }
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{group.username}</div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>{timeAgo(story.created_at)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pause / play indicator */}
          <button
            className="story-viewer__ctrl-btn"
            onClick={e => { e.stopPropagation(); setPaused(p => !p); }}
            title={paused ? 'Play' : 'Pause'}
          >
            {paused
              ? <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            }
          </button>

          {/* Owner actions */}
          {isOwn && (
            <div style={{ position: 'relative' }}>
              <button
                className="story-viewer__ctrl-btn"
                onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {showMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 1 }} onClick={() => setShowMenu(false)} />
                  <div className="dropdown" style={{ right: 0, top: '110%', minWidth: 160, zIndex: 2 }}>
                    <button className="dropdown__item dropdown__item--danger" onClick={deleteStory}>Delete story</button>
                    <div className="divider-lt" />
                    <button className="dropdown__item" onClick={() => setShowMenu(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Close */}
          <button className="story-viewer__ctrl-btn" onClick={e => { e.stopPropagation(); onClose(); }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Caption ── */}
      {story.caption && (
        <div className="story-viewer__caption" onClick={e => e.stopPropagation()}>
          {story.caption}
        </div>
      )}

      {/* ── Owner: view count button ── */}
      {isOwn && (
        <button
          className="story-viewer__views-btn"
          onClick={e => { e.stopPropagation(); setShowViews(v => !v); setPaused(true); }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
            <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="2"/>
          </svg>
          <span>{story.views_count || 0} views</span>
        </button>
      )}

      {/* ── Views panel (owner only) ── */}
      {showViews && isOwn && (
        <div
          className="story-views-panel"
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Viewers</span>
            <button
              onClick={() => { setShowViews(false); setPaused(false); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
            >×</button>
          </div>
          {viewers.length === 0
            ? <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No views yet</p>
            : viewers.map(v => {
                const vUrl  = mediaUrl(v.avatar);
                const vInit = (v.username || 'U')[0].toUpperCase();
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    {vUrl
                      ? <img src={vUrl} alt="" className="avatar avatar--36" />
                      : <div className="avatar-ph avatar-ph--36">{vInit}</div>
                    }
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{v.username}</div>
                      <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{timeAgo(v.viewed_at)}</div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── Left / right tap zone hints (invisible, for accessibility) ── */}
      <div className="story-tap-left"  onClick={e => { e.stopPropagation(); goPrevSlide(); }} />
      <div className="story-tap-right" onClick={e => { e.stopPropagation(); goNextSlide(); }} />
    </div>
  );
}
