// frontend/src/views/SessionLog.js (修正後)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// ★ サービスをインポート
import { getConversations, deleteConversationById } from '../services/conversationService';

function SessionLog() {
    const [pastConversations, setPastConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading } = useAuth();

    // ★ useCallbackを使って関数をメモ化
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
    }, []); // 依存配列は空

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
            // 成功したらリストを再読み込み
            await fetchPastConversations();
        } catch (err) {
            console.error('Error deleting conversation:', err);
            alert(`履歴の削除中にエラーが発生しました: ${err.message}`);
        }
    };

    if (authLoading || (isLoading && pastConversations.length === 0)) {
        return (
            <div className="view-container">
                 <h2 className="screen-header">過去のセッションログ</h2>
                 <p className="screen-description">会話履歴を読み込み中...</p>
            </div>
        );
    }
    
    return (
        <div className="view-container">
            <h2 className="screen-header">過去のセッションログ</h2>
            <p className="screen-description">左のリストからセッションを選択してください。</p>

            <div className="session-list-container">
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {!isLoading && pastConversations.length === 0 && !error && (
                    <p className="screen-description">過去の会話はありません。</p>
                )}
                <ul>
                    {pastConversations.map(conv => (
                        <li key={conv.id} className="session-list-item">
                            <button
                                onClick={() => loadConversation(conv.id)}
                                className="session-list-button"
                            >
                                <span className="session-date-theme">
                                    {conv.employee_name && <strong>{conv.employee_name}さんとの会話 - </strong>}
                                    {new Date(conv.timestamp).toLocaleString()} - テーマ: {conv.theme || '未設定'}
                                </span>
                                {conv.summary && (
                                    <span className="session-summary-preview line-clamp-2">
                                        要約: {conv.summary}
                                    </span>
                                )}
                                {conv.next_actions && (
                                    <span className="session-next-action-preview line-clamp-2">
                                        ネクストアクション: {conv.next_actions}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(conv.id);
                                }}
                                className="delete-button"
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