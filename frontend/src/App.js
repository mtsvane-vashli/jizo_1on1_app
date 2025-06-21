// frontend/src/App.js
import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import styles from './App.module.css'; // ★ CSS Modules をインポート

// 各ビューコンポーネントをインポート
import New1on1Support from './views/New1on1Support';
import SessionLog from './views/SessionLog';
import Dashboard from './views/Dashboard';
import LearningResources from './views/LearningResources';
import Settings from './views/Settings';

// 認証関連のコンポーネントとコンテキスト
import Login from './views/Login';
import Register from './views/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <p>認証情報を確認中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.contentArea}>
        <div className={styles.contentCard}>
          <Routes>
            <Route path="/" element={<New1on1Support />} />
            <Route path="/logs" element={<SessionLog />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resources" element={<LearningResources />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedRoute><AppContent /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;