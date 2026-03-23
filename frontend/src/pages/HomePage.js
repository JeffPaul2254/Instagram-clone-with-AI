import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import RightSidebar from '../components/RightSidebar';
import { useAuth } from '../context/AuthContext';
import { useWindowWidth } from '../hooks/useWindowWidth';

export default function HomePage() {
  const { user }  = useAuth();
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const windowWidth = useWindowWidth();

  useEffect(() => { fetchFeed(); }, []);

  const fetchFeed = async () => {
    try {
      const { data } = await axios.get('/api/posts/feed');
      setPosts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showSidebar = windowWidth > 1000;

  return (
    <div className="home-layout">
      <Navbar onNewPost={post => setPosts(prev => [post, ...prev])} />
      <div className="home-inner">
        <div className="home-content">
          <main className="home-feed">
            {loading
              ? [1, 2, 3].map(i => <PostSkeleton key={i} />)
              : posts.length === 0
                ? <EmptyState />
                : posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={user}
                      onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                      onUpdated={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
                    />
                  ))
            }
          </main>
          {showSidebar && (
            <aside className="home-sidebar">
              <RightSidebar />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#dbdbdb" strokeWidth="1">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
      <h3 style={{ marginTop: 16, fontSize: 22, fontWeight: 600 }}>Welcome to Instagram</h3>
      <p className="text-muted" style={{ marginTop: 8, maxWidth: 300, lineHeight: 1.6 }}>
        Your feed shows posts from people you follow. Follow some accounts to get started, or share your first post!
      </p>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="post-skel">
      <div className="post-skel__hdr">
        <div className="shimmer post-skel__av" />
        <div className="shimmer post-skel__line" style={{ width: 100 }} />
      </div>
      <div className="shimmer post-skel__body" />
      <div className="post-skel__foot">
        <div className="shimmer post-skel__line" style={{ width: 80 }} />
        <div className="shimmer post-skel__line" style={{ width: '60%' }} />
      </div>
    </div>
  );
}
