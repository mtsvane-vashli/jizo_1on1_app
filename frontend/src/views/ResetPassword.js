import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './Auth.module.css';
import { resetPasswordWithToken } from '../services/userService';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('リセットトークンが無効です。メールのリンクを再度確認してください。');
      return;
    }

    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上で入力してください。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません。');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordWithToken({ token, newPassword });
      setSuccess(result.message || 'パスワードを更新しました。ログイン画面へお進みください。');
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'パスワードの更新に失敗しました。トークンの有効期限を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>パスワードを再設定</h1>
          <p className={styles.subheader}>メールに記載されたリンクからアクセスしたうえで、新しいパスワードを設定してください。</p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="token" className={styles.label}>リセットトークン</label>
              <input
                id="token"
                type="text"
                className={styles.input}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="メールに記載のトークン"
                disabled={loading}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="newPassword" className={styles.label}>新しいパスワード（8文字以上）</label>
              <input
                id="newPassword"
                type="password"
                className={styles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>新しいパスワード（確認）</label>
              <input
                id="confirmPassword"
                type="password"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {success && <p className={styles.successMessage}>{success}</p>}
            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? '更新中...' : 'パスワードを更新する'}
            </button>
          </form>
          <p className={styles.footerLink}>
            <Link to="/login">ログイン画面に戻る</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
