// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal.js';
import appStyles from './App.module.css';

// Views
import Home from './views/Home.js';
import New1on1Support from './views/New1on1Support.js';
import SessionLog from './views/SessionLog.js';
import Dashboard from './views/Dashboard.js';
import LearningResources from './views/LearningResources.js';
import Settings from './views/Settings.js';
import Login from './views/Login.js';
import Register from './views/Register.js';

// Auth
import ProtectedRoute from './components/ProtectedRoute.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';

// サイドバーとメインコンテンツを持つレイアウト
function AppLayout({ theme, toggleTheme }) {
  const { loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const showLogoutModal = () => {
    setModalState({
      isOpen: true,
      title: 'ログアウト',
      message: '本当にログアウトしますか？',
      onConfirm: async () => {
        try {
          await logout();
          navigate('/login');
        } catch (error) { console.error('Logout failed', error); }
      }
    });
  };

  const showGoHomeModal = () => {
    setModalState({
      isOpen: true,
      title: 'ホームページへ移動',
      message: '入力中の内容は保存されませんが、ホームページに戻りますか？',
      onConfirm: () => navigate('/')
    });
  };

  if (loading) {
    return <div className={appStyles.loadingScreen}><p>認証情報を確認中...</p></div>;
  }

  return (
    <>
      <div className={appStyles.app}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
          onLogoutClick={showLogoutModal}
          onGoHomeClick={showGoHomeModal}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        
        <main className={`${appStyles.contentArea} ${isSidebarCollapsed ? '' : appStyles.sidebarOpen}`}>
          <div className={appStyles.contentCard}>
            <Routes>
              {/* /appにアクセスした場合は/app/new-1on1にリダイレクト */}
              <Route index element={<Navigate to="new-1on1" replace />} />
              <Route path="new-1on1" element={<New1on1Support />} />
              <Route path="logs" element={<SessionLog />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="resources" element={<LearningResources />} />
              <Route path="settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
      >
        <p>{modalState.message}</p>
      </Modal>
    </>
  );
}

// アプリケーション全体のルーティング
function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`${theme}-mode`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <AuthProvider>
      <Routes>
        {/* 公開ルート */}
        <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/login" element={<Login theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/register" element={<Register theme={theme} toggleTheme={toggleTheme} />} />
        
        {/* 保護されたメインアプリケーションのルート (サイドバーあり) */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <AppLayout theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        
        {/* ★★★ 1on1セッション専用のルートを追加 (サイドバーなし) ★★★ */}
        <Route 
          path="/session"
          element={
            <ProtectedRoute>
              <New1on1Support />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
