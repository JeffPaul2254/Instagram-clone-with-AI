/**
 * context/AuthContext.js
 *
 * CHANGES:
 *  • Imports the shared axios instance from utils/axios instead of the raw
 *    axios package. That instance has baseURL set to REACT_APP_API_URL, so
 *    all API calls target Railway (not the Vercel frontend).
 *  • Removed the duplicate axios.interceptors.request — the interceptor now
 *    lives in utils/axios.js alongside the baseURL config.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../utils/axios';   // ← shared instance with baseURL + auth interceptor

const AuthContext = createContext();

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