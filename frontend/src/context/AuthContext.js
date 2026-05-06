/**
 * AuthContext.js
 *
 * CHANGES from v1:
 *  • Replaced the global axios.defaults.headers mutation with an axios
 *    request interceptor that reads the token from localStorage on every
 *    call. This is safer: the old approach set a global header that persisted
 *    even after logout until the next page load. The interceptor always reads
 *    the live value, so logout is instant and consistent across tabs.
 *
 *  • token is now exposed on the context object so components like
 *    useSocket can read it without touching localStorage directly.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AuthContext = createContext();

// ── Axios request interceptor ────────────────────────────────
// Attaches the JWT to every outgoing axios request automatically.
// Reading from localStorage each time means the token is always current —
// no stale header if the user logs out in another tab.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('ig_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(localStorage.getItem('ig_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me')
        .then(r => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (tokenVal, userData) => {
    localStorage.setItem('ig_token', tokenVal);
    setToken(tokenVal);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ig_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
