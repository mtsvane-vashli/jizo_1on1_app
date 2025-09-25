// frontend/src/services/userService.js
import apiClient from './apiClient';

/**
 * (管理者権限で)新しいユーザーを作成する
 * @param {object} userData - { username, email, password }
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

export const requestPasswordReset = ({ email }) => {
    return apiClient('/api/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

export const resetPasswordWithToken = ({ token, newPassword }) => {
    return apiClient('/api/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
    });
};

export const getOrganizationUsers = () => {
    return apiClient('/api/users');
};

export const updateOrganizationUser = (userId, payload) => {
    return apiClient(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
};
