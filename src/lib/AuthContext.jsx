import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // PUBLIC SETTINGS
      const res = await API.get('/public-settings');
      setAppPublicSettings(res.data);

      // CHECK USER
      await checkUserAuth();

    } catch (err) {
      setAuthError({
        type: 'unknown',
        message: err.response?.data?.message || 'Failed to load app'
      });
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      const res = await API.get('/auth/me');
      setUser(res.data);
      setIsAuthenticated(true);

    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);

      if (err.response?.status === 401) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (credentials) => {
    try {
      const res = await API.post('/auth/login', credentials);
      setUser(res.data);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      setAuthError({
        type: 'login_failed',
        message: err.response?.data?.message || 'Login failed'
      });
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        login,
        logout,
        navigateToLogin,
        checkAppState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};