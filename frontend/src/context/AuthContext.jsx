/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  loginApi, 
  registerApi, 
  getMeApi, 
  getHealthApi, 
  forgotPasswordApi, 
  resetPasswordApi 
} from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('collabhub_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('collabhub_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [healthInfo, setHealthInfo] = useState({
    status: 'checking',
    service: 'collabhub-api',
    isOnline: false,
    checkedAt: null,
  });

  // Health check handler
  const checkHealth = useCallback(async () => {
    try {
      const data = await getHealthApi();
      setHealthInfo({
        status: data.status || 'healthy',
        service: data.service || 'collabhub-api',
        isOnline: data.status === 'healthy',
        checkedAt: new Date().toLocaleTimeString(),
      });
      return data;
    } catch (err) {
      setHealthInfo({
        status: 'offline',
        service: 'collabhub-api',
        isOnline: false,
        checkedAt: new Date().toLocaleTimeString(),
        error: err.message,
      });
      return null;
    }
  }, []);

  // Fetch current user from /auth/me
  const fetchCurrentUser = useCallback(async () => {
    try {
      const userData = await getMeApi();
      setUser(userData);
      localStorage.setItem('collabhub_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      // If token is invalid or expired
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('collabhub_token');
        localStorage.removeItem('collabhub_user');
        setToken(null);
        setUser(null);
      }
      throw error;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const savedToken = localStorage.getItem('collabhub_token');
      if (savedToken) {
        try {
          await fetchCurrentUser();
        } catch {
          // Token was invalid / expired, already cleared in fetchCurrentUser
        }
      }
      
      // Also check API health
      await checkHealth();

      if (isMounted) {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for global unauthorized events dispatched by Axios interceptor
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser, checkHealth]);

  // Login handler
  const login = async (email, password) => {
    const data = await loginApi({ email, password });
    const accessToken = data.access_token;
    
    // Save token
    localStorage.setItem('collabhub_token', accessToken);
    setToken(accessToken);

    // Fetch user details immediately
    const userProfile = await fetchCurrentUser();
    return { token: accessToken, user: userProfile, tokenType: data.token_type };
  };

  // Register handler
  const register = async (userData) => {
    return await registerApi(userData);
  };

  // Forgot password handler
  const forgotPassword = async (email) => {
    return await forgotPasswordApi({ email });
  };

  // Reset password handler
  const resetPassword = async (token, newPassword) => {
    return await resetPasswordApi({ token, new_password: newPassword });
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('collabhub_token');
    localStorage.removeItem('collabhub_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    loading,
    healthInfo,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    checkHealth,
    refreshUser: () => (token ? fetchCurrentUser() : Promise.resolve(null)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
