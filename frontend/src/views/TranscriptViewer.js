// frontend/src/views/TranscriptViewer.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConversationById, updateConversationTranscript } from '../services/conversationService';
import { deepDive } from '../services';
import styles from './TranscriptViewer.module.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Memo from '../components/Memo';
import MindMap from '../components/MindMap';
import Tabs from '../components/Tabs';
import { FiAlertTriangle } from 'react-icons/fi';

function TranscriptViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('memo');

    const [memo, setMemo] = useState('');
    const [mindMapData, setMindMapData] = useState({ nodes: [], edges: [] });
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
    const [isToolsOpen, setIsToolsOpen] = useState(true);

    // Deep Dive Popover state
    const [isDeepDiveOpen, setDeepDiveOpen] = useState(false);
    const [deepDiveLoading, setDeepDiveLoading] = useState(false);
    const [deepDiveError, setDeepDiveError] = useState('');
    const [deepDiveContent, setDeepDiveContent] = useState('');
    const [deepDiveAnchor, setDeepDiveAnchor] = useState('');
    const [deepDivePosition, setDeepDivePosition] = useState({ top: 0, left: 0 });
    const [deepDivePlacement, setDeepDivePlacement] = useState('bottom');
    const deepDiveRef = useRef(null);
    const [deepDiveAnchorEl, setDeepDiveAnchorEl] = useState(null);
    const scrollParentRef = useRef(null);

    const getScrollParent = (element) => {
        if (!element) return null;
        let el = element.parentElement;
        while (el) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') return el;
            el = el.parentElement;
        }
        return null;
    };

    const positionPopover = (anchorEl) => {
        if (!anchorEl) return { top: 0, left: 0, placement: 'bottom' };
        const rect = anchorEl.getBoundingClientRect();
        const popoverWidth = 360;
        const margin = 12;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const preferred = spaceBelow >= 180 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
        const left = Math.min(Math.max(rect.left, margin), viewportWidth - popoverWidth - margin);
        const top = preferred === 'bottom' ? Math.min(rect.bottom + 8, viewportHeight - margin) : Math.max(rect.top - 8, margin);
        return { top, left, placement: preferred };
    };

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

    useEffect(() => {
        if (!isDeepDiveOpen) return;
        const onDocMouseDown = (e) => {
            if (deepDiveRef.current && !deepDiveRef.current.contains(e.target)) {
                setDeepDiveOpen(false);
            }
        };
        const onKeyDown = (e) => { if (e.key === 'Escape') setDeepDiveOpen(false); };
        let rafId = null;
        const onReposition = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const pos = positionPopover(deepDiveAnchorEl);
                setDeepDivePosition({ top: pos.top, left: pos.left });
                setDeepDivePlacement(pos.placement);
            });
        };
        document.addEventListener('mousedown', onDocMouseDown);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onReposition, { passive: true });
        window.addEventListener('resize', onReposition);
        const sp = scrollParentRef.current;
        if (sp) sp.addEventListener('scroll', onReposition, { passive: true });
        onReposition();
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', onReposition);
            window.removeEventListener('resize', onReposition);
            if (sp) sp.removeEventListener('scroll', onReposition);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isDeepDiveOpen, deepDiveAnchorEl]);

    const extractClickedText = (event) => {
        try {
            const sel = window.getSelection ? window.getSelection() : null;
            const selected = sel && sel.toString().trim();
            if (selected) return selected.slice(0, 400);
            if (sel && sel.focusNode) {
                const node = sel.focusNode;
                const source = node.nodeType === 3 ? node.nodeValue : (node.textContent || '');
                const offset = typeof sel.focusOffset === 'number' ? sel.focusOffset : 0;
                const len = source.length;
                const isDelim = (ch) => /[。．\.！？!？\?]/.test(ch) || ch === '\n';
                let start = 0;
                for (let i = Math.max(0, offset - 1); i >= 0; i--) {
                    if (isDelim(source[i])) { start = i + 1; break; }
                }
                let end = len;
                for (let i = Math.min(len - 1, offset); i < len; i++) {
                    if (isDelim(source[i])) { end = i + 1; break; }
                }
                const sentence = source.slice(start, end).trim();
                if (sentence) return sentence.slice(0, 600);
            }
        } catch (_) { }
        const text = (event.target?.innerText || event.target?.textContent || '').trim();
        return text ? text.slice(0, 600) : '';
    };

    const handleSummaryClick = async (event) => {
        const queryText = extractClickedText(event);
        if (!queryText) return;
        // position
        const anchorEl = event.currentTarget || event.target;
        setDeepDiveAnchorEl(anchorEl);
        scrollParentRef.current = getScrollParent(anchorEl);
        const pos = positionPopover(anchorEl);
        setDeepDivePosition({ top: pos.top, left: pos.left });
        setDeepDivePlacement(pos.placement);
        setDeepDiveAnchor(queryText);
        setDeepDiveOpen(true);
        setDeepDiveLoading(true);
        setDeepDiveError('');
        setDeepDiveContent('');
        try {
            const res = await deepDive(id, queryText);
            setDeepDiveContent(res.explanation || '');
        } catch (err) {
            setDeepDiveError(err.message || '説明の生成に失敗しました。');
        } finally {
            setDeepDiveLoading(false);
        }
    };

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

            {/* 要約 */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>要約</h3>

                {/* ★ 注意書きを上（目立つ帯）に移動 */}
                <div className={styles.summaryAlert} role="note" aria-live="polite">
                    <FiAlertTriangle className={styles.summaryAlertIcon} />
                    <div>
                        <strong>AI生成に関する注意</strong>
                        <div className={styles.summaryAlertBody}>
                            この要約はチャットの内容と録音の文字起こしを元に生成しております。文字起こしが不正確な場合があるため、内容に違いが生じることがあります。<br />
                            操作ヒント: 要約やネクストアクション内の気になる語句・文をクリックすると、その内容を深掘りした説明をポップオーバーで表示します。文を範囲選択してからクリックすると、より的確に深掘りできます。
                        </div>
                    </div>
                </div>

                <div
                    className={styles.contentBlock}
                    onClick={handleSummaryClick}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.summary || '要約はありません。')) }}
                />
            </div>

            {/* ネクストアクション */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>ネクストアクション</h3>
                <div
                    className={styles.contentBlock}
                    onClick={handleSummaryClick}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.next_actions || 'ネクストアクションはありません。')) }}
                />

            {isDeepDiveOpen && (
                <div
                    ref={deepDiveRef}
                    className={`${styles.deepDivePopover} ${deepDivePlacement === 'top' ? styles.top : styles.bottom}`}
                    style={{ top: deepDivePosition.top, left: deepDivePosition.left }}
                    role="dialog"
                    aria-label="深掘り説明"
                >
                    <div className={styles.deepDiveHeader}>
                        <span className={styles.deepDiveTitle}>深掘り</span>
                        <button className={styles.deepDiveClose} onClick={() => setDeepDiveOpen(false)}>✕</button>
                    </div>
                    {deepDiveAnchor && (
                        <p className={styles.deepDiveAnchor}><strong>対象:</strong> {deepDiveAnchor}</p>
                    )}
                    {deepDiveLoading ? (
                        <p className={styles.deepDiveLoading}>深掘り中...</p>
                    ) : deepDiveError ? (
                        <p className={styles.deepDiveError}>{deepDiveError}</p>
                    ) : deepDiveContent ? (
                        <div className={styles.deepDiveBody} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(deepDiveContent)) }} />
                    ) : null}
                    <span className={`${styles.deepDiveArrow} ${deepDivePlacement === 'top' ? styles.top : styles.bottom}`} aria-hidden="true" />
                </div>
            )}
            </div>
        </div>
    );
}

export default TranscriptViewer;
