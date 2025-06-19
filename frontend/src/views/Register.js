// frontend/src/views/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        navigate('/login'); // 登録成功後はログイン画面へ
      } else {
        alert(data.error || '登録に失敗しました。');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-header">新規登録</h2>
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