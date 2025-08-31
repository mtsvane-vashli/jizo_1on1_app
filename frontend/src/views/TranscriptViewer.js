// frontend/src/views/TranscriptViewer.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConversationById, updateConversationTranscript } from '../services/conversationService';
import styles from './TranscriptViewer.module.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Memo from '../components/Memo';
import MindMap from '../components/MindMap';
import Tabs from '../components/Tabs';

function TranscriptViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('memo');

    // States for editable fields
    const [memo, setMemo] = useState('');
    const [mindMapData, setMindMapData] = useState({ nodes: [], edges: [] });
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
    const [isToolsOpen, setIsToolsOpen] = useState(true);

    useEffect(() => {
        const fetchConversation = async () => {
            try {
                setIsLoading(true);
                const data = await getConversationById(id);

                if (data && typeof data.transcript === 'string') {
                    data.transcript = data.transcript.split('\n').map((line, index) => {
                        const parts = line.match(/^(話者\d+):(.*)$/);
                        return parts
                            ? { id: `line-${index}`, speakerTag: parts[1].replace('話者', '').trim(), text: parts[2].trim() }
                            : { id: `line-${index}`, speakerTag: null, text: line };
                    });
                } else if (data && !Array.isArray(data.transcript)) {
                    data.transcript = [];
                }

                setConversation(data);
                setMemo(data.memo || '');
                setMindMapData(data.mind_map_data || { nodes: [], edges: [] });

            } catch (err) {
                setError('会話データの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversation();
    }, [id]);

    const handleEditStart = (transcriptItem) => {
        setEditingId(transcriptItem.id);
        setEditingText(transcriptItem.text);
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditingText('');
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);

        const updatedTranscriptArray = conversation.transcript.map(item =>
            item.id === editingId ? { ...item, text: editingText } : item
        );

        const updatedTranscriptString = updatedTranscriptArray
            .map(item => (item.speakerTag ? `話者${item.speakerTag}: ` : '') + item.text)
            .join('\n');

        try {
            await updateConversationTranscript(id, updatedTranscriptString);

            setConversation(prev => ({
                ...prev,
                transcript: updatedTranscriptArray,
            }));
            handleEditCancel();
        } catch (err) {
            alert('更新に失敗しました。');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className={styles.viewerContainer}><p>読み込み中...</p></div>;
    }

    if (error) {
        return <div className={styles.viewerContainer}><p className={styles.error}>{error}</p></div>;
    }

    if (!conversation) {
        return <div className={styles.viewerContainer}><p>会話データが見つかりません。</p></div>;
    }

    return (
        <div className={styles.viewerContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>会話ログ詳細</h2>
                <button onClick={() => navigate('/app/logs')} className={styles.backButton}>
                    &larr; ログ一覧に戻る
                </button>
            </div>

            <div className={styles.metaInfo}>
                <p><strong>従業員名:</strong> {conversation.employee_name || 'N/A'}</p>
                <p><strong>日時:</strong> {new Date(conversation.timestamp).toLocaleString()}</p>
                <p><strong>テーマ:</strong> {conversation.theme || '未設定'}</p>
            </div>

            <div className={styles.section}>
                <div className={`${styles.sectionTitle} ${styles.collapsible}`} onClick={() => setIsToolsOpen(!isToolsOpen)}>
                    <span>メモ & マインドマップ</span>
                    <span className={`${styles.toggleIcon} ${!isToolsOpen ? styles.closed : ''}`}>▼</span>
                </div>
                {isToolsOpen && (
                    <div className={`${styles.collapsibleContent} ${styles.toolsContainer}`}>
                        <Tabs activeTab={activeTab} onTabClick={setActiveTab} />
                        <div className={styles.tabContent}>
                            {activeTab === 'memo' && <Memo memo={memo} setMemo={() => { }} />}
                            {activeTab === 'mindmap' && <MindMap mindMapData={mindMapData} setMindMapData={() => { }} isReadOnly={true} />}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <div className={`${styles.sectionTitle} ${styles.collapsible}`} onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}>
                    <span>会話の文字起こし</span>
                    <span className={`${styles.toggleIcon} ${!isTranscriptOpen ? styles.closed : ''}`}>▼</span>
                </div>

                {isTranscriptOpen && (
                    <div className={styles.collapsibleContent}>
                        <p className={styles.cardDescription}>テキストをクリックすると内容を編集できます。</p>
                        <div className={styles.transcriptContainer}>
                            {conversation.transcript && conversation.transcript.length > 0 ? (
                                conversation.transcript.map((item) => (
                                    <div key={item.id} className={styles.transcriptItem}>
                                        {item.speakerTag && <span className={styles.speakerTag}>{`話者${item.speakerTag}: `}</span>}
                                        {editingId === item.id ? (
                                            <div className={styles.editingContainer}>
                                                <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className={styles.editingTextarea} rows={3} autoFocus />
                                                <div className={styles.buttonGroup}>
                                                    <button onClick={handleSave} disabled={isSaving} className={styles.saveButton}>{isSaving ? '保存中...' : '保存'}</button>
                                                    <button onClick={handleEditCancel} className={styles.cancelButton}>キャンセル</button>
                                                </div>
                                            </div>
                                        ) : (<p className={styles.transcriptText} onClick={() => handleEditStart(item)}>{item.text}</p>)}
                                    </div>
                                ))
                            ) : (<p className={styles.noTranscript}>文字起こしデータはありません。</p>)}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>要約</h3>
                <div
                    className={styles.contentBlock}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.summary || '要約はありません。')) }}
                />
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>ネクストアクション</h3>
                <div
                    className={styles.contentBlock}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.next_actions || 'ネクストアクションはありません。')) }}
                />
                <p className={styles.summaryNote}>
                    ・要約の注意書き この要約はチャットの内容と録音の文字起こしを元に生成しております。文字起こしが不正確な場合があるため、内容に違いが生じることがあります。
                </p>
            </div>
        </div>
    );
}

export default TranscriptViewer;
