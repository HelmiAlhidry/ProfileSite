const API_BASE = '/api';

// Retrieve session token from storage
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchSiteData = async () => {
  const response = await fetch(`${API_BASE}/data`);
  if (!response.ok) {
    throw new Error('Failed to load portfolio database from server.');
  }
  return response.json();
};

export const adminLogin = async (passcode) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode })
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Login verification failed.');
  }
  
  // Save token in session
  if (result.token) {
    sessionStorage.setItem('admin_token', result.token);
  }
  return result;
};

export const saveSiteData = async (data) => {
  const response = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to persist customizations.');
  }
  return result;
};

export const sendContactMessage = async (messageBody) => {
  const response = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messageBody)
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to submit contact message.');
  }
  return result;
};

export const deleteContactMessage = async (messageId) => {
  const response = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete message log.');
  }
  return result;
};

export const resetToTemplate = async () => {
  const response = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to restore default template.');
  }
  return result;
};
