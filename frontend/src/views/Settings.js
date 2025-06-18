// frontend/src/views/Settings.js (修正後 - Tailwindなし)
import React from 'react';

function Settings() {
  return (
    <div className="view-container"> {/* クラス名変更 */}
      <h2 className="screen-header">設定</h2> {/* クラス名変更 */}
      <p className="screen-description mb-8">アカウント情報を変更します。</p> {/* クラス名変更 */}

      <div className="settings-card"> {/* クラス名変更 */}
        <div className="settings-input-group"> {/* クラス名変更 */}
          <label htmlFor="username">ユーザー名</label> {/* クラス名変更 */}
          <input
            type="text"
            id="username"
            className="settings-input" // クラス名変更
            value="テストユーザー"
            readOnly
          />
        </div>
        <div className="settings-input-group"> {/* クラス名変更 */}
          <label htmlFor="userid">ユーザーID</label> {/* クラス名変更 */}
          <input
            type="text"
            id="userid"
            className="settings-input" // クラス名変更
            value="test-user-01"
            readOnly
          />
        </div>

        <h3 className="settings-password-section">パスワード変更</h3> {/* クラス名変更 */}
        <div className="settings-input-group"> {/* クラス名変更 */}
          <label htmlFor="current-password">現在のパスワード</label> {/* クラス名変更 */}
          <input
            type="password"
            id="current-password"
            className="settings-input" // クラス名変更
          />
        </div>
        <div className="settings-input-group"> {/* クラス名変更 */}
          <label htmlFor="new-password">新しいパスワード</label> {/* クラス名変更 */}
          <input
            type="password"
            id="new-password"
            className="settings-input" // クラス名変更
          />
        </div>
        <div className="settings-input-group"> {/* クラス名変更 */}
          <label htmlFor="confirm-password">新しいパスワード (確認)</label> {/* クラス名変更 */}
          <input
            type="password"
            id="confirm-password"
            className="settings-input" // クラス名変更
          />
        </div>
        <div className="settings-button-group"> {/* クラス名変更 */}
          <button
            className="settings-save-button" // クラス名変更
            type="button"
          >
            変更を保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;