import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  res => res,
  err => {
    const isAuthCheck = err.config?.url === '/auth/me';
    const isAuthPage = ['/login', '/register'].includes(window.location.pathname);
    if (err.response?.status === 401 && !isAuthCheck && !isAuthPage) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
