// frontend/src/views/Settings.js (最終修正版)

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployees, createEmployee } from '../services/employeeService'; 
import { createUser } from '../services/userService';

function Settings() {
  const { user } = useAuth(); // ログイン中のユーザー情報を取得

  // 部下管理用のstate
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState('');

  // ★ ユーザー管理用のstate (管理者用)
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewPassword] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');
  const [userCreationSuccess, setUserCreationSuccess] = useState('');

  const fetchEmployeesCallback = useCallback(async () => {
    if (!user) return; // ユーザーがいない場合は何もしない
    setLoadingEmployees(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      setEmployeeError(`部下の一覧の取得に失敗しました: ${err.message}`);
    } finally {
      setLoadingEmployees(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEmployeesCallback();
  }, [fetchEmployeesCallback]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddingEmployee(true);
    setEmployeeError('');
    try {
      await createEmployee({ name: newEmployeeName.trim() });
      alert('部下を登録しました。');
      setNewEmployeeName('');
      fetchEmployeesCallback();
    } catch (err) {
      setEmployeeError(`部下の登録に失敗しました: ${err.message}`);
    } finally {
      setAddingEmployee(false);
    }
  };
  
  const handleCreateUser = async (e) => {
      e.preventDefault();
      setAddingUser(true);
      setUserCreationError('');
      setUserCreationSuccess('');
      try {
          await createUser({ username: newUsername, password: newUserPassword });
          setUserCreationSuccess(`ユーザー「${newUsername}」が正常に作成されました。`);
          setNewUsername('');
          setNewPassword('');
      } catch (err) {
          setUserCreationError(`ユーザー作成に失敗しました: ${err.message}`);
      } finally {
          setAddingUser(false);
      }
  };

  return (
    <div className="view-container">
      <h2 className="screen-header">設定</h2>
      <p className="screen-description">アカウント情報、部下、組織のユーザーを管理します。</p>

      {/* ユーザー情報カード */}
      <div className="settings-card" style={{marginBottom: '1rem'}}>
        <h3>あなたの情報</h3>
        <div className="settings-input-group">
          <label>ユーザー名</label>
          <input type="text" className="settings-input" value={user?.username || ''} readOnly />
        </div>
        <div className="settings-input-group">
          <label>役割</label>
          <input type="text" className="settings-input" value={user?.role || ''} readOnly />
        </div>
      </div>
      
      {/* ★ 管理者のみに表示されるユーザー管理カード */}
      {user && user.role === 'admin' && (
        <div className="settings-card" style={{marginBottom: '1rem'}}>
            <h3>ユーザー管理 (管理者用)</h3>
            <p className="screen-description">あなたの組織に新しいユーザーを追加します。</p>
            <form onSubmit={handleCreateUser}>
              <div className="settings-input-group">
                <label htmlFor="new-username">新規ユーザー名</label>
                <input type="text" id="new-username" className="settings-input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={addingUser} />
              </div>
              <div className="settings-input-group">
                <label htmlFor="new-user-password">新規パスワード</label>
                <input type="password" id="new-user-password" className="settings-input" value={newUserPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={addingUser} />
              </div>
              {userCreationError && <p style={{color: 'red'}}>{userCreationError}</p>}
              {userCreationSuccess && <p style={{color: 'green'}}>{userCreationSuccess}</p>}
              <div className="settings-button-group">
                <button type="submit" className="settings-save-button" disabled={addingUser || !newUsername || !newUserPassword}>
                  {addingUser ? '作成中...' : 'このユーザーを作成'}
                </button>
              </div>
            </form>
        </div>
      )}

      {/* 部下管理カード */}
      <div className="settings-card">
        <h3>部下管理</h3>
        <form onSubmit={handleAddEmployee}>
          <div className="settings-input-group">
            <label htmlFor="employee-name">部下名</label>
            <input type="text" id="employee-name" className="settings-input" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} disabled={addingEmployee} />
          </div>
          {employeeError && <p style={{color: 'red'}}>{employeeError}</p>}
          <div className="settings-button-group">
            <button type="submit" className="settings-save-button" disabled={addingEmployee || !newEmployeeName.trim()}>
              {addingEmployee ? '登録中...' : 'この部下を登録'}
            </button>
          </div>
        </form>

        <div className="employee-list">
            {loadingEmployees ? <p>読み込み中...</p> : 
             employees.map(emp => <div key={emp.id} className="employee-list-item"><span>{emp.name}</span></div>)
            }
        </div>
      </div>
    </div>
  );
}

export default Settings;