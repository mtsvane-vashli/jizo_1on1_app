import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal.js';
import appStyles from './App.module.css';
import { FiMenu } from 'react-icons/fi';

import ThemeToggleButton from './components/ThemeToggleButton';
import Home from './views/Home.js';
import Jizo1on1 from './views/Jizo1on1.js';
import New1on1Support from './views/New1on1Support.js';
import SessionLog from './views/SessionLog.js';
import TranscriptViewer from './views/TranscriptViewer.js';
import Dashboard from './views/Dashboard.js';
import LearningResources from './views/LearningResources.js';
import Settings from './views/Settings.js';
import Login from './views/Login.js';
import Register from './views/Register.js';
import ChangePassword from './views/ChangePassword.js';
import ForgotPassword from './views/ForgotPassword.js';
import ResetPassword from './views/ResetPassword.js';

import ProtectedRoute from './components/ProtectedRoute.js';
import { useAuth } from './context/AuthContext.js';

/* サイドバー付きのアプリ画面 */
function AppLayout({ isMobile, isSidebarOpen, setSidebarOpen }) {
  const { loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => { }
  });

  // ★ 修正: スプレッド記法の誤りを修正
  const closeModal = () => setModalState({ ...modalState, isOpen: false });
  const showLogoutModal = () =>
    setModalState({
      isOpen: true,
      title: 'ログアウト',
      message: '本当にログアウトしますか？',
      onConfirm: async () => {
        try { await logout(); navigate('/login'); }
        catch (error) { console.error('Logout failed', error); }
      }
    });
  const showGoHomeModal = () =>
    setModalState({
      isOpen: true,
      title: 'ホームページへ移動',
      message: '入力中の内容は保存されませんが、ホームページに戻りますか？',
      onConfirm: () => navigate('/')
    });

  if (loading) {
    return (
      <div className={appStyles.loadingScreen}>
        <p>認証情報を確認中...</p>
      </div>
    );
  }

  return (
    <>
      <div className={appStyles.app}>
        <Sidebar
          isCollapsed={isSidebarCollapsed && !isMobile}
          setCollapsed={setSidebarCollapsed}
          onLogoutClick={showLogoutModal}
          onGoHomeClick={showGoHomeModal}
          isMobile={isMobile}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main
          className={`${appStyles.contentArea} ${(isSidebarCollapsed && !isMobile) ? '' : appStyles.sidebarOpen
            }`}
        >
          {isMobile && (
            <div className={appStyles.mobileHeader}>
              <button onClick={() => setSidebarOpen(true)} className={appStyles.hamburgerButton}>
                <FiMenu />
              </button>
              <span className={appStyles.mobileTitle}>地蔵1on1</span>
            </div>
          )}
          <div className={appStyles.contentCard}>
            <Routes>
              <Route index element={<Navigate to="new-1on1" replace />} />
              <Route path="new-1on1" element={<New1on1Support />} />
              <Route path="logs" element={<SessionLog />} />
              <Route path="log/transcript/:id" element={<TranscriptViewer />} />
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

/* ルーティング + トップのスクロール進捗バー */
function AppRoutes() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // スクロール進捗（全ページ共通）
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrollTop = h.scrollTop || document.body.scrollTop;
      const scrollHeight = h.scrollHeight - h.clientHeight;
      const ratio = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, ratio)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  // セッション画面ではグローバルテーマボタンを非表示
  const showGlobalThemeToggle = location.pathname !== '/session';

  return (
    <div className={appStyles.appContainer}>
      <div className={appStyles.progressBar} aria-hidden="true">
        <div className={appStyles.progress} style={{ width: `${progress}%` }} />
      </div>

      <Routes>
        {/* 公開ルート */}
        <Route path="/" element={<Home />} />
        <Route path="/jizo-1on1" element={<Jizo1on1 />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* サイドバー付きの保護されたルート */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <AppLayout
                isMobile={isMobile}
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
              />
            </ProtectedRoute>
          }
        />

        {/* /session 単独ルート */}
        <Route
          path="/session"
          element={
            <ProtectedRoute>
              <New1on1Support />
            </ProtectedRoute>
          }
        />
      </Routes>

      {showGlobalThemeToggle && <ThemeToggleButton className={appStyles.themeToggleGlobal} />}
    </div>
  );
}

function App() {
  return <AppRoutes />;
}
export default App;
