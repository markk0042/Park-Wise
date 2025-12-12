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

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = await getAccessToken();
  const isFormData = body instanceof FormData;

  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...defaultHeaders, ...headers },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch (err) {
      errorPayload = { error: { message: response.statusText } };
    }
    const error = new Error(errorPayload?.error?.message || 'Request failed');
    error.status = response.status;
    error.details = errorPayload;
    throw error;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export const httpClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
