// frontend/src/services/tokenService.js

const TOKEN_KEY = 'jwtToken';

/**
 * ローカルストレージからJWTトークンを取得する
 * @returns {string | null} トークンまたはnull
 */
export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * JWTトークンをローカルストレージに保存する
 * @param {string} token 保存するトークン
 */
export const setToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
};

/**
 * ローカルストレージからJWTトークンを削除する
 */
export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};
