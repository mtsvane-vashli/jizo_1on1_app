// frontend/src/services/apiClient.js

import { getToken } from './tokenService'; // ★ 修正: tokenServiceから関数をインポート

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const apiClient = async (endpoint, options = {}) => {
    const token = getToken(); // ★ 修正: localStorageから直接取得するのをやめ、専用関数を使用

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 204) {
            return Promise.resolve();
        }

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            const errorMessage = data.message || data.error || `HTTPエラーが発生しました (ステータス: ${response.status})`;
            throw new Error(errorMessage);
        }

        return data;

    } catch (error) {
        console.error(`API Client Error: ${error.name}: ${error.message}`);
        throw error;
    }
};

export default apiClient;
