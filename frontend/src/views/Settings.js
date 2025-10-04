// frontend/src/views/Settings.js (CSSモジュール対応版)

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { createUser, getOrganizationUsers, updateOrganizationUser } from '../services/userService';
import { getEmployees, createEmployee, deleteEmployee, fetchMaintenanceInfo, updateMaintenanceInfo } from '../services';
import styles from './Settings.module.css'; // ★ CSSモジュールをインポート
import layoutStyles from '../App.module.css';

function Settings() {
  const { user } = useAuth();

  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewPassword] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');
  const [userCreationSuccess, setUserCreationSuccess] = useState('');
  const [orgUsers, setOrgUsers] = useState([]);
  const [isOrgUsersLoading, setIsOrgUsersLoading] = useState(true);
  const [orgUserError, setOrgUserError] = useState('');
  const [orgUserSuccess, setOrgUserSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ username: '', email: '', role: 'user', mustChangePassword: false });
  const [updatingUser, setUpdatingUser] = useState(false);

  // 部下管理用の状態
  const [employees, setEmployees] = useState([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');

  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceUpdatedAt, setMaintenanceUpdatedAt] = useState(null);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceSuccess, setMaintenanceSuccess] = useState('');
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  const maintenanceDisplayLines = maintenanceMessage ? maintenanceMessage.split('\n') : [];

  const fetchOrgUsers = useCallback(async () => {
      if (!user || user.role !== 'admin') {
          setOrgUsers([]);
          setIsOrgUsersLoading(false);
          return;
      }

      setIsOrgUsersLoading(true);
      setOrgUserError('');
      try {
          const data = await getOrganizationUsers();
          setOrgUsers(data);
      } catch (err) {
          setOrgUserError(`ユーザー一覧の取得に失敗しました: ${err.message}`);
      } finally {
          setIsOrgUsersLoading(false);
      }
  }, [user]);

  useEffect(() => {
      if (user?.role === 'admin') {
          fetchOrgUsers();
      }
  }, [fetchOrgUsers, user]);

  const handleCreateUser = async (e) => {
      e.preventDefault();
      setAddingUser(true);
      setUserCreationError('');
      setUserCreationSuccess('');
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(newUserEmail)) {
          setUserCreationError('有効なメールアドレスを入力してください。');
          setAddingUser(false);
          return;
      }
      try {
          await createUser({ username: newUsername, email: newUserEmail, password: newUserPassword });
          setUserCreationSuccess(`ユーザー「${newUsername}」が正常に作成されました。`);
          setNewUsername('');
          setNewUserEmail('');
          setNewPassword('');
          await fetchOrgUsers();
      } catch (err) {
          setUserCreationError(`ユーザー作成に失敗しました: ${err.message}`);
      } finally {
          setAddingUser(false);
      }
  };

  const handleStartEditUser = useCallback((targetUser) => {
      setOrgUserSuccess('');
      setOrgUserError('');
      setEditingUserId(targetUser.id);
      setEditUserForm({
          username: targetUser.username || '',
          email: targetUser.email || '',
          role: targetUser.role || 'user',
          mustChangePassword: !!targetUser.mustChangePassword,
      });
  }, []);

  const handleEditUserFieldChange = useCallback((field, value) => {
      setEditUserForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCancelEditUser = useCallback(() => {
      setEditingUserId(null);
      setEditUserForm({ username: '', email: '', role: 'user', mustChangePassword: false });
  }, []);

  const handleSubmitEditUser = useCallback(async (e) => {
      e.preventDefault();
      if (!editingUserId) return;

      const trimmedUsername = editUserForm.username.trim();
      const trimmedEmail = editUserForm.email.trim();

      if (!trimmedUsername) {
          setOrgUserError('ユーザー名は必須です。');
          return;
      }

      if (trimmedEmail) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(trimmedEmail)) {
              setOrgUserError('有効なメールアドレスを入力してください。');
              return;
          }
      }

      setUpdatingUser(true);
      setOrgUserError('');
      setOrgUserSuccess('');

      const payload = {
          username: trimmedUsername,
          email: trimmedEmail ? trimmedEmail : null,
          role: editUserForm.role,
          mustChangePassword: !!editUserForm.mustChangePassword,
      };

      try {
          const updated = await updateOrganizationUser(editingUserId, payload);
          setOrgUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          setOrgUserSuccess(`ユーザー「${updated.username}」の情報を更新しました。`);
          handleCancelEditUser();
      } catch (err) {
          setOrgUserError(`ユーザー情報の更新に失敗しました: ${err.message}`);
      } finally {
          setUpdatingUser(false);
      }
  }, [editingUserId, editUserForm, handleCancelEditUser]);

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

  const loadMaintenanceInfo = useCallback(async () => {
    setIsMaintenanceLoading(true);
    setMaintenanceError('');
    setMaintenanceSuccess('');
    try {
      const data = await fetchMaintenanceInfo();
      setMaintenanceMessage(data?.content || '');
      setMaintenanceUpdatedAt(data?.updatedAt || null);
    } catch (err) {
      setMaintenanceError(`メンテナンス情報の取得に失敗しました: ${err.message}`);
    } finally {
      setIsMaintenanceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaintenanceInfo();
  }, [loadMaintenanceInfo]);

  const handleSaveMaintenance = useCallback(async () => {
    setIsSavingMaintenance(true);
    setMaintenanceError('');
    setMaintenanceSuccess('');
    try {
      const result = await updateMaintenanceInfo(maintenanceMessage);
      setMaintenanceMessage(result?.content || '');
      setMaintenanceUpdatedAt(result?.updatedAt || null);
      setMaintenanceSuccess('メンテナンス情報を更新しました。');
    } catch (err) {
      setMaintenanceError(`メンテナンス情報の更新に失敗しました: ${err.message}`);
    } finally {
      setIsSavingMaintenance(false);
    }
  }, [maintenanceMessage]);

  return (
    // ★ view-containerなどは全体レイアウトなのでグローバルクラス名のまま
    <div className={layoutStyles.viewContainer || ''}>
      <h2 className={layoutStyles.screenHeader || ''}>設定</h2>
      <p className={layoutStyles.screenDescription || ''}>アカウント情報、組織のユーザーを管理します。</p>

      <div className={styles.card}>
        <h3 className={styles.sectionHeader}>メンテナンス情報</h3>
        <p className={styles.sectionDescription}>ログイン画面に表示されるお知らせを設定します。未入力の場合は表示されません。</p>
        {maintenanceError && <p className={styles.errorText}>{maintenanceError}</p>}
        {maintenanceSuccess && <p className={styles.successText}>{maintenanceSuccess}</p>}
        {isMaintenanceLoading ? (
          <p className={styles.loadingText}>情報を読み込み中...</p>
        ) : (
          <>
            {user && user.role === 'admin' ? (
              <>
                <div className={styles.inputGroup}>
                  <label htmlFor="maintenance-message">お知らせ内容</label>
                  <textarea
                    id="maintenance-message"
                    className={`${styles.input} ${styles.textarea}`}
                    value={maintenanceMessage}
                    onChange={(e) => {
                      setMaintenanceMessage(e.target.value);
                      setMaintenanceSuccess('');
                      setMaintenanceError('');
                    }}
                    placeholder="例: 〇月〇日 21:00〜22:00 の間、システムメンテナンスを実施します。"
                    rows={5}
                    disabled={isSavingMaintenance}
                  />
                </div>
                {maintenanceUpdatedAt && (
                  <p className={styles.captionText}>
                    最終更新: {new Date(maintenanceUpdatedAt).toLocaleString('ja-JP')}
                  </p>
                )}
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={handleSaveMaintenance}
                    disabled={isSavingMaintenance}
                  >
                    {isSavingMaintenance ? '保存中...' : '保存'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.noticeBox} role="note">
                  {maintenanceMessage ? (
                    maintenanceDisplayLines.map((line, index) => (
                      <span key={index}>
                        {line}
                        {index !== maintenanceDisplayLines.length - 1 && <br />}
                      </span>
                    ))
                  ) : (
                    <span>現在表示するメンテナンス情報はありません。</span>
                  )}
                </div>
                {maintenanceUpdatedAt && (
                  <p className={styles.captionText}>
                    最終更新: {new Date(maintenanceUpdatedAt).toLocaleString('ja-JP')}
                  </p>
                )}
                <p className={styles.helperText}>メンテナンス情報の編集は管理者のみが行えます。</p>
              </>
            )}
          </>
        )}
      </div>

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
                <label htmlFor="new-user-email">メールアドレス</label>
                <input
                  type="email"
                  id="new-user-email"
                  className={styles.input}
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  disabled={addingUser}
                />
              </div>
              <div className={styles.inputGroup}> {/* ★ */}
                <label htmlFor="new-user-password">新規パスワード</label>
                <input type="password" id="new-user-password" className={styles.input} value={newUserPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={addingUser} /> {/* ★ */}
              </div>
              {userCreationError && <p style={{color: 'red'}}>{userCreationError}</p>}
              {userCreationSuccess && <p style={{color: 'green'}}>{userCreationSuccess}</p>}
              <div className={styles.buttonGroup}> {/* ★ */}
                <button type="submit" className={styles.saveButton} disabled={addingUser || !newUsername || !newUserEmail || !newUserPassword}> {/* ★ */}
                  {addingUser ? '作成中...' : 'このユーザーを作成'}
                </button>
              </div>
            </form>

            <div className={styles.userListSection}>
              <h4 className={styles.employeeListHeader}>登録済みユーザー</h4>
              {orgUserError && <p className={styles.errorText}>{orgUserError}</p>}
              {orgUserSuccess && <p className={styles.successText}>{orgUserSuccess}</p>}
              {isOrgUsersLoading ? (
                <p className={styles.loadingText}>ユーザー情報を読み込み中...</p>
              ) : orgUsers.length === 0 ? (
                <p className={styles.emptyText}>登録済みのユーザーがいません。</p>
              ) : (
                <ul className={styles.userList}>
                  {orgUsers.map((orgUser) => (
                    <li key={orgUser.id} className={styles.userListItem}>
                      {editingUserId === orgUser.id ? (
                        <form onSubmit={handleSubmitEditUser} className={styles.userEditForm}>
                          <div className={styles.inputGroup}>
                            <label>ユーザー名</label>
                            <input
                              type="text"
                              className={styles.input}
                              value={editUserForm.username}
                              onChange={(e) => handleEditUserFieldChange('username', e.target.value)}
                              disabled={updatingUser}
                              required
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>メールアドレス</label>
                            <input
                              type="email"
                              className={styles.input}
                              value={editUserForm.email}
                              onChange={(e) => handleEditUserFieldChange('email', e.target.value)}
                              disabled={updatingUser}
                              placeholder="example@company.jp"
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>役割</label>
                            <select
                              className={styles.input}
                              value={editUserForm.role}
                              onChange={(e) => handleEditUserFieldChange('role', e.target.value)}
                              disabled={updatingUser}
                            >
                              <option value="admin">管理者</option>
                              <option value="user">一般ユーザー</option>
                            </select>
                          </div>
                          <div className={styles.checkboxRow}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={editUserForm.mustChangePassword}
                                onChange={(e) => handleEditUserFieldChange('mustChangePassword', e.target.checked)}
                                disabled={updatingUser}
                              />
                              次回ログイン時にパスワード変更を要求する
                            </label>
                          </div>
                          <div className={styles.userEditActions}>
                            <button type="button" className={styles.secondaryButton} onClick={handleCancelEditUser} disabled={updatingUser}>
                              キャンセル
                            </button>
                            <button type="submit" className={styles.saveButton} disabled={updatingUser}>
                              {updatingUser ? '更新中...' : '保存'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.userRow}>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>{orgUser.username}</span>
                            <span className={styles.userEmail}>{orgUser.email || 'メール未設定'}</span>
                            <span className={styles.userRoleTag}>{orgUser.role === 'admin' ? '管理者' : '一般ユーザー'}</span>
                            {orgUser.mustChangePassword && <span className={styles.userFlag}>要パスワード変更</span>}
                          </div>
                          <button type="button" className={styles.secondaryButton} onClick={() => handleStartEditUser(orgUser)}>
                            編集
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
