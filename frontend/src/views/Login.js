// frontend/src/views/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';
// ★ 修正: ThemeToggleButtonのインポートを削除
import { FiHome } from 'react-icons/fi';
import { fetchMaintenanceInfo } from '../services/maintenanceService';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeSlashedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274 4.057 5.064 7 9.542 7 .847 0 1.673.124 2.468.352M6.75 6.75A11.956 11.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a11.955 11.955 0 01-1.412 3.33M6.75 6.75L3 3m3.75 3.75L18 18m-3.375-3.375A3 3 0 1012 12m2.625 2.625L18 18" />
  </svg>
);

// ★ 修正: propsから theme と toggleTheme を削除
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [maintenanceContent, setMaintenanceContent] = useState('');
  const [maintenanceUpdatedAt, setMaintenanceUpdatedAt] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const maintenanceLines = maintenanceContent ? maintenanceContent.split('\n') : [];

  useEffect(() => {
    let isMounted = true;
    const loadMaintenance = async () => {
      try {
        const data = await fetchMaintenanceInfo();
        if (isMounted && data) {
          setMaintenanceContent(data.content || '');
          setMaintenanceUpdatedAt(data.updatedAt || null);
        }
      } catch (maintenanceError) {
        console.warn('Failed to load maintenance info:', maintenanceError);
      }
    };

    loadMaintenance();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/app');
      } else {
        setError(result.message || 'ユーザー名またはパスワードが正しくありません。');
      }
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました。');
      console.error('Login failed:', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* ★★★ 修正点: テーマ切り替えボタンの記述を完全に削除 ★★★ */}
      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.logoContainer}>
            <span className={styles.logoText}>
              地蔵1on1
            </span>
            <h1 className={styles.title}>ログイン</h1>
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.label}>ユーザー名</label>
              <input id="username" name="username" type="text" autoComplete="username" required className={styles.input} placeholder="ユーザー名を入力" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>パスワード</label>
              <div className={styles.passwordWrapper}>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={styles.input} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeSlashedIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={styles.options}>
              <div className={styles.rememberMe}>
                <input id="remember-me" name="remember-me" type="checkbox" className={styles.checkbox} />
                <label htmlFor="remember-me" className={styles.label}>ログイン状態を保持する</label>
              </div>
              <Link to="/forgot-password" className={styles.forgotPasswordLink}>パスワードを忘れた場合</Link>
            </div>

            <div>
              <button type="submit" className={styles.loginButton}>ログインする</button>
            </div>
          </form>

        </div>
        {maintenanceContent && (
          <div className={styles.maintenanceCard}>
            <h2 className={styles.maintenanceTitle}>メンテナンス情報</h2>
            <p className={styles.maintenanceBody}>
              {maintenanceLines.map((line, index) => (
                <span key={index}>
                  {line}
                  {index !== maintenanceLines.length - 1 && <br />}
                </span>
              ))}
            </p>
            {maintenanceUpdatedAt && (
              <p className={styles.maintenanceTimestamp}>
                更新日時: {new Date(maintenanceUpdatedAt).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        )}
        <div className={styles.homeLinkContainer}>
          <Link to="/" className={styles.homeLink}>
            <FiHome />
            <span>ホームページに戻る</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
