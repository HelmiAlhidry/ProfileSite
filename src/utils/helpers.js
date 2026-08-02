import { defaultData } from '../data/defaultData';

const LOCAL_STORAGE_KEY = 'portfolio_site_data';

// Load data from LocalStorage or initialize with default data
export const loadData = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultData));
      return defaultData;
    }
    const parsed = JSON.parse(data);
    
    // Fallback/validation merge to make sure all expected keys exist
    const merged = { ...defaultData, ...parsed };
    merged.personal = { ...defaultData.personal, ...parsed.personal };
    merged.about = { ...defaultData.about, ...parsed.about };
    merged.settings = { ...defaultData.settings, ...parsed.settings };
    
    return merged;
  } catch (error) {
    console.error('Failed to load portfolio data from localStorage:', error);
    return defaultData;
  }
};

// Save data to LocalStorage
export const saveData = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save portfolio data to localStorage:', error);
    return false;
  }
};

// Reset to default data
export const resetData = () => {
  saveData(defaultData);
  return defaultData;
};

// Convert image File to Base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Export data as JSON download
export const exportDataAsJSON = (data) => {
  try {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `portfolio_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    return true;
  } catch (error) {
    console.error('Failed to export data:', error);
    return false;
  }
};

// Validate imported JSON data structure
export const validateImportedData = (data) => {
  if (!data || typeof data !== 'object') return false;
  
  // Check required root keys
  const requiredKeys = ['personal', 'about', 'skills', 'experience', 'education', 'services', 'projects', 'blog', 'settings'];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      return false;
    }
  }
  return true;
};

// Generate simple unique IDs
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format date string (e.g. 2026-06-15 to Jun 15, 2026)
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};
