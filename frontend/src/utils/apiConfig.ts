// API Configuration for network access
export const getApiBaseUrl = () => {
  // Check if we're in development mode
  if ((import.meta as any).env?.DEV) {
    // In development, use the proxy (works for both local and network access)
    return '';
  }
  
  // In production, use the full URL
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '3001'; // Backend port
  
  return `${protocol}//${hostname}:${port}`;
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Helper function to get the current server URL for network access
export const getServerUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  return `${protocol}//${hostname}:${port}`;
};

// Helper function to get the backend URL for network access
export const getBackendUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const backendPort = '3001';
  
  return `${protocol}//${hostname}:${backendPort}`;
}; 