import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const token = await user.getIdToken(true); // Force refresh token
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
      // Don't throw error here, let the request proceed without token
      // The server will handle unauthorized requests
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expired or invalid
          console.error('Authentication error:', error.response.data);
          // Let the component handle the redirect to login
          break;
        case 403:
          console.error('Access forbidden:', error.response.data);
          break;
        case 404:
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Error in request configuration
      console.error('Request configuration error:', error.message);
    }
    return Promise.reject(error);
  }
);

const expenseApi = {
  // Expense-related endpoints
  getExpenses: (params) => api.get('/api/expenses', { params }),
  createExpense: (data) => api.post('/api/expenses', data),
  updateExpense: (id, data) => api.put(`/api/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/api/expenses/${id}`),
  getMonthlyReport: (params) => api.get('/api/expenses/monthly-report', { params }),
  getDashboardData: () => api.get('/api/expenses/dashboard'),
  getFinancialInsights: () => api.get('/api/expenses/insights'),
};

export { api, expenseApi };
