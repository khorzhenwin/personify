import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { apiClient } from '@/lib/api/client';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface ProfileUpdateData {
  first_name: string;
  last_name: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface DataExportData {
  format: string;
  date_from?: string;
  date_to?: string;
  include_categories: boolean;
  include_budgets: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  changePassword: (data: PasswordChangeData) => Promise<void>;
  exportData: (data: DataExportData) => Promise<void>;
}

// Use proxy in production (Vercel) to avoid mixed content issues
const getApiBaseUrl = () => {
  // If we're in the browser and on HTTPS, use the proxy
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/api/proxy';
  }
  
  // Otherwise use the direct backend URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await axios.post('/api/auth/login/', credentials);
          const { user, access } = response.data;
          
          if (!user || !access) {
            throw new Error('Invalid response format: missing user or access token');
          }
          
          // Set axios default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          
          set({
            user,
            token: access,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          let errorMessage = 'Login failed';
          
          if (error.response?.data) {
            const data = error.response.data;
            if (data.message) {
              errorMessage = data.message;
            } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
              errorMessage = data.non_field_errors[0];
            } else if (data.detail) {
              errorMessage = data.detail;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      register: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await axios.post('/api/auth/register/', userData);
          const { user, access } = response.data;
          
          // Set axios default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          
          set({
            user,
            token: access,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          let errorMessage = 'Registration failed';
          
          if (error.response?.data) {
            const data = error.response.data;
            if (data.message) {
              errorMessage = data.message;
            } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
              errorMessage = data.non_field_errors[0];
            } else if (data.detail) {
              errorMessage = data.detail;
            } else {
              // Handle field-specific errors
              const fieldErrors = Object.values(data).flat();
              if (fieldErrors.length > 0) {
                errorMessage = fieldErrors[0] as string;
              }
            }
          }
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        // Clear axios authorization header
        delete axios.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      updateProfile: async (data: ProfileUpdateData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiClient.put('/api/auth/profile-update/', data);
          const { user } = response.data;
          
          set({
            user,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Profile update failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      changePassword: async (data: PasswordChangeData) => {
        try {
          set({ isLoading: true, error: null });
          
          await apiClient.post('/api/auth/change-password/', data);
          
          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          let errorMessage = 'Password change failed';
          
          if (error.response?.data) {
            const responseData = error.response.data;
            if (responseData.message) {
              errorMessage = responseData.message;
            } else if (responseData.non_field_errors && Array.isArray(responseData.non_field_errors)) {
              errorMessage = responseData.non_field_errors[0];
            } else if (responseData.detail) {
              errorMessage = responseData.detail;
            } else {
              // Handle field-specific errors
              const fieldErrors = Object.values(responseData).flat();
              if (fieldErrors.length > 0) {
                errorMessage = fieldErrors[0] as string;
              }
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      exportData: async (data: DataExportData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiClient.post('/api/auth/export-data/', data, {
            responseType: 'blob'
          });
          
          // Create download link
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          
          // Get filename from response headers or use default
          const contentDisposition = response.headers['content-disposition'];
          let filename = 'financial_data';
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          } else {
            filename += data.format === 'csv' ? '.zip' : '.json';
          }
          
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          
          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Data export failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set axios authorization header on app load if token exists
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);