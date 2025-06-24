// frontend/src/views/TranscriptDetailView.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getConversationById } from '../services/conversationService';
import layoutStyles from '../App.module.css';
import styles from './TranscriptDetailView.module.css';

function TranscriptDetailView() {
    const [conversation, setConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { id } = useParams(); // URLから :id を取得

    useEffect(() => {
        const fetchConversation = async () => {
            setIsLoading(true);
            try {
                const data = await getConversationById(id);
                setConversation(data);
            } catch (err) {
                setError('データの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversation();
    }, [id]);

    if (isLoading) {
        return <div className={layoutStyles.loadingScreen}><p>ログを読み込み中...</p></div>;
    }
    if (error) {
        return <div className={layoutStyles.viewContainer}><p className={styles.error}>{error}</p></div>;
    }
    if (!conversation) {
        return <div className={layoutStyles.viewContainer}><p>データが見つかりません。</p></div>;
    }

    return (
        <div className={layoutStyles.viewContainer}>
            <h2 className={layoutStyles.screenHeader}>セッションログ詳細</h2>
            <div className={styles.metaInfo}>
                <p><strong>日時:</strong> {new Date(conversation.timestamp).toLocaleString()}</p>
                <p><strong>テーマ:</strong> {conversation.theme}</p>
                {conversation.employee_name && <p><strong>対象従業員:</strong> {conversation.employee_name}</p>}
            </div>
            <div className={styles.transcriptContainer}>
                <h3>文字起こし記録</h3>
                <pre className={styles.transcriptContent}>
                    {conversation.transcript}
                </pre>
            </div>
        </div>
    );
}

export default TranscriptDetailView;