// frontend/src/components/Tabs.js
import React from 'react';
import styles from './Tabs.module.css';

const Tabs = ({ activeTab, onTabClick }) => {
    return (
        <div className={styles.tabsContainer}>
            <button
                className={`${styles.tabButton} ${activeTab === 'memo' ? styles.active : ''}`}
                onClick={() => onTabClick('memo')}
            >
                メモ
            </button>
            <button
                className={`${styles.tabButton} ${activeTab === 'mindmap' ? styles.active : ''}`}
                onClick={() => onTabClick('mindmap')}
            >
                マインドマップ
            </button>
        </div>
    );
};

export default Tabs;
