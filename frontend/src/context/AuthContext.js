import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("ig_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get("/api/auth/me")
        .then(r => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (tokenVal, userData) => {
    localStorage.setItem("ig_token", tokenVal);
    axios.defaults.headers.common["Authorization"] = `Bearer ${tokenVal}`;
    setToken(tokenVal);
    setUser(userData);
  };
  const logout = () => {
    localStorage.removeItem("ig_token");
    delete axios.defaults.headers.common["Authorization"];
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
