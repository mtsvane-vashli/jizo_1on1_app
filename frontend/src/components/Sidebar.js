// frontend/src/components/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

import {
  CalendarIcon,
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

function Sidebar() {
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

  const avatarInitial = user ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <aside className={styles.container}>
      <div className={styles.header}>
        <h1>おたすけ地蔵くん</h1>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.name} className={styles.navItem}>
              <NavLink
                to={item.path}
                end //  '/' が他のパスにマッチしないようにする
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.icon}>{item.icon}</span>
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.userInfo}>
        <div className={styles.userInfoFlex}>
          <div className={styles.userAvatar}>
            {avatarInitial}
          </div>
          <div>
            <p className={styles.userName}>{user ? user.username : 'ゲスト'}</p>
            <p className={styles.userId}>{user ? `ID: ${user.id}` : 'ID: ---'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          ログアウト
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;