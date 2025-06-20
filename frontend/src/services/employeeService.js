// frontend/src/services/employeeService.js
import apiClient from './apiClient';

export const getEmployees = () => {
    return apiClient('/api/employees');
};