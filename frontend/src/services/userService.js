// frontend/src/services/userService.js
import apiClient from './apiClient';

/**
 * (管理者権限で)新しいユーザーを作成する
 * @param {object} userData - { username, password }
 * @returns {Promise<object>}
 */
export const createUser = (userData) => {
    return apiClient('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};