import api from './axios';

/**
 * Register a new user
 * @param {Object} userData - { email, username, full_name, password }
 * @returns {Promise<Object>} - { message, id, email, username }
 */
export const registerApi = async ({ email, username, full_name, password }) => {
  const response = await api.post('/auth/register', {
    email: email.trim().toLowerCase(),
    username: username.trim(),
    full_name: full_name.trim(),
    password,
  });
  return response.data;
};

/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - { message, access_token, token_type }
 */
export const loginApi = async ({ email, password }) => {
  const response = await api.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  return response.data;
};

/**
 * Get current authenticated user details
 * @returns {Promise<Object>} - { id, email, username, full_name }
 */
export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Request password reset email / token
 * @param {Object} data - { email }
 * @returns {Promise<Object>} - { message, reset_token }
 */
export const forgotPasswordApi = async ({ email }) => {
  const response = await api.post('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
  return response.data;
};

/**
 * Reset password using token
 * @param {Object} data - { token, new_password }
 * @returns {Promise<Object>} - { message }
 */
export const resetPasswordApi = async ({ token, new_password }) => {
  const response = await api.post('/auth/reset-password', {
    token: token.trim(),
    new_password,
  });
  return response.data;
};

/**
 * Check backend API health status
 * @returns {Promise<Object>} - { status: 'healthy', service: 'collabhub-api' }
 */
export const getHealthApi = async () => {
  const response = await api.get('/health');
  return response.data;
};

