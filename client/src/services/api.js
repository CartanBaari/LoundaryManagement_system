import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export { api };

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Order API endpoints
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  getStats: () => api.get('/orders/stats/overview'),
};

// User API endpoints
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStaff: () => api.get('/users/staff/list'),
  getStaffWorkload: (params) => api.get('/users/staff/workload', { params }),
};

export const serviceAPI = {
  getAll: (params) => api.get('/services', { params }),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

export const categoryAPI = {
  getAll: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
};

// Notification API endpoints
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getEmailStatus: () => api.get('/notifications/email-status'),
  sendBroadcast: (data) => api.post('/notifications/broadcast', data),
  sendDirect: (data) => api.post('/notifications/direct', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export default api;
