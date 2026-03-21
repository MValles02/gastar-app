import axios from 'axios';
import { getErrorMessage } from '../utils/errors.js';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const AUTH_REDIRECT_MESSAGE_KEY = 'gastar.auth.redirect.message';

api.interceptors.response.use(
  response => response,
  error => {
    const isAuthCheck = error.config?.url === '/auth/me';
    const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(window.location.pathname);

    if (error.response?.status === 401 && !isAuthCheck && !isAuthPage) {
      sessionStorage.setItem(
        AUTH_REDIRECT_MESSAGE_KEY,
        getErrorMessage(error, 'Tu sesión venció. Iniciá sesión nuevamente.')
      );
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
