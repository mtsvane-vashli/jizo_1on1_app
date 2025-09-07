// frontend/src/services/apiClient.js

import { getToken } from './tokenService'; // ★ 修正: tokenServiceから関数をインポート

const BACKEND_URL = '';

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

        const contentType = response.headers.get('content-type') || '';
        let rawText = '';
        let data = {};
        try {
            rawText = await response.text();
            if (contentType.includes('application/json')) {
                data = rawText ? JSON.parse(rawText) : {};
            } else {
                data = { message: rawText };
            }
        } catch (parseErr) {
            // JSON以外や壊れたレスポンスに備えたフォールバック
            data = { message: rawText || 'サーバーから不正な応答が返されました。' };
        }

        if (!response.ok) {
            // 502/503などはわかりやすい文言を返す
            if (response.status === 502 || response.status === 503 || response.status === 504) {
                throw new Error('サーバーが一時的に利用できません。時間をおいて再試行してください。');
            }
            const errorMessage = (typeof data === 'object' && (data.message || data.error))
                ? (data.message || data.error)
                : `HTTPエラーが発生しました (ステータス: ${response.status})`;
            throw new Error(errorMessage);
        }

        return data;

    } catch (error) {
        console.error(`API Client Error: ${error.name}: ${error.message}`);
        // ネットワーク到達不可など
        if (error.name === 'TypeError') {
            throw new Error('ネットワークエラーが発生しました。接続状況を確認して再試行してください。');
        }
        throw error;
    }
};

export default apiClient;
