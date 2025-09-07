import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser } from '../services/authService';
import { getToken, setToken as storeToken, removeToken } from '../services/tokenService';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(getToken());
    const [loading, setLoading] = useState(true);
    // ★★★ テーマの状態管理をAuthContextに一元化 ★★★
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                if (decodedUser.exp * 1000 > Date.now()) {
                    setUser(decodedUser);
                } else {
                    logout(); // 有効期限切れ
                }
            } catch (e) {
                console.error("Failed to decode token", e);
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    // ★★★ テーマが変更されたらlocalStorageとbodyのクラスを更新 ★★★
    useEffect(() => {
        localStorage.setItem('theme', theme);
        // 以前のクラスを削除してから新しいクラスを追加
        document.body.className = '';
        document.body.classList.add(`${theme}-mode`);
    }, [theme]);

    const login = async (username, password) => {
        try {
            const data = await loginUser(username, password);
            // トークン保存と即時ユーザー設定（useEffect待ちのレースを避ける）
            storeToken(data.token);
            setToken(data.token);
            try {
                const decoded = jwtDecode(data.token);
                setUser(decoded);
            } catch (e) {
                console.warn('Failed to decode token right after login:', e);
            }
            return { success: true };
        } catch (error) {
            console.error('Login error:', error.message);
            return { success: false, message: error.message };
        }
    };

    const logout = () => {
        removeToken();
        setToken(null);
        setUser(null);
    };

    // ★★★ テーマ切り替え関数 ★★★
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // 外部（例: パスワード変更後）から新しいトークンを適用
    const applyNewToken = (newToken) => {
        storeToken(newToken);
        setToken(newToken);
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        applyNewToken,
        // ★★★ コンテキストにテーマと切り替え関数を渡す ★★★
        theme,
        toggleTheme
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
