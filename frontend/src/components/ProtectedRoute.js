// frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen"> {/* App.css にスタイルを定義 */}
        <p>認証情報を確認中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 認証されていない場合はログインページにリダイレクト
    return <Navigate to="/login" replace />;
  }

  return children; // 認証されている場合は子コンポーネントを表示
};

export default ProtectedRoute;