// frontend/src/views/Settings.js (CSSモジュール対応版)

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { createUser } from '../services/userService';
import { getEmployees, createEmployee, deleteEmployee } from '../services';
import styles from './Settings.module.css'; // ★ CSSモジュールをインポート
import layoutStyles from '../App.module.css';

function Settings() {
  const { user } = useAuth();

  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewPassword] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');
  const [userCreationSuccess, setUserCreationSuccess] = useState('');

  // 部下管理用の状態
  const [employees, setEmployees] = useState([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');

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

  // 部下一覧取得
  const fetchEmployees = useCallback(async () => {
    setIsEmployeesLoading(true);
    setEmployeeError('');
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      setEmployeeError(`部下データの取得に失敗しました: ${err.message}`);
    } finally {
      setIsEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 部下追加
  const handleAddEmployee = useCallback(async () => {
    if (!newEmployeeName.trim()) {
      setEmployeeError('部下の名前は必須です。');
      return;
    }
    try {
      await createEmployee({ name: newEmployeeName, email: newEmployeeEmail });
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      await fetchEmployees();
    } catch (err) {
      setEmployeeError(`部下の追加に失敗しました: ${err.message}`);
    }
  }, [newEmployeeName, newEmployeeEmail, fetchEmployees]);

  // 部下削除
  const handleDeleteEmployee = useCallback(async (id, name) => {
    if (!window.confirm(`${name} を削除してもよろしいですか？`)) return;
    try {
      await deleteEmployee(id);
      await fetchEmployees();
    } catch (err) {
      setEmployeeError(`部下の削除に失敗しました: ${err.message}`);
    }
  }, [fetchEmployees]);

  return (
    // ★ view-containerなどは全体レイアウトなのでグローバルクラス名のまま
    <div className={layoutStyles.viewContainer || ''}>
      <h2 className={layoutStyles.screenHeader || ''}>設定</h2>
      <p className={layoutStyles.screenDescription || ''}>アカウント情報、組織のユーザーを管理します。</p>

      {/* ユーザー情報カード */}
      <div className={styles.card}> {/* ★ classNameをstylesオブジェクトから指定 */}
        <h3 className={styles.sectionHeader}>あなたの情報</h3> {/* ★ */}
        <div className={styles.inputGroup}> {/* ★ */}
          <label>ユーザー名</label>
          <input type="text" className={styles.input} value={user?.username || ''} readOnly /> {/* ★ */}
        </div>
        <div className={styles.inputGroup}> {/* ★ */}
          <label>役割</label>
          <input type="text" className={styles.input} value={user?.role || ''} readOnly /> {/* ★ */}
        </div>
      </div>
      
      {/* 管理者のみに表示されるユーザー管理カード */}
      {user && user.role === 'admin' && (
        <div className={styles.card}> {/* ★ */}
            <h3 className={styles.sectionHeader}>ユーザー管理 (管理者用)</h3> {/* ★ */}
            <p className={styles.sectionDescription}>あなたの組織に新しいユーザーを追加します。</p> {/* ★ */}
            <form onSubmit={handleCreateUser}>
              <div className={styles.inputGroup}> {/* ★ */}
                <label htmlFor="new-username">新規ユーザー名</label>
                <input type="text" id="new-username" className={styles.input} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={addingUser} /> {/* ★ */}
              </div>
              <div className={styles.inputGroup}> {/* ★ */}
                <label htmlFor="new-user-password">新規パスワード</label>
                <input type="password" id="new-user-password" className={styles.input} value={newUserPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={addingUser} /> {/* ★ */}
              </div>
              {userCreationError && <p style={{color: 'red'}}>{userCreationError}</p>}
              {userCreationSuccess && <p style={{color: 'green'}}>{userCreationSuccess}</p>}
              <div className={styles.buttonGroup}> {/* ★ */}
                <button type="submit" className={styles.saveButton} disabled={addingUser || !newUsername || !newUserPassword}> {/* ★ */}
                  {addingUser ? '作成中...' : 'このユーザーを作成'}
                </button>
              </div>
            </form>
        </div>
      )}

      {/* 部下管理 */}
      <div className={styles.card}>
        <h3 className={styles.sectionHeader}>部下管理</h3>
        <p className={styles.sectionDescription}>登録済みの部下を管理します。</p>

        {employeeError && <p className={styles.errorText}>{employeeError}</p>}

        {isEmployeesLoading ? (
          <p className={styles.loadingText}>部下データを読み込み中...</p>
        ) : employees.length > 0 ? (
          <ul className={styles.employeeList}>
            {employees.map((employee) => (
              <li key={employee.id} className={styles.employeeListItem}>
                <span>{employee.name} {employee.email && `(${employee.email})`}</span>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>登録済みの部下がいません。</p>
        )}

        <div className={styles.inputGroup} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
          <h4 className={styles.employeeListHeader}>新しい部下を追加</h4>
          <div className={styles.inputGroup}>
            <label>名前</label>
            <input
              type="text"
              className={styles.input}
              placeholder="名前"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>メールアドレス (任意)</label>
            <input
              type="email"
              className={styles.input}
              placeholder="メールアドレス (任意)"
              value={newEmployeeEmail}
              onChange={(e) => setNewEmployeeEmail(e.target.value)}
            />
          </div>
          <div className={styles.buttonGroup}>
            <button type="button" className={styles.saveButton} onClick={handleAddEmployee}>
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
