import axios from 'axios';

// In development, use relative URL to route requests via the Vite proxy (configured in vite.config.js)
// This avoids browser CORS restrictions with the FastAPI backend on port 8001.
// In production, fallback to VITE_API_BASE_URL or default backend URL.
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to automatically attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('collabhub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common error codes globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token is expired or unauthorized, clear storage and notify app
      const hadToken = !!localStorage.getItem('collabhub_token');
      localStorage.removeItem('collabhub_token');
      localStorage.removeItem('collabhub_user');

      // Dispatch an event so AuthContext or Router can respond gracefully if needed
      if (hadToken) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
