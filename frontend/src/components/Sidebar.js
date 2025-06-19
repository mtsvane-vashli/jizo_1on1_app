// frontend/src/components/Sidebar.js
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout(); // AuthContext の logout 関数を呼び出す
    navigate('/login', { replace: true }); // ログアウト後、ログイン画面へリダイレクト
  };

  // ナビゲーションアイテムの定義
  const navItems = [
    { name: '新規1on1サポート', path: '/', icon: '🗓️' },
    { name: '過去のセッションログ', path: '/logs', icon: '📖' },
    { name: '分析ダッシュボード', path: '/dashboard', icon: '📊' },
    { name: '学習リソース', path: '/resources', icon: '📚' },
    { name: '設定', path: '/settings', icon: '⚙️' },
  ];

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
                {typeof item.icon === 'string' ? (
                    <span className="sidebar-icon">{item.icon}</span>
                ) : (
                    <span className="sidebar-icon">{item.icon}</span> // SVGコンポーネントの場合もspanでラップ
                )}
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
            <img src="https://via.placeholder.com/32/cccccc?text=U" alt="User" />
          </div>
          <div>
            <p className="sidebar-user-name">{user ? user.username : 'ゲスト'}</p>
            <p className="sidebar-user-id">test-user-01</p>
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