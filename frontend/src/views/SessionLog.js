// frontend/src/views/SessionLog.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, deleteConversationById } from '../services/conversationService';
import layoutStyles from '../App.module.css';
import styles from './SessionLog.module.css';

function SessionLog() {
    const [pastConversations, setPastConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading } = useAuth();

    const fetchPastConversations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getConversations();
            if (Array.isArray(data)) {
                setPastConversations(data);
            } else {
                throw new Error('サーバーからのデータ形式が不正です。');
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
            setError(`履歴の取得に失敗しました: ${err.message}`);
            setPastConversations([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchPastConversations();
        }
    }, [isAuthenticated, authLoading, fetchPastConversations]);


    const loadConversation = (conversationId) => {
        navigate(`/?conversationId=${conversationId}`);
    };

    const deleteConversation = async (conversationId) => {
        if (!window.confirm('この会話履歴を完全に削除してもよろしいですか？')) {
            return;
        }
        try {
            await deleteConversationById(conversationId);
            await fetchPastConversations();
        } catch (err) {
            console.error('Error deleting conversation:', err);
            alert(`履歴の削除中にエラーが発生しました: ${err.message}`);
        }
    };

    if (authLoading || (isLoading && pastConversations.length === 0)) {
        return (
            <div className={layoutStyles.viewContainer}>
                 <h2 className={layoutStyles.screenHeader}>過去のセッションログ</h2>
                 <p className={layoutStyles.screenDescription}>会話履歴を読み込み中...</p>
            </div>
        );
    }

    return (
        <div className={layoutStyles.viewContainer}>
            <h2 className={layoutStyles.screenHeader}>過去のセッションログ</h2>
            <p className={layoutStyles.screenDescription}>リストからセッションを選択して会話を再開・確認できます。</p>

            <div className={styles.container}>
                {error && <p className={styles.error}>{error}</p>}
                {!isLoading && pastConversations.length === 0 && !error && (
                    <p className={styles.emptyMessage}>過去の会話はありません。</p>
                )}
                <ul className={styles.list}>
                    {pastConversations.map(conv => (
                        <li key={conv.id} className={styles.item}>
                            <button
                                onClick={() => loadConversation(conv.id)}
                                className={styles.button}
                            >
                                <span className={styles.dateTheme}>
                                    {conv.employee_name && <strong>{conv.employee_name}さんとの会話 - </strong>}
                                    {new Date(conv.timestamp).toLocaleString()} - テーマ: {conv.theme || '未設定'}
                                </span>
                                {conv.summary && (
                                    <span className={`${styles.preview} ${styles.lineClamp2}`}>
                                        要約: {conv.summary}
                                    </span>
                                )}
                                {conv.next_actions && (
                                    <span className={`${styles.preview} ${styles.lineClamp2}`}>
                                        ネクストアクション: {conv.next_actions}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(conv.id);
                                }}
                                className={styles.deleteButton}
                            >
                                削除
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SessionLog;