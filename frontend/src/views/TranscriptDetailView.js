import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConversationById, getMessagesByConversationId } from '../services/conversationService';
import layoutStyles from '../App.module.css';
import styles from './TranscriptDetailView.module.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FiAlertTriangle } from 'react-icons/fi';
import { deepDive } from '../services';

function TranscriptDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Deep Dive Popover state
    const [isDeepDiveOpen, setDeepDiveOpen] = useState(false);
    const [deepDiveLoading, setDeepDiveLoading] = useState(false);
    const [deepDiveError, setDeepDiveError] = useState('');
    const [deepDiveContent, setDeepDiveContent] = useState('');
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
        const margin = 12;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popoverWidth = Math.min(1080, viewportWidth * 0.92);
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const preferred = spaceBelow >= 180 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
        const left = Math.min(Math.max(rect.left, margin), viewportWidth - popoverWidth - margin);
        const top = preferred === 'bottom' ? Math.min(rect.bottom + 8, viewportHeight - margin) : Math.max(rect.top - 8, margin);
        return { top, left, placement: preferred };
    };

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
        const anchorEl = event.currentTarget || event.target;
        setDeepDiveAnchorEl(anchorEl);
        scrollParentRef.current = getScrollParent(anchorEl);
        const pos = positionPopover(anchorEl);
        setDeepDivePosition({ top: pos.top, left: pos.left });
        setDeepDivePlacement(pos.placement);
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

                {conversation.memo && (
                    <div className={styles.memoArea}>
                        <h3>メモ</h3>
                        <div className={styles.memoContent}>{conversation.memo}</div>
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
                                    この要約はチャットの内容と録音の文字起こしを元に生成しております。文字起こしが不正確な場合があるため、内容に違いが生じることがあります。<br />
                                    操作ヒント: 要約やネクストアクション内の気になる語句・文をクリックすると、その内容を深掘りした説明をポップオーバーで表示します。文を範囲選択してからクリックすると、より的確に深掘りできます。
                                </div>
                            </div>
                        </div>

                        <div className={styles.summaryCards}>
                            {conversation.summary && (
                                <section className={styles.summaryCard}>
                                    <header className={styles.summaryCardHeader}>
                                        <h4 className={styles.summaryCardTitle}>会話の要約</h4>
                                        <span className={styles.summaryHelper}>クリックで深掘りのヒントを表示</span>
                                    </header>
                                    <div
                                        className={`${styles.summaryBody} ${styles.summaryText}`}
                                        onClick={handleSummaryClick}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.summary)) }}
                                    />
                                </section>
                            )}
                            {conversation.next_actions && (
                                <section className={`${styles.summaryCard} ${styles.summaryActionCard}`}>
                                    <header className={styles.summaryCardHeader}>
                                        <h4 className={styles.summaryCardTitle}>ネクストアクション</h4>
                                        <span className={styles.summaryHelper}>上司の具体的な次の一手を整理</span>
                                    </header>
                                    <div
                                        className={`${styles.summaryBody} ${styles.summaryText}`}
                                        onClick={handleSummaryClick}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(conversation.next_actions)) }}
                                    />
                                </section>
                            )}
                        </div>

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
                )}
            </div>
        </div>
    );
}

export default TranscriptDetailView;
