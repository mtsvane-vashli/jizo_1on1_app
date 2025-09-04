import React, { useState } from 'react';
import styles from './Auth.module.css';
import { changePassword } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { applyNewToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmNewPassword) {
      setError('新しいパスワードが一致しません。');
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      // トークン更新（mustChangePassword=false を反映）
      if (res?.token) {
        applyNewToken(res.token);
      }
      setSuccess('パスワードを更新しました。');
      // 少し待ってアプリに遷移
      setTimeout(() => navigate('/app'), 800);
    } catch (err) {
      setError(err.message || 'パスワード変更に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.header}>パスワード変更</h2>
        <p className={styles.subheader}>セキュリティのため、初回ログイン後に本パスワードを設定してください。</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="currentPassword" className={styles.label}>現在のパスワード</label>
            <input id="currentPassword" type="password" className={styles.input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={loading} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="newPassword" className={styles.label}>新しいパスワード（8文字以上）</label>
            <input id="newPassword" type="password" className={styles.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={loading} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="confirmNewPassword" className={styles.label}>新しいパスワード（確認）</label>
            <input id="confirmNewPassword" type="password" className={styles.input} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required disabled={loading} />
          </div>
          {error && <p className={styles.errorMessage}>{error}</p>}
          {success && <p className={styles.successMessage}>{success}</p>}
          <button type="submit" className={styles.button} disabled={loading}>{loading ? '更新中...' : '更新する'}</button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;

