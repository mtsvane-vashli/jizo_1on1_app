// frontend/src/App.js
import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';

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

  // ロード完了後、認証されていなければログインページへリダイレクト
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // ロード中の表示
  if (loading) {
    return (
      <div className="loading-screen">
        <p>認証情報を確認中...</p>
      </div>
    );
  }

  // 認証されていない場合は null を返す (useEffect のリダイレクトに任せる)
  // これにより、ProtectedRoute の外側 (login/register) にいる場合はそのままレンダリングされ、
  // 内側 (/*) にいる場合は ProtectedRoute がリダイレクトを処理する
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="App">
      {/* 左側のサイドバー (ログイン後のみ表示) */}
      <Sidebar />

      {/* 右側のメインコンテンツエリア */}
      <div className="main-content-area">
        <div className="main-content-card">
          <Routes>
            <Route path="/" element={<New1on1Support />} />
            <Route path="/logs" element={<SessionLog />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resources" element={<LearningResources />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// AuthProvider でアプリケーション全体を囲む
function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ログイン・登録画面は認証不要なので、ProtectedRouteの外に置く */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* その他のすべてのルートは ProtectedRoute で保護する */}
        <Route path="/*" element={<ProtectedRoute><AppContent /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;