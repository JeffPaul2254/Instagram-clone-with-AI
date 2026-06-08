/**
 * App.js
 *
 * CHANGES from v2:
 *  • Imports FacebookCallbackPage
 *  • Adds Route /auth/facebook/callback — intentionally NOT wrapped in
 *    PublicRoute or PrivateRoute.
 *
 *    WHY not PublicRoute?
 *    PublicRoute redirects to "/" when user !== null. But the callback page
 *    needs to run first to CALL login() and SET the user. If we wrapped it
 *    in PublicRoute, a race condition could redirect away before login() fires.
 *    The page itself navigates to "/" after login() completes, so there is no
 *    security gap — an already-logged-in user who somehow hits this URL will
 *    either get redirected by the callback page (if params are valid) or sent
 *    to /login (if params are missing/corrupt).
 *
 *    WHY not PrivateRoute?
 *    The user is not yet authenticated when this page mounts — that's the
 *    whole point. PrivateRoute would redirect to /login immediately.
 *
 *  • Route ordering: /auth/facebook/callback comes BEFORE /:username so
 *    "auth" is never mistaken for a username parameter.
 *
 * Everything else is unchanged from v2.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage             from './pages/LoginPage';
import SignupPage            from './pages/SignupPage';
import HomePage              from './pages/HomePage';
import ProfilePage           from './pages/ProfilePage';
import ExplorePage           from './pages/ExplorePage';
import MessagesPage          from './pages/MessagesPage';
import ReelsPage             from './pages/ReelsPage';
import PostDetailPage        from './pages/PostDetailPage';
import FacebookCallbackPage  from './pages/FacebookCallbackPage';
import ResetLoginPage        from './pages/ResetLoginPage';
import ForgotPasswordPage   from './pages/ForgotPasswordPage';
import ResetPasswordPage    from './pages/ResetPasswordPage';

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
      {/* ── Public auth routes ── */}
      <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

      {/*
        ── Facebook OAuth callback ──
        No PublicRoute / PrivateRoute wrapper — see comment at top of file.
        Must be declared BEFORE /:username to prevent "auth" matching as username.
      */}
      <Route path="/auth/facebook/callback" element={<FacebookCallbackPage />} />
      {/*
        ── Reset login (email "Log in as username" button) ──
        No wrapper — user is logged out when they arrive here.
        Must be before /:username so "reset-login" is not matched as a username.
        Declared under /auth/ so it groups naturally with the FB callback.
      */}
      <Route path="/auth/reset-login" element={<ResetLoginPage />} />

      {/*
        ── Password reset routes ──
        No PublicRoute / PrivateRoute wrapper:
        - /forgot-password: must be reachable when logged out (and harmless when logged in)
        - /reset-password:  token links arrive from email — user is never logged in
        Both are declared before /:username so "forgot-password" and
        "reset-password" are never mistaken for usernames.
      */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      {/* ── Private app routes ── */}
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