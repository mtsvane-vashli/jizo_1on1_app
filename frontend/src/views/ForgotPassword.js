import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';
import { requestPasswordReset } from '../services/userService';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewToken, setPreviewToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPreviewToken('');

    if (!email.trim()) {
      setError('メールアドレスを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset({ email });
      setSuccess(result.message || 'パスワードリセット用のメールを送信しました。');
      if (result.previewToken) {
        setPreviewToken(result.previewToken);
      }
      setEmail('');
    } catch (err) {
      setError(err.message || 'リクエストに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>パスワードを忘れた場合</h1>
          <p className={styles.subheader}>登録済みのメールアドレスを入力すると、パスワード再設定リンクを送信します。</p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>メールアドレス</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {success && <p className={styles.successMessage}>{success}</p>}
            {previewToken && (
              <p className={styles.successMessage}>
                開発環境向けトークン: <code>{previewToken}</code>
              </p>
            )}
            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? '送信中...' : 'リセットリンクを送信'}
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

export default ForgotPassword;
