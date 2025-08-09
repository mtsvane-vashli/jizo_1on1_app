// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal.js';
import appStyles from './App.module.css';
import { FiMenu } from 'react-icons/fi';

import ThemeToggleButton from './components/ThemeToggleButton';
import Home from './views/Home.js';
import New1on1Support from './views/New1on1Support.js';
import SessionLog from './views/SessionLog.js';
import TranscriptViewer from './views/TranscriptViewer.js';
import Dashboard from './views/Dashboard.js';
import LearningResources from './views/LearningResources.js';
import Settings from './views/Settings.js';
import Login from './views/Login.js';
import Register from './views/Register.js';

import ProtectedRoute from './components/ProtectedRoute.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';

function AppLayout({ isMobile, isSidebarOpen, setSidebarOpen }) {
  const { loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const closeModal = () => setModalState({ ...modalState, isOpen: false });
  const showLogoutModal = () => { setModalState({ isOpen: true, title: 'ログアウト', message: '本当にログアウトしますか？', onConfirm: async () => { try { await logout(); navigate('/login'); } catch (error) { console.error('Logout failed', error); } } }); };
  const showGoHomeModal = () => { setModalState({ isOpen: true, title: 'ホームページへ移動', message: '入力中の内容は保存されませんが、ホームページに戻りますか？', onConfirm: () => navigate('/') }); };

  if (loading) {
    return <div className={appStyles.loadingScreen}><p>認証情報を確認中...</p></div>;
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
        <main className={`${appStyles.contentArea} ${(isSidebarCollapsed && !isMobile) ? '' : appStyles.sidebarOpen}`}>
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
      <Modal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={modalState.onConfirm} title={modalState.title}>
        <p>{modalState.message}</p>
      </Modal>
    </>
  );
}

function AppRoutes() {
  const [theme, setTheme] = useState('light');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`${theme}-mode`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Don't show global theme toggle on the session page
  const showGlobalThemeToggle = location.pathname !== '/session';

  return (
    <div className={appStyles.appContainer}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app/*" element={<ProtectedRoute><AppLayout isMobile={isMobile} isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} /></ProtectedRoute>} />
        <Route path="/session" element={<ProtectedRoute><New1on1Support theme={theme} toggleTheme={toggleTheme} /></ProtectedRoute>} />
      </Routes>

      {showGlobalThemeToggle && (
        <ThemeToggleButton
          theme={theme}
          toggleTheme={toggleTheme}
          className={appStyles.themeToggleGlobal}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
