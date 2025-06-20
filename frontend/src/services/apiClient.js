// frontend/src/services/apiClient.js

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

/**
 * 汎用的なAPIリクエスト関数
 * @param {string} endpoint - /api/ 以下のエンドポイントパス (例: '/conversations')
 * @param {object} options - fetch API のオプション (method, bodyなど)
 * @returns {Promise<any>} APIからのレスポンスデータ
 * @throws {Error} APIエラーまたはネットワークエラー
 */
const apiClient = async (endpoint, options = {}) => {
    const token = localStorage.getItem('jwtToken');
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;

    } catch (error) {
        console.error(`API Client Error: ${error.message}`);
        throw error; // エラーを呼び出し元に再度スローする
    }
};

export default apiClient;