// frontend/src/views/SessionLog.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // useAuth をインポート (必要に応じて)

function SessionLog() {
  const [pastConversations, setPastConversations] = useState([]); // 初期値は常に配列
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // エラーメッセージ表示用
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth(); // 認証状態を取得

  // コンポーネントがマウントされた時に過去の会話をフェッチ
  useEffect(() => {
    // 認証情報のロードが完了し、かつ認証されている場合のみフェッチ
    if (!authLoading && isAuthenticated) {
      fetchPastConversations();
    } else if (!authLoading && !isAuthenticated) {
      // 認証されていない場合はログインページへリダイレクト
      // App.js の ProtectedRoute がこれを処理するはずだが、念のため
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]); // 認証状態と navigate を依存に追加

  // 過去の会話履歴をバックエンドから取得
  const fetchPastConversations = async () => {
    setIsLoading(true);
    setError(null); // エラーをリセット
    try {
      const token = localStorage.getItem('jwtToken');
      // トークンがない場合は API 呼び出しをスキップ (認証ミドルウェアが401を返すため)
      if (!token) {
          console.warn('No JWT token found for fetching conversations, redirecting to login.');
          // alert('認証トークンが見つかりません。再度ログインしてください。'); // alertはAuthContextで処理されるべき
          // navigate('/login', { replace: true }); // 強制リダイレクト
          setIsLoading(false); // ローディング状態を解除
          return;
      }

      const response = await fetch('http://localhost:5000/api/conversations', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });

      if (!response.ok) {
        // response.ok が false の場合
        const errorBody = await response.text(); // JSONパース前にテキストで取得
        console.error('API Error Response Body:', errorBody); // エラーボディのログ
        let errorMessage = `HTTP error! status: ${response.status} - ${response.statusText}`;
        try {
            const errorData = JSON.parse(errorBody); // JSONとしてパースを試みる
            errorMessage = errorData.error || errorMessage;
        } catch (jsonParseError) {
            // JSONでなければそのままのテキストを使用
            console.warn('Response body was not valid JSON:', jsonParseError);
        }

        // 401/403の場合は認証エラーとして扱う
        if (response.status === 401 || response.status === 403) {
            // AuthContextのログアウトを呼び出してログインページへリダイレクトさせるのが理想
            // ここでは直接エラーメッセージを表示し、ユーザーに再度ログインを促す
            alert('認証に失敗しました。再度ログインしてください。');
            // navigate('/login', { replace: true }); // 必要であれば自動リダイレクト
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API Response Data for SessionLog:', data); // データ形式確認用のログ

      // ★修正: 受け取ったデータが配列であることを厳格に確認する
      if (Array.isArray(data)) {
          setPastConversations(data);
      } else {
          console.error('API response for conversations was not an array:', data);
          setError('サーバーからのデータ形式が不正です。');
          setPastConversations([]); // 不正なデータの場合は空の配列に設定
      }

    } catch (error) {
      console.error('Error fetching past conversations (catch block):', error);
      setError(`過去の会話履歴の取得に失敗しました: ${error.message || '不明なエラー'}`);
      setPastConversations([]); // エラー発生時も空の配列に設定し、mapエラーを防ぐ
    } finally {
      setIsLoading(false);
    }
  };

  // 過去の特定の会話をロード（New1on1Support画面に遷移して表示）
  const loadConversation = async (conversationId) => {
    // SessionLogコンポーネント内で直接会話をロードするのではなく、
    // New1on1Support画面に遷移し、そちらで会話IDを元にロードする形にする
    // 現状はシンプルなリダイレクト。実際はもっと複雑な状態管理が必要になる。
    navigate(`/?conversationId=${conversationId}`); // クエリパラメータでIDを渡す
  };

  // 会話履歴を削除する関数
  const deleteConversation = async (conversationId) => {
    if (!window.confirm('この会話履歴を完全に削除してもよろしいですか？関連するすべてのメッセージも削除されます。')) {
      return; // ユーザーがキャンセルした場合
    }

    setIsLoading(true); // 削除中はローディング表示
    setError(null); // エラーをリセット
    try {
      const token = localStorage.getItem('jwtToken'); // ★追加: トークンを取得
      if (!token) {
          alert('認証トークンが見つかりません。再度ログインしてください。');
          // navigate('/login', { replace: true });
          setIsLoading(false);
          return;
      }

      const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` } // ★追加: 認証ヘッダー
      });

      if (response.ok) {
        alert('会話履歴が削除されました。');
        fetchPastConversations(); // リストを再フェッチして更新
      } else {
        const errorBody = await response.text();
        console.error('Delete API Error Response Body:', errorBody);
        let errorMessage = `履歴の削除に失敗しました: ${response.status} - ${response.statusText}`;
        try {
            const errorData = JSON.parse(errorBody);
            errorMessage = errorData.error || errorMessage;
        } catch (jsonParseError) { /* ignore */ }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert(`履歴の削除中にエラーが発生しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="view-container">
      <h2 className="screen-header">過去のセッションログ</h2>
      <p className="screen-description">左のリストからセッションを選択してください。</p>

      <div className="session-list-container">
        {error && <p className="error-message">{error}</p>} {/* エラーメッセージ表示 */}
        {isLoading ? (
            <p className="screen-description">会話履歴を読み込み中...</p>
        ) : pastConversations.length === 0 ? (
            <p className="screen-description">過去の会話はありません。</p>
        ) : (
          <ul>
            {/* pastConversations が配列であることを保証した上で map を呼び出す */}
            {(pastConversations || []).map(conv => ( // ★修正: null/undefined の場合も安全に map 呼び出し
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