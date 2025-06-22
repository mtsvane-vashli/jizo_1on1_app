// frontend/src/context/AuthContext.js (最終修正版)
import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // ★ userオブジェクトに {id, username, role, organizationId} が入る
    const [token, setToken] = useState(localStorage.getItem('jwtToken')); // ★ 初期値をlocalStorageから取得
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                if (decodedUser.exp * 1000 > Date.now()) {
                    setUser(decodedUser);
                } else {
                    // 有効期限切れ
                    localStorage.removeItem('jwtToken');
                    setToken(null);
                }
            } catch (e) {
                console.error("Failed to decode token", e);
                localStorage.removeItem('jwtToken');
                setToken(null);
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        try {
            const data = await loginUser(username, password);
            localStorage.setItem('jwtToken', data.token);
            setToken(data.token); // ★ トークンを更新することで、useEffectが走り、userが設定される
            return { success: true };
        } catch (error) {
            console.error('Login error:', error.message);
            return { success: false, message: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('jwtToken');
        setToken(null);
        setUser(null);
    };

    const value = { user, token, loading, isAuthenticated: !!user, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};