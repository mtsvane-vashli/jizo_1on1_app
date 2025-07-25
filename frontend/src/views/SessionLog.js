// frontend/src/views/SessionLog.js (改修後)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAuth } from '../context/AuthContext';
import { getConversations, deleteConversationById } from '../services/conversationService';
import { getEmployees } from '../services/employeeService'; // ★ 部下情報を取得するサービスをインポート
import layoutStyles from '../App.module.css';
import styles from './SessionLog.module.css';

// 日付を 'YYYY-MM-DD' 形式の文字列に変換するヘルパー関数
const toDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function SessionLog() {
    const [pastConversations, setPastConversations] = useState([]);
    const [employees, setEmployees] = useState([]); // ★ 新規: 部下リストの状態
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(''); // ★ 新規: 選択された部下のID
    const [isLoading, setIsLoading] = useState(true); // ★ 初期値をtrueに変更
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading } = useAuth();

    // ★ 修正: 会話履歴と部下リストをまとめて取得
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            const fetchData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    // Promise.allで両方のデータを並行して取得
                    const [convData, empData] = await Promise.all([
                        getConversations(),
                        getEmployees()
                    ]);

                    if (Array.isArray(convData)) {
                        setPastConversations(convData);
                    } else {
                        throw new Error('サーバーから予期しない形式の会話データが返されました。');
                    }

                    if (Array.isArray(empData)) {
                        setEmployees(empData);
                    } else {
                        throw new Error('サーバーから予期しない形式の部下データが返されました。');
                    }
                } catch (err) {
                    console.error('Error fetching data:', err);
                    setError(`データの取得に失敗しました: ${err.message}`);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [isAuthenticated, authLoading]);

    const deleteConversation = async (conversationId) => {
        if (!window.confirm('この会話履歴を完全に削除してもよろしいですか？')) {
            return;
        }
        try {
            await deleteConversationById(conversationId);
            // 削除成功後、リストから該当アイテムを削除して再描画
            setPastConversations(prev => prev.filter(conv => conv.id !== conversationId));
        } catch (err) {
            console.error('Error deleting conversation:', err);
            alert(`履歴の削除中にエラーが発生しました: ${err.message}`);
        }
    };

    // ★ 新規: 選択された部下に基づいて会話をフィルタリング
    const filteredByEmployeeConversations = useMemo(() => {
        if (!selectedEmployeeId) {
            return pastConversations; // 「すべての部下」が選択されている場合は全件返す
        }
        return pastConversations.filter(conv => String(conv.employee_id) === String(selectedEmployeeId));
    }, [pastConversations, selectedEmployeeId]);

    // ★ 修正: フィルタリングされた会話リストを元に日付セットを計算
    const conversationDates = useMemo(() => {
        const dates = new Set();
        filteredByEmployeeConversations.forEach(conv => {
            dates.add(toDateString(conv.timestamp));
        });
        return dates;
    }, [filteredByEmployeeConversations]);

    // ★ 修正: フィルタリングされた会話リストを元に日付でさらに絞り込み
    const filteredByDateConversations = useMemo(() => {
        if (!selectedDate) return [];
        const targetDateStr = toDateString(selectedDate);
        return filteredByEmployeeConversations.filter(conv => toDateString(conv.timestamp) === targetDateStr);
    }, [filteredByEmployeeConversations, selectedDate]);

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = toDateString(date);
            if (conversationDates.has(dateStr)) {
                return <div className={styles.dot}></div>;
            }
        }
        return null;
    };

    if (authLoading || isLoading) {
        return (
            <div className={layoutStyles.viewContainer}>
                <h2 className={layoutStyles.screenHeader}>セッションログ</h2>
                <p className={layoutStyles.screenDescription}>データを読み込み中...</p>
            </div>
        );
    }

    return (
        <div className={layoutStyles.viewContainer}>
            <h2 className={layoutStyles.screenHeader}>セッションログ</h2>
            <p className={layoutStyles.screenDescription}>部下と日付を選択して、会話の履歴を確認できます。</p>

            {/* ★★★ ここからレイアウト変更 ★★★ */}
            <div className={styles.logViewContainer}>
                {/* --- 左パネル --- */}
                <div className={styles.leftPanel}>
                    {/* ★ 新規: 部下選択UI */}
                    <div className={styles.employeeSelectContainer}>
                        <label htmlFor="employee-select" className={styles.selectLabel}>部下を選択:</label>
                        <select
                            id="employee-select"
                            className={styles.employeeSelect}
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">すべての部下</option>
                            {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* カレンダー */}
                    <div className={styles.calendarContainer}>
                        <Calendar
                            onChange={setSelectedDate}
                            value={selectedDate}
                            tileContent={tileContent}
                            locale="ja-JP"
                        />
                    </div>
                </div>

                {/* --- 右パネル --- */}
                <div className={styles.rightPanel}>
                    <div className={styles.logListContainer}>
                        {error && <p className={styles.error}>{error}</p>}
                        {filteredByDateConversations.length > 0 ? (
                            <ul className={styles.list}>
                                {filteredByDateConversations.map(conv => (
                                    <li key={conv.id} className={styles.item}>
                                        <button
                                            onClick={() => navigate(`/app/log/transcript/${conv.id}`)}
                                            className={styles.button}
                                        >
                                            <span className={styles.dateTheme}>
                                                {conv.employee_name && <strong>{conv.employee_name}さんとの会話 - </strong>}
                                                {new Date(conv.timestamp).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - テーマ: {conv.theme || '未設定'}
                                            </span>
                                            {conv.summary && (
                                                <span className={`${styles.preview} ${styles.lineClamp2}`}>
                                                    要約: {conv.summary}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                            className={styles.deleteButton}
                                        >
                                            削除
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.emptyMessage}>
                                {filteredByEmployeeConversations.length === 0 ? 'この部下の会話記録はありません。' : '選択した日付に会話記録はありません。'}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SessionLog;
