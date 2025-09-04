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

/**
 * 自分のパスワードを変更する
 * @param {{ currentPassword: string, newPassword: string }} payload
 */
export const changePassword = (payload) => {
    return apiClient('/api/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};
