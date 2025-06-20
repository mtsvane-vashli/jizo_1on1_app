// frontend/src/views/Register.js (修正後)

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services'; // services の窓口からインポート

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // エラーメッセージ用
  const [success, setSuccess] = useState(''); // 成功メッセージ用

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
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-header">新規登録</h2>
        <form onSubmit={handleSubmit}>
          {/* ... (input部分は変更なし) ... */}
          <div className="auth-input-group">
            <label htmlFor="username">ユーザー名</label>
            <input type="text" id="username" className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required />
          </div>
          <div className="auth-input-group">
            <label htmlFor="password">パスワード</label>
            <input type="password" id="password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
          </div>

          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}

          <button type="submit" className="auth-button" disabled={loading || success}>
            {loading ? '登録中...' : '登録'}
          </button>
        </form>
        <p className="auth-link-text">
          既にアカウントをお持ちですか？ <Link to="/login" className="auth-link">ログインはこちら</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;