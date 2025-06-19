// frontend/src/views/SessionLog.js (修正後)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SessionLog() {
  const [pastConversations, setPastConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // コンポーネントがマウントされた時に過去の会話をフェッチ
  useEffect(() => {
    fetchPastConversations();
  }, []);

  // 過去の会話履歴をバックエンドから取得
  const fetchPastConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/conversations');
      const data = await response.json();
      setPastConversations(data);
    } catch (error) {
      console.error('Error fetching past conversations:', error);
      alert('過去の会話履歴の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 過去の特定の会話をロード（New1on1Support画面に遷移して表示）
  const loadConversation = async (conversationId) => {
    navigate(`/?conversationId=${conversationId}`);
  };

  // 会話履歴を削除する関数 (変更なし)
  const deleteConversation = async (conversationId) => { /* ... */ };

  return (
    <div className="view-container">
      <h2 className="screen-header">過去のセッションログ</h2>
      <p className="screen-description">左のリストからセッションを選択してください。</p>

      <div className="session-list-container">
        {isLoading ? (
            <p className="screen-description">会話履歴を読み込み中...</p>
        ) : pastConversations.length === 0 ? (
            <p className="screen-description">過去の会話はありません。</p>
        ) : (
          <ul>
            {pastConversations.map(conv => (
              <li key={conv.id} className="session-list-item">
                <button
                  onClick={() => loadConversation(conv.id)}
                  className="session-list-button"
                >
                  <span className="session-date-theme">
                      {conv.employee_name && <strong>{conv.employee_name}さんとの会話 - </strong>} {/* ★追加: 部下名を表示 */}
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
                  disabled={isLoading}
                  className="delete-button"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SessionLog;