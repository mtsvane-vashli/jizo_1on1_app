import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConversationById, getMessagesByConversationId } from '../services/conversationService';
import layoutStyles from '../App.module.css';
import styles from './TranscriptDetailView.module.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FiAlertTriangle } from 'react-icons/fi';

function TranscriptDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchConversationDetails = async () => {
            try {
                setIsLoading(true);
                const convDetails = await getConversationById(id);
                const convMessages = await getMessagesByConversationId(id);
                setConversation(convDetails);
                setMessages(convMessages);
            } catch (err) {
                console.error("Failed to fetch conversation details:", err);
                setError("会話の詳細を読み込めませんでした。");
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversationDetails();
    }, [id]);

    if (isLoading) {
        return (
            <div className={layoutStyles.viewContainer}>
                <h2 className={layoutStyles.screenHeader}>セッションログ詳細</h2>
                <p className={layoutStyles.screenDescription}>読み込み中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={layoutStyles.viewContainer}>
                <h2 className={layoutStyles.screenHeader}>エラー</h2>
                <p className={layoutStyles.screenDescription}>{error}</p>
                <button onClick={() => navigate('/logs')} className={styles.backButton}>ログ一覧に戻る</button>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className={layoutStyles.viewContainer}>
                <h2 className={layoutStyles.screenHeader}>セッションが見つかりません</h2>
                <p className={layoutStyles.screenDescription}>指定されたIDのセッションログは見つかりませんでした。</p>
                <button onClick={() => navigate('/logs')} className={styles.backButton}>ログ一覧に戻る</button>
            </div>
        );
    }

    return (
        <div className={layoutStyles.viewContainer}>
            <h2 className={layoutStyles.screenHeader}>セッションログ詳細</h2>
            <p className={layoutStyles.screenDescription}>
                {conversation.employee_name ? `${conversation.employee_name}さんとの会話 - ` : ''}
                {conversation.timestamp ? new Date(conversation.timestamp).toLocaleString() : ''} - テーマ: {conversation.theme || '未設定'}
            </p>

            <div className={styles.detailContainer}>
                <div className={styles.chatHistory}>
                    <h3>AIチャット履歴</h3>
                    {messages.length > 0 ? (
                        messages.map((msg, index) => {
                            const raw = (typeof msg?.text === 'string' && msg.text.length > 0)
                                ? msg.text
                                : (typeof msg?.message === 'string' ? msg.message : '');
                            const html = DOMPurify.sanitize(marked.parse(raw));

                            return (
                                <div key={index} className={`${styles.message} ${styles[msg.sender]}`}>
                                    <strong className={styles.sender}>{msg.sender === 'user' ? 'あなた' : 'AI'}:</strong>
                                    <div className={styles.text} dangerouslySetInnerHTML={{ __html: html }}></div>
                                </div>
                            );
                        })
                    ) : (
                        <p>チャット履歴はありません。</p>
                    )}
                </div>

                {conversation.transcript && (
                    <div className={styles.transcriptArea}>
                        <h3>文字起こし</h3>
                        <div className={styles.transcriptContent}>
                            {conversation.transcript.split('\n').map((line, index) => (
                                <p key={index}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                {(conversation.summary || conversation.next_actions) && (
                    <div className={styles.summaryArea}>
                        <h3>要約とネクストアクション</h3>

                        {/* ★ 注意書きを上（目立つ帯）に移動 */}
                        <div className={styles.summaryAlert} role="note" aria-live="polite">
                            <FiAlertTriangle className={styles.summaryAlertIcon} />
                            <div>
                                <strong>AI生成に関する注意</strong>
                                <div className={styles.summaryAlertBody}>
                                    この要約はチャットの内容と録音の文字起こしを元に生成しております。文字起こしが不正確な場合があるため、内容に違いが生じることがあります。
                                </div>
                            </div>
                        </div>

                        {conversation.summary && (
                            <>
                                <h4>要約:</h4>
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.summary)) }}></div>
                            </>
                        )}
                        {conversation.next_actions && (
                            <>
                                <h4>ネクストアクション:</h4>
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.next_actions)) }}></div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TranscriptDetailView;
