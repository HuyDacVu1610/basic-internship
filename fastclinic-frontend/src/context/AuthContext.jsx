import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('fc_user');
    const storedToken = localStorage.getItem('fc_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (tenDangNhap, matKhau) => {
    try {
      const response = await axios.post('/auth/login', { tenDangNhap, matKhau });
      
      if (response.data && response.data.success) {
        const { accessToken, user: userData } = response.data.data;
        
        setUser(userData);
        setToken(accessToken);
        
        // Store in localStorage
        localStorage.setItem('fc_user', JSON.stringify(userData));
        localStorage.setItem('fc_token', accessToken);
        
        // Configure Axios authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data?.message || 'Đăng nhập không thành công.' 
        };
      }
    } catch (error) {
      const errResponse = error.response?.data;
      return {
        success: false,
        message: errResponse?.error?.message || error.message || 'Lỗi kết nối đến máy chủ.',
        code: errResponse?.error?.code
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fc_user');
    localStorage.removeItem('fc_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Set up Axios response interceptor for 401 errors (e.g. account locked, token expired)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn('Axios interceptor: Session expired or account locked. Logging out...');
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
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
