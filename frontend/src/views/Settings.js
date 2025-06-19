// frontend/src/views/Settings.js (修正後)
import React, { useState, useEffect } from 'react';

function Settings() {
  const [employees, setEmployees] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [addingEmployee, setAddingEmployee] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 部下の一覧を取得する関数
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch('http://localhost:5000/api/employees');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('部下の一覧の取得に失敗しました。');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // 新しい部下を登録する関数
  const addEmployee = async (e) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぐ
    if (!newEmployeeName.trim()) {
      alert('部下名を入力してください。');
      return;
    }

    setAddingEmployee(true);
    try {
      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEmployeeName.trim(), email: newEmployeeEmail.trim() }),
      });

      if (response.ok) {
        alert('部下を登録しました。');
        setNewEmployeeName('');
        setNewEmployeeEmail('');
        fetchEmployees(); // リストを更新
      } else {
        const errorData = await response.json();
        alert(`部下の登録に失敗しました: ${errorData.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('部下の登録中にエラーが発生しました。');
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

      {/* ★追加: 部下管理セクション */}
      <div className="settings-card mt-8"> {/* mt-8 で上のカードとの間に余白 */}
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
          <ul className="employee-list"> {/* 新しいクラス名 */}
            {employees.map(employee => (
              <li key={employee.id} className="employee-list-item"> {/* 新しいクラス名 */}
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