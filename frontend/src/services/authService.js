// frontend/src/services/authService.js

import apiClient from './apiClient';

/**
 * ログインAPIを呼び出す
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} APIからのレスポンスデータ
 * @throws {Error} APIエラーまたはネットワークエラー
 */
export const loginUser = async (username, password) => {
    // apiClient を使うので try...catch は不要
    return apiClient('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

/**
 * 新規ユーザー登録APIを呼び出す
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} APIからのレスポンスデータ
 * @throws {Error} APIエラーまたはネットワークエラー
 */
export const registerUser = async (username, password) => {
    // apiClient を使うので try...catch は不要
    return apiClient('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};