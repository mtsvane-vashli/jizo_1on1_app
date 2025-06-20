// frontend/src/components/Sidebar.js (修正後)

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  CalendarIcon,
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { name: '新規1on1サポート', path: '/', icon: <CalendarIcon /> },
    { name: '過去のセッションログ', path: '/logs', icon: <BookOpenIcon /> },
    { name: '分析ダッシュボード', path: '/dashboard', icon: <ChartBarIcon /> },
    { name: '学習リソース', path: '/resources', icon: <AcademicCapIcon /> },
    { name: '設定', path: '/settings', icon: <Cog6ToothIcon /> },
  ];

  // ★追加: ユーザー名の頭文字を取得するロジック
  const avatarInitial = user ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="sidebar-container">
      {/* ヘッダー/ロゴ */}
      <div className="sidebar-header">
        <h1>おたすけ地蔵くん</h1>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`sidebar-nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ユーザー情報とログアウト */}
      <div className="sidebar-user-info">
        <div className="sidebar-user-info-flex">
          <div className="sidebar-user-avatar">
            {/* ★修正: <img> タグの代わりに、取得した頭文字を表示 */}
            {avatarInitial}
          </div>
          <div>
            <p className="sidebar-user-name">{user ? user.username : 'ゲスト'}</p>
            {/* ★修正: ハードコーディングされたIDを user オブジェクトから表示 */}
            <p className="sidebar-user-id">{user ? `ID: ${user.id}` : 'ID: ---'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-logout-button">
          ログアウト
        </button>
      </div>
    </div>
  );
}

export default Sidebar;