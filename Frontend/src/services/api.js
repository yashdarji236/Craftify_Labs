const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Helper to make API requests with JSON headers and optional auth token
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('craftify_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong. Please try again.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to backend server. Make sure the server is running on port 3000.');
    }
    throw error;
  }
}

export const authService = {
  // Login user
  login: async (credentials) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data?.data?.token) {
      localStorage.setItem('craftify_token', data.data.token);
      localStorage.setItem('craftify_user', JSON.stringify(data.data));
    }
    return data;
  },

  // Register user
  register: async (userData) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data?.data?.token) {
      localStorage.setItem('craftify_token', data.data.token);
      localStorage.setItem('craftify_user', JSON.stringify(data.data));
    }
    return data;
  },

  // Fetch current user details
  getMe: async () => {
    return await request('/auth/me', {
      method: 'GET',
    });
  },

  // Logout
  logout: () => {
    localStorage.removeItem('craftify_token');
    localStorage.removeItem('craftify_user');
  },

  // Get stored auth state
  getStoredAuth: () => {
    const token = localStorage.getItem('craftify_token');
    const user = localStorage.getItem('craftify_user');
    return {
      token,
      user: user ? JSON.parse(user) : null,
    };
  },
};
