// frontend/src/views/Settings.js (CSSモジュール対応版)

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createUser } from '../services/userService';
import styles from './Settings.module.css'; // ★ CSSモジュールをインポート

function Settings() {
  const { user } = useAuth();

  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewPassword] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');
  const [userCreationSuccess, setUserCreationSuccess] = useState('');

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
      <p className="screen-description">アカウント情報、組織のユーザーを管理します。</p>

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
    </div>
  );
}

export default Settings;