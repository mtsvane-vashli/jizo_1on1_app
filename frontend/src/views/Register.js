// frontend/src/views/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services';
import styles from './Auth.module.css'; // ★共通のAuthスタイルをインポート

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await registerUser(username, password);
      setSuccess(data.message + ' 3秒後にログイン画面に移動します。');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || '登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.header}>新規登録</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>ユーザー名</label>
            <input type="text" id="username" className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>パスワード</label>
            <input type="password" id="password" className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}
          {success && <p className={styles.successMessage}>{success}</p>}

          <button type="submit" className={styles.button} disabled={loading || !!success}>
            {loading ? '登録中...' : '登録'}
          </button>
        </form>
        <p className={styles.linkText}>
          既にアカウントをお持ちですか？ <Link to="/login" className={styles.link}>ログインはこちら</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;