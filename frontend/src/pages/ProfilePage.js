import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    setLoading(true); setProfile(null); setPosts([]); setActiveTab('posts');
    (async () => {
      try {
        const [pr, po] = await Promise.all([
          axios.get(`/api/users/${username}/profile`),
          axios.get(`/api/users/${username}/posts`),
        ]);
        setProfile(pr.data); setFollowing(pr.data.is_following); setPosts(po.data);
      } catch(err) {
        if (err.response?.status === 404) navigate('/'); else toast.error('Failed to load profile');
      } finally { setLoading(false); }
    })();
  }, [username]);

  const toggleFollow = async () => {
    const prev = following; setFollowing(!prev);
    setProfile(p => ({ ...p, followers_count: prev ? p.followers_count-1 : p.followers_count+1 }));
    try { await axios.post(`/api/users/${profile.id}/follow`); toast.success(!prev ? `Following ${profile.username}` : `Unfollowed ${profile.username}`); }
    catch { setFollowing(prev); setProfile(p => ({ ...p, followers_count: prev ? p.followers_count+1 : p.followers_count-1 })); }
  };

  const handleNewPost = (post) => { setPosts(p => [post,...p]); setProfile(p => p ? {...p, posts_count: Number(p.posts_count)+1} : p); };
  const handlePostDeleted = (id) => { setPosts(p => p.filter(x => x.id !== id)); setSelectedPost(null); setProfile(p => ({...p, posts_count: Math.max(0,p.posts_count-1)})); };
  const handleProfileUpdated = (u) => { setProfile(p => ({...p,...u})); updateUser(u); setShowEditModal(false); toast.success('Profile updated!'); };

  if (loading) return (
    <div style={{background:'#fff',minHeight:'100vh'}}>
      <Navbar onNewPost={handleNewPost}/>
      <div style={{marginLeft:72,display:'flex',justifyContent:'center',paddingTop:60}}>
        <ProfileSkeleton/>
      </div>
    </div>
  );
  if (!profile) return null;

  const avatarUrl = profile.avatar ? `http://localhost:5000${profile.avatar}` : null;
  const initials = (profile.username||'U')[0].toUpperCase();
  const isOwn = profile.is_own;

  return (
    <div style={{background:'#fff',minHeight:'100vh'}}>
      <Navbar onNewPost={handleNewPost}/>
      <div style={{marginLeft:72,display:'flex',justifyContent:'center'}}>
        <div style={{width:'100%',maxWidth:935,padding:'30px 20px 60px'}}>

          {/* HEADER */}
          <div style={{display:'flex',alignItems:'flex-start',gap:80,marginBottom:44}}>
            <div style={{flexShrink:0,width:150,display:'flex',justifyContent:'center'}}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{width:150,height:150,borderRadius:'50%',objectFit:'cover',border:'1px solid #dbdbdb'}}/> : <div style={{width:150,height:150,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:56,fontWeight:300}}>{initials}</div>}
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:14,paddingTop:8}}>
              {/* username row */}
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <h1 style={{fontSize:20,fontWeight:300,color:'#262626',margin:0}}>{profile.username}</h1>
                {!isOwn && (
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={toggleFollow} style={{padding:'7px 24px',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer',background:following?'#efefef':'#0095f6',color:following?'#262626':'#fff'}}>{following?'Following':'Follow'}</button>
                    <button style={{padding:'7px 16px',border:'1px solid #dbdbdb',borderRadius:8,background:'#efefef',fontWeight:600,fontSize:14,cursor:'pointer',color:'#262626'}}>Message</button>
                  </div>
                )}
              </div>
              {/* edit buttons (own only) */}
              {isOwn && (
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => setShowEditModal(true)} style={{flex:1,padding:'7px 0',border:'1px solid #dbdbdb',borderRadius:8,background:'#efefef',fontWeight:600,fontSize:14,cursor:'pointer',color:'#262626',textAlign:'center'}}>Edit profile</button>
                  <button style={{flex:1,padding:'7px 0',border:'1px solid #dbdbdb',borderRadius:8,background:'#efefef',fontWeight:600,fontSize:14,cursor:'pointer',color:'#262626',textAlign:'center'}}>View archive</button>
                </div>
              )}
              {/* stats */}
              <div style={{display:'flex',gap:40,fontSize:16,color:'#262626'}}>
                <span><strong>{Number(profile.posts_count).toLocaleString()}</strong> posts</span>
                <span><strong>{Number(profile.followers_count).toLocaleString()}</strong> followers</span>
                <span><strong>{Number(profile.following_count).toLocaleString()}</strong> following</span>
              </div>
              {/* bio */}
              <div style={{fontSize:14,lineHeight:1.5}}>
                {profile.full_name && <div style={{fontWeight:600,marginBottom:2}}>{profile.full_name}</div>}
                {profile.bio ? <div style={{whiteSpace:'pre-wrap'}}>{profile.bio}</div> : isOwn && <button onClick={() => setShowEditModal(true)} style={{color:'#00376b',fontSize:14,background:'none',border:'none',cursor:'pointer',padding:0,fontWeight:600}}>+ Add bio</button>}
              </div>
            </div>
          </div>

          {/* STORY NEW (own only) */}
          {isOwn && (
            <div style={{display:'flex',gap:24,marginBottom:16}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',width:66}}>
                <div style={{width:56,height:56,borderRadius:'50%',border:'2px dashed #c7c7c7',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff'}}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                </div>
                <span style={{fontSize:12,color:'#262626',textAlign:'center'}}>New</span>
              </div>
            </div>
          )}

          {/* TABS */}
          <div style={{display:'flex',justifyContent:'center',borderTop:'1px solid #dbdbdb',gap:60}}>
            <button onClick={() => setActiveTab('posts')} style={{display:'flex',alignItems:'center',gap:6,padding:'16px 0',background:'none',border:'none',borderTop:`2px solid ${activeTab==='posts'?'#262626':'transparent'}`,cursor:'pointer',marginTop:-1,color:activeTab==='posts'?'#262626':'#8e8e8e',fontSize:12,fontWeight:600,letterSpacing:1.5}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill={activeTab==='posts'?'#262626':'#8e8e8e'}><rect x="1" y="1" width="9.5" height="9.5" rx="1"/><rect x="13.5" y="1" width="9.5" height="9.5" rx="1"/><rect x="1" y="13.5" width="9.5" height="9.5" rx="1"/><rect x="13.5" y="13.5" width="9.5" height="9.5" rx="1"/></svg>
              <span>POSTS</span>
            </button>
            {isOwn && (
              <button onClick={() => setActiveTab('saved')} style={{display:'flex',alignItems:'center',gap:6,padding:'16px 0',background:'none',border:'none',borderTop:`2px solid ${activeTab==='saved'?'#262626':'transparent'}`,cursor:'pointer',marginTop:-1,color:activeTab==='saved'?'#262626':'#8e8e8e',fontSize:12,fontWeight:600,letterSpacing:1.5}}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill={activeTab==='saved'?'#262626':'none'} stroke={activeTab==='saved'?'#262626':'#8e8e8e'} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                <span>SAVED</span>
              </button>
            )}
            <button onClick={() => setActiveTab('tagged')} style={{display:'flex',alignItems:'center',gap:6,padding:'16px 0',background:'none',border:'none',borderTop:`2px solid ${activeTab==='tagged'?'#262626':'transparent'}`,cursor:'pointer',marginTop:-1,color:activeTab==='tagged'?'#262626':'#8e8e8e',fontSize:12,fontWeight:600,letterSpacing:1.5}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={activeTab==='tagged'?'#262626':'#8e8e8e'} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>TAGGED</span>
            </button>
          </div>

          {/* SAVED info bar */}
          {activeTab==='saved' && isOwn && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 4px',borderBottom:'1px solid #efefef'}}>
              <span style={{color:'#8e8e8e',fontSize:13}}>Only you can see what you've saved</span>
              <button style={{color:'#0095f6',fontWeight:700,fontSize:13,background:'none',border:'none',cursor:'pointer'}}>+ New Collection</button>
            </div>
          )}

          {/* POSTS GRID */}
          {activeTab==='posts' && (
            posts.length===0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px',borderTop:'1px solid #dbdbdb'}}>
                <div style={{width:62,height:62,borderRadius:'50%',border:'2px solid #262626',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                  <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="#262626" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="#262626"/><polyline points="21 15 16 10 5 21" strokeLinecap="round"/></svg>
                </div>
                <h2 style={{fontSize:28,fontWeight:700,marginBottom:12}}>{isOwn?'Share Photos':'No Posts Yet'}</h2>
                <p style={{color:'#8e8e8e',fontSize:14,textAlign:'center',maxWidth:300,lineHeight:1.5}}>
                  {isOwn ? 'When you share photos, they will appear on your profile.' : `When ${profile.username} shares photos, they'll appear here.`}
                </p>
                {isOwn && <button onClick={() => toast('Click the + in the sidebar!')} style={{color:'#0095f6',fontWeight:700,fontSize:14,background:'none',border:'none',cursor:'pointer',marginTop:12}}>Share your first photo</button>}
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
                {posts.map(post => <GridItem key={post.id} post={post} onClick={() => setSelectedPost(post)}/>)}
              </div>
            )
          )}

          {/* SAVED TAB */}
          {activeTab==='saved' && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px',borderTop:'1px solid #dbdbdb'}}>
              <div style={{width:62,height:62,borderRadius:'50%',border:'2px solid #262626',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="#262626" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </div>
              <h2 style={{fontSize:28,fontWeight:700,marginBottom:12}}>Save</h2>
              <p style={{color:'#8e8e8e',fontSize:14,textAlign:'center',maxWidth:320,lineHeight:1.5}}>Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.</p>
            </div>
          )}

          {/* TAGGED TAB */}
          {activeTab==='tagged' && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px',borderTop:'1px solid #dbdbdb'}}>
              <div style={{width:62,height:62,borderRadius:'50%',border:'2px solid #262626',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="#262626" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h2 style={{fontSize:28,fontWeight:700,marginBottom:12}}>Photos of you</h2>
              <p style={{color:'#8e8e8e',fontSize:14,textAlign:'center',maxWidth:300,lineHeight:1.5}}>When people tag you in photos, they'll appear here.</p>
            </div>
          )}

        </div>
      </div>

      {selectedPost && <PostDetailModal post={selectedPost} currentUser={currentUser} onClose={() => setSelectedPost(null)} onDeleted={handlePostDeleted} onUpdated={(u) => { setPosts(p => p.map(x => x.id===u.id?{...x,...u}:x)); setSelectedPost(p => ({...p,...u})); }}/>}
      {showEditModal && <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} onSaved={handleProfileUpdated}/>}
    </div>
  );
}

function GridItem({ post, onClick }) {
  const [hovered, setHovered] = useState(false);
  const imgUrl = post.image_url ? `http://localhost:5000${post.image_url}` : null;
  return (
    <div style={{position:'relative',aspectRatio:'1',overflow:'hidden',cursor:'pointer',background:'#efefef'}} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {imgUrl ? <img src={imgUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/> : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',padding:12}}><p style={{color:'#fff',fontSize:13,textAlign:'center',lineHeight:1.4}}>{post.caption}</p></div>}
      {hovered && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:24}}>
          <span style={{display:'flex',alignItems:'center',gap:6,color:'#fff',fontWeight:700,fontSize:16}}><svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>{Number(post.likes_count).toLocaleString()}</span>
          <span style={{display:'flex',alignItems:'center',gap:6,color:'#fff',fontWeight:700,fontSize:16}}><svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>{Number(post.comments_count).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

function PostDetailModal({ post, currentUser, onClose, onDeleted, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(post.user_liked > 0);
  const [likesCount, setLikesCount] = useState(Number(post.likes_count));
  const [bookmarked, setBookmarked] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(post.caption || '');
  const isOwn = currentUser?.id === post.user_id;

  useEffect(() => { axios.get(`/api/posts/${post.id}/comments`).then(r => setComments(r.data)).catch(()=>{}); }, [post.id]);

  const toggleLike = async () => { setLiked(p=>!p); setLikesCount(c=>liked?c-1:c+1); await axios.post(`/api/posts/${post.id}/like`).catch(()=>{}); };
  const addComment = async e => {
    e.preventDefault(); if (!commentText.trim()) return;
    try { const {data} = await axios.post(`/api/posts/${post.id}/comments`,{text:commentText}); setComments(p=>[...p,data]); setCommentText(''); }
    catch { toast.error('Failed to comment'); }
  };
  const deletePost = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await axios.delete(`/api/posts/${post.id}`); toast.success('Post deleted'); onDeleted(post.id); }
    catch { toast.error('Failed to delete'); }
  };
  const saveCaption = async () => {
    try { await axios.put(`/api/posts/${post.id}/caption`,{caption:captionText}); onUpdated({id:post.id,caption:captionText}); setEditingCaption(false); toast.success('Caption updated!'); }
    catch { toast.error('Failed to update'); }
  };

  function timeAgo(d) { const s=(Date.now()-new Date(d))/1000; if(s<60) return 'just now'; if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; return new Date(d).toLocaleDateString('en-US',{month:'long',day:'numeric'}); }

  const av = post.avatar?`http://localhost:5000${post.avatar}`:null;
  const imgUrl = post.image_url?`http://localhost:5000${post.image_url}`:null;
  const init = (post.username||'U')[0].toUpperCase();
  const avatarEl = av ? <img src={av} alt="" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}}/> : <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13,fontWeight:600}}>{init}</div>;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <button onClick={onClose} style={{position:'fixed',top:16,right:16,background:'none',border:'none',cursor:'pointer',color:'#fff',fontSize:32,lineHeight:1,zIndex:2001}}>×</button>
      <div style={{background:'#fff',borderRadius:4,overflow:'hidden',display:'flex',width:'90vw',maxWidth:900,height:'80vh'}}>
        <div style={{flex:'0 0 55%',background:'#000',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {imgUrl ? <img src={imgUrl} alt="post" style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}><p style={{color:'#fff',fontSize:18,textAlign:'center'}}>{captionText}</p></div>}
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,borderLeft:'1px solid #dbdbdb'}}>
          {/* header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid #efefef',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>{avatarEl}<span style={{fontWeight:600,fontSize:14}}>{post.username}</span></div>
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowDots(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:'2px 8px',letterSpacing:2}}>···</button>
              {showDots && (<>
                <div style={{position:'fixed',inset:0,zIndex:998}} onClick={()=>setShowDots(false)}/>
                <div style={{position:'absolute',right:0,top:'100%',background:'#fff',border:'1px solid #dbdbdb',borderRadius:12,boxShadow:'0 4px 24px rgba(0,0,0,.15)',minWidth:220,zIndex:999,overflow:'hidden',marginTop:4}}>
                  {isOwn ? (<>
                    <button style={{display:'block',width:'100%',padding:'14px 16px',textAlign:'center',fontSize:14,cursor:'pointer',background:'none',border:'none'}} onClick={()=>{setEditingCaption(true);setShowDots(false);}}>Edit caption</button>
                    <div style={{height:1,background:'#efefef'}}/>
                    <button style={{display:'block',width:'100%',padding:'14px 16px',textAlign:'center',fontSize:14,cursor:'pointer',background:'none',border:'none',color:'#ed4956',fontWeight:700}} onClick={deletePost}>Delete post</button>
                    <div style={{height:1,background:'#efefef'}}/>
                    <button style={{display:'block',width:'100%',padding:'14px 16px',textAlign:'center',fontSize:14,cursor:'pointer',background:'none',border:'none'}} onClick={()=>setShowDots(false)}>Cancel</button>
                  </>) : (<>
                    <button style={{display:'block',width:'100%',padding:'14px 16px',textAlign:'center',fontSize:14,cursor:'pointer',background:'none',border:'none',color:'#ed4956',fontWeight:700}} onClick={()=>{toast('Reported');setShowDots(false);}}>Report</button>
                    <div style={{height:1,background:'#efefef'}}/>
                    <button style={{display:'block',width:'100%',padding:'14px 16px',textAlign:'center',fontSize:14,cursor:'pointer',background:'none',border:'none'}} onClick={()=>setShowDots(false)}>Cancel</button>
                  </>)}
                </div>
              </>)}
            </div>
          </div>
          {/* scroll */}
          <div style={{flex:1,overflowY:'auto',padding:'16px 16px 8px'}}>
            {(captionText||editingCaption) && (
              <div style={{display:'flex',gap:10,marginBottom:16}}>
                {avatarEl}
                <div style={{flex:1}}>
                  {editingCaption ? (<>
                    <textarea value={captionText} onChange={e=>setCaptionText(e.target.value)} style={{width:'100%',border:'1px solid #dbdbdb',borderRadius:6,padding:8,fontSize:14,resize:'none',outline:'none',lineHeight:1.5,boxSizing:'border-box'}} rows={3} autoFocus/>
                    <div style={{display:'flex',gap:8,marginTop:6}}>
                      <button onClick={saveCaption} style={{color:'#0095f6',fontWeight:700,fontSize:13,background:'none',border:'none',cursor:'pointer'}}>Save</button>
                      <button onClick={()=>{setEditingCaption(false);setCaptionText(post.caption||'');}} style={{color:'#8e8e8e',fontSize:13,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                    </div>
                  </>) : <p style={{fontSize:14,lineHeight:1.5,margin:0}}><strong>{post.username}</strong> {captionText}</p>}
                </div>
              </div>
            )}
            {comments.length===0 && !captionText && <div style={{textAlign:'center',padding:'40px 0',color:'#8e8e8e',fontSize:14}}>No comments yet. Be the first!</div>}
            {comments.map(c => {
              const ca=c.avatar?`http://localhost:5000${c.avatar}`:null;
              const ci=(c.username||'U')[0].toUpperCase();
              return (
                <div key={c.id} style={{display:'flex',gap:10,marginBottom:12}}>
                  {ca?<img src={ca} alt="" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>:<div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:600,flexShrink:0}}>{ci}</div>}
                  <div><p style={{fontSize:14,lineHeight:1.5,margin:0}}><strong>{c.username}</strong> {c.text}</p><span style={{color:'#8e8e8e',fontSize:11}}>{timeAgo(c.created_at)}</span></div>
                </div>
              );
            })}
          </div>
          {/* actions */}
          <div style={{padding:'8px 16px 4px',borderTop:'1px solid #efefef',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{display:'flex',gap:14}}>
                <button onClick={toggleLike} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill={liked?'#ed4956':'none'} stroke={liked?'#ed4956':'#262626'} strokeWidth="2" style={{transition:'transform .15s',transform:liked?'scale(1.15)':'scale(1)'}}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                </button>
                <button style={{background:'none',border:'none',cursor:'pointer',padding:0}}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>
                <button style={{background:'none',border:'none',cursor:'pointer',padding:0}}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
              </div>
              <button onClick={()=>setBookmarked(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill={bookmarked?'#262626':'none'} stroke="#262626" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{likesCount.toLocaleString()} {likesCount===1?'like':'likes'}</div>
            <div style={{color:'#8e8e8e',fontSize:11,textTransform:'uppercase',letterSpacing:.5}}>{timeAgo(post.created_at)}</div>
          </div>
          {/* comment form */}
          <form onSubmit={addComment} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderTop:'1px solid #efefef',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8e8e8e" strokeWidth="1.5" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment..." style={{flex:1,border:'none',outline:'none',fontSize:14}}/>
            {commentText && <button type="submit" style={{color:'#0095f6',fontWeight:700,fontSize:14,background:'none',border:'none',cursor:'pointer',flexShrink:0}}>Post</button>}
          </form>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({full_name:profile.full_name||'',bio:profile.bio||''});
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar?`http://localhost:5000${profile.avatar}`:null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const initials = (profile.username||'U')[0].toUpperCase();

  const handleFile = e => { const f=e.target.files[0]; if(!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); };
  const save = async () => {
    setSaving(true);
    try {
      const fd=new FormData(); fd.append('full_name',form.full_name); fd.append('bio',form.bio); if(avatarFile) fd.append('avatar',avatarFile);
      const {data} = await axios.put('/api/users/profile',fd,{headers:{'Content-Type':'multipart/form-data'}});
      onSaved(data);
    } catch { toast.error('Failed to save profile'); } finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:12,width:480,maxWidth:'95vw',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #dbdbdb',flexShrink:0}}>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#262626',lineHeight:1}}>×</button>
          <span style={{fontWeight:700,fontSize:16}}>Edit profile</span>
          <button onClick={save} disabled={saving} style={{color:'#0095f6',fontWeight:700,fontSize:14,background:'none',border:'none',cursor:'pointer',opacity:saving?.7:1}}>{saving?'Saving...':'Done'}</button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:20,padding:'20px 16px',background:'#fafafa',borderBottom:'1px solid #dbdbdb',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>
          {avatarPreview?<img src={avatarPreview} alt="" style={{width:56,height:56,borderRadius:'50%',objectFit:'cover'}}/>:<div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:22,fontWeight:600}}>{initials}</div>}
          <button type="button" style={{color:'#0095f6',fontWeight:700,fontSize:14,background:'none',border:'none',cursor:'pointer'}}>Change profile photo</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:16,padding:'16px'}}>
            <label style={{width:80,fontWeight:600,fontSize:14,paddingTop:8,flexShrink:0}}>Name</label>
            <input style={{flex:1,padding:'8px 0',border:'none',borderBottom:'1px solid #dbdbdb',outline:'none',fontSize:14,background:'transparent'}} value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} placeholder="Full name"/>
          </div>
          <div style={{height:1,background:'#efefef'}}/>
          <div style={{display:'flex',alignItems:'flex-start',gap:16,padding:'16px'}}>
            <label style={{width:80,fontWeight:600,fontSize:14,paddingTop:8,flexShrink:0}}>Username</label>
            <input style={{flex:1,padding:'8px 0',border:'none',borderBottom:'1px solid #dbdbdb',outline:'none',fontSize:14,background:'transparent',color:'#8e8e8e'}} value={profile.username} disabled/>
          </div>
          <div style={{height:1,background:'#efefef'}}/>
          <div style={{display:'flex',alignItems:'flex-start',gap:16,padding:'16px'}}>
            <label style={{width:80,fontWeight:600,fontSize:14,paddingTop:8,flexShrink:0}}>Bio</label>
            <div style={{flex:1}}>
              <textarea style={{width:'100%',padding:'8px 0',border:'none',borderBottom:'1px solid #dbdbdb',outline:'none',fontSize:14,background:'transparent',resize:'none',height:80,boxSizing:'border-box'}} value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} placeholder="Bio" maxLength={150}/>
              <div style={{textAlign:'right',fontSize:12,color:'#8e8e8e',marginTop:4}}>{form.bio.length} / 150</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  const p={background:'linear-gradient(90deg,#efefef 25%,#e0e0e0 50%,#efefef 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',borderRadius:4};
  return (
    <div style={{width:'100%',maxWidth:935}}>
      <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
      <div style={{display:'flex',gap:80,alignItems:'center',marginBottom:44,padding:'0 20px'}}>
        <div style={{...p,width:150,height:150,borderRadius:'50%',flexShrink:0}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{...p,width:180,height:22}}/>
          <div style={{display:'flex',gap:8}}><div style={{...p,flex:1,height:32,borderRadius:8}}/><div style={{...p,flex:1,height:32,borderRadius:8}}/></div>
          <div style={{display:'flex',gap:32}}>{[1,2,3].map(i=><div key={i} style={{...p,width:80,height:16}}/>)}</div>
          <div style={{...p,width:140,height:14}}/>
        </div>
      </div>
    </div>
  );
}
