import { httpClient } from './httpClient';

// Auth endpoints
export const fetchCurrentUser = async () => {
  const { user } = await httpClient.get('/auth/me');
  return user;
};
export const updateCurrentUser = async (payload) => {
  const { profile } = await httpClient.patch('/auth/me', payload);
  return profile;
};
export const listUsers = async () => {
  const { users } = await httpClient.get('/auth/users');
  return users;
};
export const updateUser = async (id, payload) => {
  const { user } = await httpClient.patch(`/auth/users/${id}`, payload);
  return user;
};
export const inviteUser = async (payload) => {
  const result = await httpClient.post('/auth/users/invite', payload);
  return result;
};
export const deleteUser = async (id) => {
  const result = await httpClient.delete(`/auth/users/${id}`);
  return result;
};
export const checkEmailExists = async (email) => {
  const { exists } = await httpClient.post('/auth/check-email', { email });
  return exists;
};

// Custom auth endpoints
export const login = async (email, password) => {
  const { user, token } = await httpClient.post('/auth/login', { email, password });
  return { user, token };
};

export const requestPasswordReset = async (email) => {
  const result = await httpClient.post('/auth/request-password-reset', { email });
  return result;
};

export const resetPassword = async (token, password) => {
  const result = await httpClient.post('/auth/reset-password', { token, password });
  return result;
};

export const updatePassword = async (currentPassword, newPassword) => {
  const result = await httpClient.post('/auth/update-password', { currentPassword, newPassword });
  return result;
};

// Vehicles
export const fetchVehicles = async (orderBy = 'permit_number') => {
  const { vehicles } = await httpClient.get(`/vehicles?orderBy=${orderBy}`);
  return vehicles;
};
export const createVehicle = async (payload) => {
  const { vehicle } = await httpClient.post('/vehicles', payload);
  return vehicle;
};
export const updateVehicle = async (id, payload) => {
  const { vehicle } = await httpClient.patch(`/vehicles/${id}`, payload);
  return vehicle;
};
export const deleteVehicle = (id) => httpClient.delete(`/vehicles/${id}`);
export const deleteAllVehicles = () => httpClient.delete('/vehicles');
export const bulkInsertVehicles = (vehicles) => httpClient.post('/vehicles/bulk', { vehicles });
export const bulkUpsertVehicles = (vehicles) => httpClient.post('/vehicles/bulk-upsert', { vehicles });
export const bulkReplaceVehicles = (vehicles) => httpClient.post('/vehicles/bulk-replace', { vehicles });
export const updateAllParkingTypes = () => httpClient.post('/vehicles/update-parking-types');

// Parking Logs
export const fetchParkingLogs = async (limit) => {
  const { logs } = await httpClient.get(`/parking-logs${limit ? `?limit=${limit}` : ''}`);
  return logs;
};
export const createParkingLog = async (payload) => {
  const { log } = await httpClient.post('/parking-logs', payload);
  return log;
};
export const deleteParkingLog = (id) => httpClient.delete(`/parking-logs/${id}`);

// Complaints
export const fetchComplaints = async () => {
  const { complaints } = await httpClient.get('/complaints');
  return complaints;
};
export const createComplaint = async (payload) => {
  const { complaint } = await httpClient.post('/complaints', payload);
  return complaint;
};
export const updateComplaint = async (id, payload) => {
  const { complaint } = await httpClient.patch(`/complaints/${id}`, payload);
  return complaint;
};
export const deleteComplaint = (id) => httpClient.delete(`/complaints/${id}`);
export const bulkDeleteComplaints = (ids) => httpClient.post('/complaints/bulk-delete', { ids });

// Uploads
export const uploadEvidence = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const result = await httpClient.post('/uploads/evidence', formData);
    // Handle both response formats
    return result?.file_url ? result : { file_url: result };
  } catch (error) {
    console.error('Upload evidence error:', error);
    throw error;
  }
};

// Reports
export const fetchDashboardSummary = () => httpClient.get('/reports/dashboard-summary');
