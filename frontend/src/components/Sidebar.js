import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { FiGrid, FiFileText, FiMessageSquare, FiBook, FiSettings, FiLogOut } from 'react-icons/fi';
import ThemeToggleButton from './ThemeToggleButton'; // ★ 1. インポート

// ★ 2. propsに theme と toggleTheme を追加
function Sidebar({ isCollapsed, setCollapsed, onLogoutClick, onGoHomeClick, theme, toggleTheme }) {

  const handleMouseEnter = () => setCollapsed(false);
  const handleMouseLeave = () => setCollapsed(true);

  return (
    <aside 
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div>
        <div className={styles.logo}>
          <h3 className={isCollapsed ? styles.hidden : ''}>地蔵1on1</h3>
          <span className={isCollapsed ? '' : styles.hidden}>J</span>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/app/new-1on1" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            <FiMessageSquare />
            <span className={styles.navText}>新規1on1支援</span>
          </NavLink>
          <NavLink to="/app/logs" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            <FiFileText />
            <span className={styles.navText}>セッションログ</span>
          </NavLink>
          <NavLink to="/app/dashboard" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            <FiGrid />
            <span className={styles.navText}>ダッシュボード</span>
          </NavLink>
          <NavLink to="/app/resources" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            <FiBook />
            <span className={styles.navText}>学習リソース</span>
          </NavLink>
        </nav>
      </div>
      <div className={styles.sidebarFooter}>
        
        <NavLink to="/app/settings" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
          <FiSettings />
          <span className={styles.navText}>設定</span>
        </NavLink>
        
        {/* ★ 3. テーマ切り替えボタンを設置 */}
        <div className={`${styles.navLink} ${styles.themeToggleContainer}`}>
            <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
            <span className={styles.navText}>テーマ切替</span>
        </div>

        <button onClick={onLogoutClick} className={`${styles.navLink} ${styles.logoutButton}`}>
          <FiLogOut />
          <span className={styles.navText}>ログアウト</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;