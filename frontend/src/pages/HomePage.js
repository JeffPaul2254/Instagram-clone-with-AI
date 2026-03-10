import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import RightSidebar from '../components/RightSidebar';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    fetchFeed();
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFeed = async () => {
    try {
      const { data } = await axios.get('/api/posts/feed');
      setPosts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Hide sidebar below 1000px, just like real Instagram
  const showSidebar = windowWidth > 1000;

  return (
    <div style={{ background:'#fafafa', minHeight:'100vh' }}>
      <Navbar onNewPost={post => setPosts(prev => [post, ...prev])} />

      <div style={{ marginLeft:72, minHeight:'100vh' }}>
        <div style={{ display:'flex', justifyContent: showSidebar ? 'center' : 'center', gap:28, padding:'32px 24px 40px', maxWidth:1035, margin:'0 auto', alignItems:'flex-start' }}>

          {/* Feed — centers itself when sidebar is hidden */}
          <main style={{ flex:'1 1 0', minWidth:0, maxWidth:614 }}>
            {loading
              ? [1,2,3].map(i => <PostSkeleton key={i} />)
              : posts.length === 0
                ? <EmptyState />
                : posts.map(post => <PostCard key={post.id} post={post} currentUser={user} />)
            }
          </main>

          {/* Right Sidebar — hidden below 1000px */}
          {showSidebar && (
            <aside style={{ width:319, flexShrink:0, position:'sticky', top:32 }}>
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
    <div style={{ textAlign:'center', padding:'80px 20px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#dbdbdb" strokeWidth="1">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
      <h3 style={{ marginTop:16, color:'#262626' }}>No Posts Yet</h3>
      <p style={{ color:'#8e8e8e', marginTop:8 }}>Click the + icon in the sidebar to share your first post!</p>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div style={{ background:'#fff', border:'1px solid #dbdbdb', borderRadius:8, marginBottom:24, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
        <div style={{ width:32,height:32,borderRadius:'50%',background:'#efefef' }} />
        <div style={{ width:100,height:12,borderRadius:4,background:'#efefef' }} />
      </div>
      <div style={{ width:'100%',height:300,background:'#efefef' }} />
      <div style={{ padding:16 }}>
        <div style={{ width:80,height:12,borderRadius:4,background:'#efefef',marginBottom:8 }} />
        <div style={{ width:'60%',height:12,borderRadius:4,background:'#efefef' }} />
      </div>
    </div>
  );
}
