import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // ★追加
import { useNavigate } from 'react-router-dom'; // ★追加

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function Settings() {
  const [employees, setEmployees] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [addingEmployee, setAddingEmployee] = useState(false);

  const { isAuthenticated, loading: authLoading } = useAuth(); // ★追加
  const navigate = useNavigate(); // ★追加

  // 部下の一覧を取得する関数
  const fetchEmployees = useCallback(async () => { // useCallback でラップ
    // 認証情報のロードが完了していない、または認証されていない場合は処理しない
    if (authLoading || !isAuthenticated) {
      console.log('Auth loading or not authenticated, skipping employee fetch in Settings.');
      setLoadingEmployees(false); // ローディング状態を解除
      setEmployees([]); // 部下リストを空にする
      return;
    }

    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('jwtToken'); // ★追加
      if (!token) { // トークンがない場合はAPI呼び出しをスキップ
        alert('認証に失敗しました。再度ログインしてください。');
        navigate('/login', { replace: true });
        throw new Error('No authentication token found.');
      }

      const response = await fetch(`${BACKEND_URL}/api/employees`, {
          headers: {
              'Authorization': `Bearer ${token}` // ★追加
          }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        if (response.status === 401 || response.status === 403) {
            alert('認証に失敗しました。再度ログインしてください。');
            navigate('/login', { replace: true });
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert(`部下の一覧の取得に失敗しました: ${error.message || '不明なエラー'}`);
      navigate('/login', { replace: true });
    } finally {
      setLoadingEmployees(false);
    }
  }, [isAuthenticated, authLoading, setLoadingEmployees, setEmployees, navigate]); // 依存配列も更新

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]); // 依存配列に fetchEmployees を追加

  // 新しい部下を登録する関数
  const addEmployee = async (e) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぐ
    if (!newEmployeeName.trim()) {
      alert('部下名を入力してください。');
      return;
    }

    setAddingEmployee(true);
    try {
      const token = localStorage.getItem('jwtToken'); // ★追加
      if (!token) {
          alert('認証に失敗しました。再度ログインしてください。');
          navigate('/login', { replace: true });
          setAddingEmployee(false);
          return;
      }

      const response = await fetch(`${BACKEND_URL}/api/employees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ★追加
        },
        body: JSON.stringify({ name: newEmployeeName.trim(), email: newEmployeeEmail.trim() }),
      });

      if (response.ok) {
        alert('部下を登録しました。');
        setNewEmployeeName('');
        setNewEmployeeEmail('');
        fetchEmployees(); // リストを更新
      } else {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
        } catch (jsonParseError) { /* ignore */ }
        alert(`部下の登録に失敗しました: ${errorMessage}`);
        if (response.status === 401 || response.status === 403) {
            navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(`部下の登録中にエラーが発生しました: ${error.message || '不明なエラー'}`);
    } finally {
      setAddingEmployee(false);
    }
  };

  return (
    <div className="view-container">
      <h2 className="screen-header">設定</h2>
      <p className="screen-description mb-8">アカウント情報を変更します。</p>

      <div className="settings-card">
        {/* ユーザー情報セクション (変更なし) */}
        <div className="settings-input-group">
          <label htmlFor="username">ユーザー名</label>
          <input
            type="text"
            id="username"
            className="settings-input"
            value="テストユーザー"
            readOnly
          />
        </div>
        <div className="settings-input-group">
          <label htmlFor="userid">ユーザーID</label>
          <input
            type="text"
            id="userid"
            className="settings-input"
            value="test-user-01"
            readOnly
          />
        </div>

        {/* パスワード変更セクション (変更なし) */}
        <h3 className="settings-password-section">パスワード変更</h3>
        <div className="settings-input-group">
          <label htmlFor="current-password">現在のパスワード</label>
          <input
            type="password"
            id="current-password"
            className="settings-input"
          />
        </div>
        <div className="settings-input-group">
          <label htmlFor="new-password">新しいパスワード</label>
          <input
            type="password"
            id="new-password"
            className="settings-input"
          />
        </div>
        <div className="settings-input-group">
          <label htmlFor="confirm-password">新しいパスワード (確認)</label>
          <input
            type="password"
            id="confirm-password"
            className="settings-input"
          />
        </div>
        <div className="settings-button-group">
          <button
            className="settings-save-button"
            type="button"
          >
            変更を保存
          </button>
        </div>
      </div>

      {/* 部下管理セクション */}
      <div className="settings-card mt-8">
        <h3 className="settings-password-section">部下管理</h3>
        <p className="screen-description mb-4">会話を行う部下を登録・管理します。</p>

        {/* 新規部下登録フォーム */}
        <form onSubmit={addEmployee} className="mb-6">
          <div className="settings-input-group">
            <label htmlFor="employee-name">部下名 (必須)</label>
            <input
              type="text"
              id="employee-name"
              className="settings-input"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              placeholder="例: 山田太郎"
              disabled={addingEmployee}
            />
          </div>
          <div className="settings-input-group">
            <label htmlFor="employee-email">メールアドレス (任意)</label>
            <input
              type="email"
              id="employee-email"
              className="settings-input"
              value={newEmployeeEmail}
              onChange={(e) => setNewEmployeeEmail(e.target.value)}
              placeholder="例: example@example.com"
              disabled={addingEmployee}
            />
          </div>
          <div className="settings-button-group">
            <button
              type="submit"
              className="settings-save-button"
              disabled={addingEmployee || !newEmployeeName.trim()}
            >
              {addingEmployee ? '登録中...' : '部下を登録'}
            </button>
          </div>
        </form>

        {/* 登録済み部下の一覧 */}
        <h4 className="text-lg font-semibold mb-3 text-gray-800">登録済みの部下</h4>
        {loadingEmployees ? (
          <p className="text-gray-600">部下情報を読み込み中...</p>
        ) : employees.length === 0 ? (
          <p className="text-gray-600">まだ部下が登録されていません。</p>
        ) : (
          <ul className="employee-list">
            {employees.map(employee => (
              <li key={employee.id} className="employee-list-item">
                <span>{employee.name} {employee.email && `(${employee.email})`}</span>
                {/* ここに編集・削除ボタンを追加することも可能 */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Settings;