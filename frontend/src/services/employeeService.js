// frontend/src/services/employeeService.js (修正後)

import apiClient from './apiClient';

/**
 * ログイン中のユーザーが所属する組織の部下一覧を取得する
 * @returns {Promise<Array<object>>}
 */
export const getEmployees = () => {
    return apiClient('/api/employees');
};

/**
 * 新しい部下を作成する
 * @param {object} employeeData - { name: string, email?: string }
 * @returns {Promise<object>}
 */
export const createEmployee = (employeeData) => {
    return apiClient('/api/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData),
    });
};