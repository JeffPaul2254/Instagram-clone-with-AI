import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage      from './pages/LoginPage';
import SignupPage     from './pages/SignupPage';
import HomePage       from './pages/HomePage';
import ProfilePage    from './pages/ProfilePage';
import ExplorePage    from './pages/ExplorePage';
import MessagesPage   from './pages/MessagesPage';
import ReelsPage      from './pages/ReelsPage';
import PostDetailPage from './pages/PostDetailPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="app-loading">
      <div className="spinner spinner--md" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"            element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup"           element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/"                 element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/explore"          element={<PrivateRoute><ExplorePage /></PrivateRoute>} />
      <Route path="/messages"         element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
      <Route path="/messages/:userId" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
      <Route path="/reels"            element={<PrivateRoute><ReelsPage /></PrivateRoute>} />
      {/* /p/:postId must come before /:username to avoid conflict */}
      <Route path="/p/:postId"        element={<PrivateRoute><PostDetailPage /></PrivateRoute>} />
      <Route path="/:username"        element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="*"                 element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
