/**
 * components/StoriesBar.js
 *
 * Horizontal scrollable row of story circles shown above the feed.
 * - First circle is always "Your story" (own avatar + add button).
 * - Remaining circles are followed users who have active stories.
 * - An unviewed story gets the Instagram-style colour gradient ring.
 * - A fully-viewed story gets a grey ring.
 * - Clicking any circle opens StoryViewer at that user's position.
 * - Clicking your own circle when you have no story opens the upload modal.
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../utils/helpers';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const { user } = useAuth();
  const [groups, setGroups]           = useState([]);   // [{user_id, username, avatar, all_viewed, stories:[]}]
  const [loading, setLoading]         = useState(true);
  const [viewerIndex, setViewerIndex] = useState(null); // which group is open
  const fileRef = useRef();

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      const { data } = await axios.get('/api/stories');
      setGroups(data);
    } catch { /* silent — stories failing shouldn't break the feed */ }
    finally { setLoading(false); }
  };

  // Called by StoryViewer when a story slide is viewed
  const markViewed = (storyId) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      stories: g.stories.map(s =>
        s.id === storyId ? { ...s, viewed: true } : s
      ),
      all_viewed: g.stories.every(s => s.id === storyId ? true : s.viewed),
    })));
    axios.post(`/api/stories/${storyId}/view`).catch(() => {});
  };

  // Called by StoryViewer when a story is deleted
  const handleDeleted = (storyId) => {
    setGroups(prev => {
      const next = prev.map(g => ({
        ...g,
        stories: g.stories.filter(s => s.id !== storyId),
      })).filter(g => g.stories.length > 0);
      return next;
    });
    setViewerIndex(null);
  };

  // Upload a new story image
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Stories must be images'); return; }
    if (file.size > 20 * 1024 * 1024)   { toast.error('Image must be under 20 MB'); return; }

    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await axios.post('/api/stories', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Story shared!');
      // Prepend to own group or create the group
      setGroups(prev => {
        const ownIdx = prev.findIndex(g => g.user_id === user.id);
        if (ownIdx === -1) {
          return [{
            user_id:    user.id,
            username:   user.username,
            avatar:     user.avatar,
            full_name:  user.full_name,
            all_viewed: true,
            stories:    [{ ...data, viewed: true }],
          }, ...prev];
        }
        const next = [...prev];
        next[ownIdx] = {
          ...next[ownIdx],
          stories: [...next[ownIdx].stories, { ...data, viewed: true }],
        };
        return next;
      });
    } catch { toast.error('Failed to upload story'); }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  // Determine if own group exists already
  const ownGroup = groups.find(g => g.user_id === user?.id);

  const openViewer = (index) => setViewerIndex(index);
  const closeViewer = () => setViewerIndex(null);

  if (loading) return <StoriesBarSkeleton />;

  return (
    <>
      <div className="stories-bar">
        {/* ── Your Story circle ── */}
        <div
          className="story-circle"
          onClick={() => {
            if (ownGroup) {
              openViewer(groups.findIndex(g => g.user_id === user?.id));
            } else {
              fileRef.current?.click();
            }
          }}
        >
          <div className={`story-ring ${ownGroup && !ownGroup.all_viewed ? 'story-ring--active' : ownGroup ? 'story-ring--seen' : 'story-ring--none'}`}>
            <div className="story-avatar-wrap">
              {mediaUrl(user?.avatar)
                ? <img src={mediaUrl(user.avatar)} alt="" className="story-avatar" />
                : <div className="story-avatar story-avatar--ph">
                    {(user?.username || 'U')[0].toUpperCase()}
                  </div>
              }
              {/* Plus badge */}
              <div className="story-add-badge">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
          <span className="story-label">Your story</span>
        </div>

        {/* ── Other users' circles ── */}
        {groups
          .filter(g => g.user_id !== user?.id)
          .map((g) => {
            const realIdx = groups.findIndex(x => x.user_id === g.user_id);
            const avatarUrl = mediaUrl(g.avatar);
            return (
              <div
                key={g.user_id}
                className="story-circle"
                onClick={() => openViewer(realIdx)}
              >
                <div className={`story-ring ${g.all_viewed ? 'story-ring--seen' : 'story-ring--active'}`}>
                  <div className="story-avatar-wrap">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="story-avatar" />
                      : <div className="story-avatar story-avatar--ph">
                          {(g.username || 'U')[0].toUpperCase()}
                        </div>
                    }
                  </div>
                </div>
                <span className="story-label">{g.username}</span>
              </div>
            );
          })}

        {/* Hidden file input for story upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* ── Story Viewer ── */}
      {viewerIndex !== null && groups[viewerIndex] && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={viewerIndex}
          currentUser={user}
          onClose={closeViewer}
          onViewed={markViewed}
          onDeleted={handleDeleted}
          onAddStory={() => fileRef.current?.click()}
        />
      )}
    </>
  );
}

function StoriesBarSkeleton() {
  return (
    <div className="stories-bar">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="story-circle">
          <div className="story-ring story-ring--none">
            <div className="story-avatar-wrap">
              <div className="shimmer story-avatar" style={{ borderRadius: '50%' }} />
            </div>
          </div>
          <div className="shimmer" style={{ width: 48, height: 10, borderRadius: 4, marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}
