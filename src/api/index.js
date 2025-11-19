import { httpClient } from './httpClient';

// Auth
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
  const { user, message } = await httpClient.post('/auth/users/invite', payload);
  return { user, message };
};
export const deleteUser = async (id) => {
  const { success, message } = await httpClient.delete(`/auth/users/${id}`);
  return { success, message };
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
export const uploadEvidence = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return httpClient.post('/uploads/evidence', formData);
};

// Reports
export const fetchDashboardSummary = () => httpClient.get('/reports/dashboard-summary');
