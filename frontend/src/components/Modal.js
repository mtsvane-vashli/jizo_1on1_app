import React from 'react';
import styles from './Modal.module.css';
import { FiX } from 'react-icons/fi';

// props
// - isOpen: モーダルが開いているか (boolean)
// - onClose: モーダルを閉じる関数
// - onConfirm: 確認ボタンを押したときの関数
// - title: モーダルのタイトル (string)
// - children: モーダルの本文 (React node)
function Modal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  // 確認ボタンが押されたときの処理
  const handleConfirm = () => {
    onConfirm();
    onClose(); // 確認後、モーダルを閉じる
  };

  return (
    // 背景のオーバーレイ
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* モーダル本体 (クリックしても閉じないように伝播を停止) */}
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <FiX />
          </button>
        </div>

        {/* 本文 */}
        <div className={styles.modalBody}>
          {children}
        </div>

        {/* フッター (ボタンエリア) */}
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>
            キャンセル
          </button>
          <button onClick={handleConfirm} className={styles.confirmButton}>
            確認
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;