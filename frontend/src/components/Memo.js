// frontend/src/components/Memo.js
import React from 'react';
import styles from './Memo.module.css';

const statusMessages = {
    idle: '',
    saving: '自動保存中...',
    saved: '保存済み',
    error: '自動保存に失敗しました。再試行してください。',
};

const Memo = ({ memo, setMemo, saveState = 'idle', errorMessage = '' }) => {
    const message = saveState === 'error'
        ? (errorMessage || statusMessages.error)
        : statusMessages[saveState] || '';

    const statusClassName = [
        styles.memoStatus,
        saveState === 'saving' ? styles.memoStatusSaving : '',
        saveState === 'saved' ? styles.memoStatusSaved : '',
        saveState === 'error' ? styles.memoStatusError : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={styles.memoContainer}>
            <textarea
                className={styles.memoTextarea}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="ここにメモを入力..."
            />
            <span
                className={statusClassName}
                role="status"
                aria-live="polite"
            >
                {message}
            </span>
        </div>
    );
};

export default Memo;
