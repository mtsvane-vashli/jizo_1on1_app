// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

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
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('jwtToken', data.token);
        // user オブジェクトには userId も含める
        localStorage.setItem('user', JSON.stringify({ username: data.username, id: data.userId }));
        setToken(data.token);
        setUser({ username: data.username, id: data.userId });
        console.log('Login successful, token saved to localStorage and state.');
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || 'ログインに失敗しました。' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'ネットワークエラーが発生しました。' };
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