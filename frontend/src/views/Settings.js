// frontend/src/views/Settings.js (CSSモジュール対応版)

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployees, createEmployee } from '../services/employeeService'; 
import { createUser } from '../services/userService';
import styles from './Settings.module.css'; // ★ CSSモジュールをインポート

function Settings() {
  const { user } = useAuth();

  // (stateと関数の定義は変更なし)
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewPassword] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');
  const [userCreationSuccess, setUserCreationSuccess] = useState('');

  const fetchEmployeesCallback = useCallback(async () => {
    if (!user) return;
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
    // ★ view-containerなどは全体レイアウトなのでグローバルクラス名のまま
    <div className="view-container">
      <h2 className="screen-header">設定</h2>
      <p className="screen-description">アカウント情報、部下、組織のユーザーを管理します。</p>

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

      {/* 部下管理カード */}
      <div className={styles.card}> {/* ★ */}
        <h3 className={styles.sectionHeader}>部下管理</h3> {/* ★ */}
        <form onSubmit={handleAddEmployee}>
          <div className={styles.inputGroup}> {/* ★ */}
            <label htmlFor="employee-name">部下名</label>
            <input type="text" id="employee-name" className={styles.input} value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} disabled={addingEmployee} /> {/* ★ */}
          </div>
          {employeeError && <p style={{color: 'red'}}>{employeeError}</p>}
          <div className={styles.buttonGroup}> {/* ★ */}
            <button type="submit" className={styles.saveButton} disabled={addingEmployee || !newEmployeeName.trim()}> {/* ★ */}
              {addingEmployee ? '登録中...' : 'この部下を登録'}
            </button>
          </div>
        </form>

        <div className={styles.employeeList}> {/* ★ */}
            {loadingEmployees ? <p className={styles.loadingText}>読み込み中...</p> :  /* ★ */
             employees.length === 0 ? <p className={styles.emptyText}>まだ部下が登録されていません。</p> : /* ★ */
             employees.map(emp => <div key={emp.id} className={styles.employeeListItem}><span>{emp.name}</span></div>) /* ★ */
            }
        </div>
      </div>
    </div>
  );
}

export default Settings;