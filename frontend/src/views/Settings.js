// frontend/src/views/Settings.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import layoutStyles from '../App.module.css';
import styles from './Settings.module.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function Settings() {
  const [employees, setEmployees] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const fetchEmployees = useCallback(async () => {
    if (authLoading || !isAuthenticated) {
      setLoadingEmployees(false);
      setEmployees([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('認証トークンが見つかりません。');
      }
      const response = await fetch(`${BACKEND_URL}/api/employees`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            navigate('/login', { replace: true });
        }
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('部下情報の取得エラー:', error);
      alert(`部下の一覧の取得に失敗しました: ${error.message}`);
    } finally {
      setLoadingEmployees(false);
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) {
      alert('部下名を入力してください。');
      return;
    }
    setAddingEmployee(true);
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('認証トークンが見つかりません。');
      }
      const response = await fetch(`${BACKEND_URL}/api/employees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newEmployeeName.trim(), email: newEmployeeEmail.trim() }),
      });
      if (response.ok) {
        alert('部下を登録しました。');
        setNewEmployeeName('');
        setNewEmployeeEmail('');
        fetchEmployees();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '部下の登録に失敗しました。');
      }
    } catch (error) {
      console.error('部下の登録エラー:', error);
      alert(`部下の登録に失敗しました: ${error.message}`);
    } finally {
      setAddingEmployee(false);
    }
  };

  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>設定</h2>
      <p className={layoutStyles.screenDescription}>アカウント情報や部下の管理を行います。</p>

      <div className={styles.card}>
        <h3 className={styles.sectionHeader}>ユーザー情報</h3>
        <div className={styles.inputGroup}>
          <label htmlFor="username">ユーザー名</label>
          <input type="text" id="username" className={styles.input} value={user ? user.username : ''} readOnly />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="userid">ユーザーID</label>
          <input type="text" id="userid" className={styles.input} value={user ? user.id : ''} readOnly />
        </div>

        <h3 className={styles.sectionHeader}>パスワード変更 (機能未実装)</h3>
        <div className={styles.inputGroup}>
          <label htmlFor="current-password">現在のパスワード</label>
          <input type="password" id="current-password" className={styles.input} disabled />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="new-password">新しいパスワード</label>
          <input type="password" id="new-password" className={styles.input} disabled />
        </div>
        <div className={styles.buttonGroup}>
          <button className={styles.saveButton} type="button" disabled>変更を保存</button>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionHeader}>部下管理</h3>
        <p className={styles.sectionDescription}>会話を行う部下を登録・管理します。</p>
        <form onSubmit={addEmployee}>
          <div className={styles.inputGroup}>
            <label htmlFor="employee-name">部下名 (必須)</label>
            <input type="text" id="employee-name" className={styles.input} value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} placeholder="例: 山田太郎" disabled={addingEmployee} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="employee-email">メールアドレス (任意)</label>
            <input type="email" id="employee-email" className={styles.input} value={newEmployeeEmail} onChange={(e) => setNewEmployeeEmail(e.target.value)} placeholder="例: example@example.com" disabled={addingEmployee} />
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.saveButton} disabled={addingEmployee || !newEmployeeName.trim()}>
              {addingEmployee ? '登録中...' : '部下を登録'}
            </button>
          </div>
        </form>

        <div style={{marginTop: 'var(--space-xl)'}}>
            <h4 className={styles.employeeListHeader}>登録済みの部下</h4>
            {loadingEmployees ? (
            <p className={styles.loadingText}>部下情報を読み込み中...</p>
            ) : employees.length === 0 ? (
            <p className={styles.emptyText}>まだ部下が登録されていません。</p>
            ) : (
            <ul className={styles.employeeList}>
                {employees.map(employee => (
                <li key={employee.id} className={styles.employeeListItem}>
                    <span>{employee.name} {employee.email && `(${employee.email})`}</span>
                </li>
                ))}
            </ul>
            )}
        </div>
      </div>
    </div>
  );
}

export default Settings;