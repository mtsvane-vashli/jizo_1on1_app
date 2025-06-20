// frontend/src/views/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(username, password);

    if (result.success) {
      navigate('/'); // ログイン成功後はメイン画面へ
    } else {
      alert(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-header">ログイン</h2>
        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label htmlFor="username">ユーザー名</label>
            <input
              type="text"
              id="username"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="auth-input-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <p className="auth-link-text">
          アカウントをお持ちでないですか？ <Link to="/register" className="auth-link">登録はこちら</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;