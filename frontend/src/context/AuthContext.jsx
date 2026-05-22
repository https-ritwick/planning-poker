/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api, { setToken } from '../api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'planning-poker-token';

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);

  if (token) {
    setToken(token);
  }

  const authenticate = useCallback(async (endpoint, payload) => {
    const response = await api.post(endpoint, payload);
    const nextToken = response.data.token;
    localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    setTokenState(nextToken);
    setUser(response.data.user);
  }, []);

  const login = useCallback(
    async (email, password) => authenticate('/auth/login', { email, password }),
    [authenticate]
  );
  const register = useCallback(
    async (name, email, password) => authenticate('/auth/register', { name, email, password }),
    [authenticate]
  );

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({ token, user, setUser, login, register, logout }),
    [token, user, login, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
