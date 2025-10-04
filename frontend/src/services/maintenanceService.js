import apiClient from './apiClient';

export const fetchMaintenanceInfo = () => {
  return apiClient('/api/maintenance');
};

export const updateMaintenanceInfo = (content) => {
  return apiClient('/api/maintenance', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
};
