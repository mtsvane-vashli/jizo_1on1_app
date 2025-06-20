// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginUser } from '../services/authService';

// AuthContextの作成
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // ログイン中のユーザー情報 (username, id)
  const [token, setToken] = useState(null); // JWT
  const [loading, setLoading] = useState(true); // 初期ロード中か

  useEffect(() => {
    // コンポーネントマウント時にlocalStorageからトークンを読み込む
    const storedToken = localStorage.getItem('jwtToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        // パース失敗時はクリア
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ログイン処理
  const login = async (username, password) => {
    try {
      // サービス層の関数を呼び出す
      const data = await loginUser(username, password);
      
      // 成功した場合、状態を更新する
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('user', JSON.stringify({ username: data.username, id: data.userId }));
      setToken(data.token);
      setUser({ username: data.username, id: data.userId });
      
      return { success: true, message: data.message };

    } catch (error) {
      // サービス層からスローされたエラーをキャッチ
      console.error('Login error:', error.message);
      return { success: false, message: error.message };
    }
  };

  // ログアウト処理
  const logout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const authContextValue = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token, // ユーザーとトークンがあれば認証済み
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 認証コンテキストを使用するためのカスタムフック
export const useAuth = () => {
  return useContext(AuthContext);
};