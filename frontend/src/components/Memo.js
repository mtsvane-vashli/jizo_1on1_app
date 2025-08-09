// frontend/src/components/Memo.js
import React from 'react';
import styles from './Memo.module.css';

const Memo = ({ memo, setMemo }) => {
    return (
        <div className={styles.memoContainer}>
            <textarea
                className={styles.memoTextarea}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="ここにメモを入力..."
            />
        </div>
    );
};

export default Memo;
