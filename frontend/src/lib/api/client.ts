import axios from 'axios';

// Use proxy in production (Vercel) to avoid mixed content issues
const getApiBaseUrl = () => {
  // Force direct backend URL in development
  if (process.env.NODE_ENV === 'development') {
    const directUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('ApiClient: Development mode - using direct backend URL:', directUrl);
    return directUrl;
  }
  
  // If we're in the browser and on HTTPS AND on Vercel domain, use the proxy
  if (typeof window !== 'undefined' && 
      window.location.protocol === 'https:' && 
      window.location.hostname.includes('vercel.app')) {
    console.log('ApiClient: Using proxy for production');
    return '/api/proxy';
  }
  
  // Otherwise use the direct backend URL
  const directUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  console.log('ApiClient: Using direct backend URL:', directUrl);
  return directUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  // Get token from Zustand persist storage
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to parse auth storage:', error);
    }
  }
  return config;
});

// Response interceptor for handling auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth storage
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
