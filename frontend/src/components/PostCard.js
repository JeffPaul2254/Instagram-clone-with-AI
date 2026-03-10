import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

export default function PostCard({ post, currentUser }) {
  const [liked, setLiked] = useState(post.user_liked > 0);
  const [likesCount, setLikesCount] = useState(Number(post.likes_count));
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(Number(post.comments_count));
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [heartAnim, setHeartAnim] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showDots, setShowDots] = useState(false);

  const isOwnPost = currentUser?.id === post.user_id;
  const avatarUrl = post.avatar ? `http://localhost:5000${post.avatar}` : null;
  const postImageUrl = post.image_url ? `http://localhost:5000${post.image_url}` : null;
  const initials = (post.username || 'U')[0].toUpperCase();

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => newLiked ? c+1 : c-1);
    if (newLiked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 700); }
    try { await axios.post(`/api/posts/${post.id}/like`); }
    catch { setLiked(!newLiked); setLikesCount(c => newLiked ? c-1 : c+1); }
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
      setCommentsCount(c => c+1);
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

  // Full 3-dots menu like real Instagram
  const ownDotsActions = [
    { label: 'Edit', action: () => { toast('Edit coming soon'); setShowDots(false); } },
    { label: 'Delete', action: () => { toast('Delete coming soon'); setShowDots(false); }, danger: true },
    { label: 'Hide like count', action: () => { toast('Done'); setShowDots(false); } },
    { label: 'Turn off commenting', action: () => { toast('Done'); setShowDots(false); } },
    { label: 'Copy link', action: () => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); setShowDots(false); } },
    { label: 'Cancel', action: () => setShowDots(false), bold: true },
  ];

  const otherDotsActions = [
    { label: 'Report', action: () => { toast('Reported'); setShowDots(false); }, danger: true },
    { label: 'Not interested', action: () => { toast('Got it!'); setShowDots(false); } },
    { label: 'Go to post', action: () => { setShowDots(false); } },
    { label: 'Share to...', action: () => { toast('Share coming soon'); setShowDots(false); } },
    { label: 'Copy link', action: () => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); setShowDots(false); } },
    { label: 'Embed', action: () => { toast('Embed coming soon'); setShowDots(false); } },
    { label: 'About this account', action: () => { toast(`@${post.username}`); setShowDots(false); } },
    { label: 'Cancel', action: () => setShowDots(false), bold: true },
  ];

  const dotsActions = isOwnPost ? ownDotsActions : otherDotsActions;

  return (
    <div style={S.card}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={S.avatar} />
            : <div style={S.avatarPh}>{initials}</div>
          }
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontWeight:600, fontSize:14 }}>{post.username}</span>
              <span style={{ color:'#8e8e8e' }}>•</span>
              <span style={{ color:'#8e8e8e', fontSize:13 }}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {!isOwnPost && (
            <button onClick={toggleFollow} style={{ color: following ? '#8e8e8e' : '#0095f6', fontWeight:700, fontSize:14, background:'none', border:'none', cursor:'pointer' }}>
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          {/* 3-dots */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowDots(p => !p)} style={{ fontSize:20, color:'#262626', background:'none', border:'none', cursor:'pointer', padding:'2px 8px', lineHeight:1, letterSpacing:2 }}>···</button>
            {showDots && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:998 }} onClick={() => setShowDots(false)} />
                <div style={S.dotsMenu}>
                  {dotsActions.map((a, i) => (
                    <React.Fragment key={a.label}>
                      {i > 0 && <div style={{ height:1, background:'#efefef' }} />}
                      <button onClick={a.action} style={{
                        ...S.dotsItem,
                        color: a.danger ? '#ed4956' : '#262626',
                        fontWeight: a.bold ? 700 : 400,
                      }}>
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
        <div style={{ position:'relative', background:'#000' }} onDoubleClick={toggleLike}>
          <img src={postImageUrl} alt="post" style={{ width:'100%', maxHeight:600, objectFit:'contain', display:'block' }} />
          {heartAnim && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', animation:'fadeOut .7s ease forwards' }}>
              <svg viewBox="0 0 24 24" width="90" height="90" fill="white" style={{ filter:'drop-shadow(0 2px 8px rgba(0,0,0,.4))' }}>
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px 4px' }}>
        <div style={{ display:'flex', gap:14 }}>
          <button onClick={toggleLike} style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:4, color: liked ? '#ed4956' : '#262626' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : 'currentColor'} strokeWidth="2" style={{ transition:'transform .15s', transform: liked ? 'scale(1.2)' : 'scale(1)' }}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
          <button onClick={loadComments} style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:4, color:'#262626' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
          <button style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:4, color:'#262626' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button onClick={() => { setBookmarked(p => !p); toast.success(bookmarked ? 'Removed from saved' : 'Saved!'); }}
          style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'#262626' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill={bookmarked ? '#262626' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>

      {/* Likes */}
      <div style={{ padding:'0 16px 4px', fontWeight:600, fontSize:14 }}>
        {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
      </div>

      {/* Caption */}
      {post.caption && (
        <div style={{ padding:'2px 16px 6px', fontSize:14, lineHeight:1.5 }}>
          <span style={{ fontWeight:600 }}>{post.username}</span> {post.caption}
        </div>
      )}

      {/* View comments */}
      {commentsCount > 0 && (
        <button onClick={loadComments} style={{ padding:'0 16px 4px', display:'block', color:'#8e8e8e', fontSize:14, cursor:'pointer', background:'none', border:'none', textAlign:'left' }}>
          {showComments ? 'Hide comments' : `View all ${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Comments */}
      {showComments && (
        <div style={{ padding:'0 16px', maxHeight:200, overflowY:'auto' }}>
          {comments.map(c => (
            <div key={c.id} style={{ fontSize:14, lineHeight:1.5, marginBottom:4 }}>
              <span style={{ fontWeight:600 }}>{c.username}</span> {c.text}
              <span style={{ color:'#8e8e8e', fontSize:11, marginLeft:8 }}>{timeAgo(c.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <form onSubmit={addComment} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderTop:'1px solid #efefef', marginTop:6 }}>
        <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..."
          style={{ flex:1, border:'none', outline:'none', fontSize:14, background:'transparent' }} />
        {commentText && <button type="submit" style={{ color:'#0095f6', fontWeight:700, fontSize:14, background:'none', border:'none', cursor:'pointer' }}>Post</button>}
      </form>

      <style>{`@keyframes fadeOut { 0%{opacity:1;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} 100%{opacity:0;transform:scale(1)} }`}</style>
    </div>
  );
}

const S = {
  card: { background:'#fff', border:'1px solid #dbdbdb', borderRadius:8, marginBottom:24, overflow:'hidden' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px' },
  avatar: { width:32, height:32, borderRadius:'50%', objectFit:'cover' },
  avatarPh: { width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#667eea,#764ba2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:600 },
  dotsMenu: { position:'absolute', right:0, top:'100%', background:'#fff', border:'1px solid #dbdbdb', borderRadius:12, boxShadow:'0 4px 24px rgba(0,0,0,.15)', minWidth:260, zIndex:1000, overflow:'hidden', marginTop:4 },
  dotsItem: { display:'block', width:'100%', padding:'14px 16px', textAlign:'center', fontSize:14, cursor:'pointer', background:'none', border:'none' },
};
