const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

// Get JWT token from localStorage
function getAccessToken() {
  return localStorage.getItem('auth_token');
}

// Store JWT token in localStorage
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal, timeout = 65000 } = {}) {
  const token = await getAccessToken();
  const isFormData = body instanceof FormData;

  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  console.log(`🌐 [HTTP] ${method} ${url}`, { body, headers: defaultHeaders });

  // Create AbortController for timeout if not provided
  const controller = signal ? null : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const response = await fetch(url, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: signal || controller?.signal,
      credentials: 'include',
    });
    
    // Clear timeout if request completed
    if (timeoutId) clearTimeout(timeoutId);

    console.log(`📡 [HTTP] Response status: ${response.status} ${response.statusText}`, {
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorPayload;
      try {
        errorPayload = await response.json();
        console.error(`❌ [HTTP] Error response:`, errorPayload);
      } catch (err) {
        const text = await response.text();
        errorPayload = { error: { message: response.statusText }, raw: text };
        console.error(`❌ [HTTP] Error (non-JSON):`, errorPayload);
      }
      const error = new Error(errorPayload?.error?.message || 'Request failed');
      error.status = response.status;
      error.details = errorPayload;
      throw error;
    }

    if (response.status === 204) {
      console.log(`✅ [HTTP] No content (204)`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      console.log(`✅ [HTTP] JSON response:`, jsonData);
      return jsonData;
    }
    const textData = await response.text();
    console.log(`✅ [HTTP] Text response:`, textData);
    return textData;
  } catch (error) {
    // Clear timeout if it was set
    if (timeoutId) clearTimeout(timeoutId);
    
    // Handle timeout/abort errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      const timeoutError = new Error(`Request timed out after ${timeout}ms`);
      timeoutError.status = 408; // Request Timeout
      timeoutError.isTimeout = true;
      console.error(`❌ [HTTP] Request timeout:`, timeoutError);
      throw timeoutError;
    }
    
    console.error(`❌ [HTTP] Request failed:`, {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    throw error;
  }
}

export const httpClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
