// frontend/src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { FiGrid, FiFileText, FiMessageSquare, FiBook, FiSettings, FiLogOut } from 'react-icons/fi';

// ★ 追加: サイドバー用アイコン（黒のSVG。CSSで白に変換）
import brandIcon from '../assets/icon.svg';

function Sidebar({
  isCollapsed,
  setCollapsed,
  onLogoutClick,
  onGoHomeClick,
  isMobile,
  isSidebarOpen,
  onClose
}) {

  const handleMouseEnter = () => {
    if (!isMobile) setCollapsed(false);
  };
  const handleMouseLeave = () => {
    if (!isMobile) setCollapsed(true);
  };

  // モバイル時にメニュー項目をクリックしたらサイドバーを閉じる
  const handleLinkClick = () => {
    if (isMobile) onClose();
  };

  const sidebarClasses = `
    ${styles.sidebar} 
    ${isCollapsed ? styles.collapsed : ''}
    ${isMobile ? styles.mobile : ''}
    ${isSidebarOpen ? styles.open : ''}
  `;

  return (
    <>
      {/* モバイル時にメニューが開いた時の背景オーバーレイ */}
      {isMobile && isSidebarOpen && <div className={styles.overlay} onClick={onClose}></div>}

      <aside
        className={sidebarClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div>
          <div className={styles.logo}>
            {/* 展開時のタイトルは従来どおり */}
            <h3 className={isCollapsed ? styles.hidden : ''}>地蔵1on1</h3>

            {/* 折りたたみ時は「J」→画像（白化）に差し替え */}
            <img
              src={brandIcon}
              alt="App logo"
              width="32"
              height="32"
              className={`${styles.brandImage} ${styles.brandWhite} ${isCollapsed ? '' : styles.hidden}`}
            />
          </div>

          <nav className={styles.nav}>
            <NavLink
              to="/app/new-1on1"
              onClick={handleLinkClick}
              className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
            >
              <FiMessageSquare />
              <span className={styles.navText}>新規1on1支援</span>
            </NavLink>

            <NavLink
              to="/app/logs"
              onClick={handleLinkClick}
              className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
            >
              <FiFileText />
              <span className={styles.navText}>セッションログ</span>
            </NavLink>

            <NavLink
              to="/app/dashboard"
              onClick={handleLinkClick}
              className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
            >
              <FiGrid />
              <span className={styles.navText}>ダッシュボード</span>
            </NavLink>

            <NavLink
              to="/app/resources"
              onClick={handleLinkClick}
              className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
            >
              <FiBook />
              <span className={styles.navText}>学習リソース</span>
            </NavLink>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <NavLink
            to="/app/settings"
            onClick={handleLinkClick}
            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
          >
            <FiSettings />
            <span className={styles.navText}>設定</span>
          </NavLink>

          <button onClick={onLogoutClick} className={`${styles.navLink} ${styles.logoutButton}`}>
            <FiLogOut />
            <span className={styles.navText}>ログアウト</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
