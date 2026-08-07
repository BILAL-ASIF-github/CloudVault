import axios from 'axios';

const api = axios.create({
  // Use VITE_API_URL env variable if set, otherwise use relative /api path (Nginx proxies to backend)
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cloudvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
