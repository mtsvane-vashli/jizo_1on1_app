import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Tailwind CSSを導入しない場合はこのCSSを使用

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState('initial'); // 'initial', 'theme_selection', 'engagement_selection', 'on_demand'
  const [pastConversations, setPastConversations] = useState([]);
  const [viewingPastConversationId, setViewingPastConversationId] = useState(null);
  const [currentSummary, setCurrentSummary] = useState('');
  const [currentNextActions, setCurrentNextActions] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false); // 要約生成中のローディング状態


  const messagesEndRef = useRef(null); // スクロール用のref

  // 会話テーマの選択肢
  const themes = [
    "日々の業務やタスクの進め方について",
    "コンディションや心身の健康について",
    "職場や周囲の人との関わりについて",
    "将来のキャリアパスや成長について",
    "スキルアップや学びについて",
    "プライベートな出来事や関心事について",
    "組織や会社全体に関することについて",
    "その他、自由に話したいこと(前回の宿題等)"
  ];

  // 関わり方の選択肢
  const engagementTypes = [
    "ただただ、じっくり話を聞いてほしい",
    "考えを深めるための壁打ち相手になってほしい",
    "具体的な助言やヒントが欲しい",
    "多様な視点や考え方を聞いてみたい",
    "状況や結果を共有・報告したい",
    "その他"
  ];

  // コンポーネトがマウントされた時に過去の会話をフェッチ
  useEffect(() => {
    fetchPastConversations();
  }, []);

  // chatHistoryが更新されるたびに最下部へスクロール
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // チャットウィンドウを最下部へスクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 過去の会話履歴をバックエンドから取得
  const fetchPastConversations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/conversations');
      const data = await response.json();
      setPastConversations(data);
    } catch (error) {
      console.error('Error fetching past conversations:', error);
    }
  };

  // 過去の特定の会話をロード
  const loadConversation = async (conversationId) => {
      setIsLoading(true);
      setViewingPastConversationId(conversationId);
      setCurrentSummary(''); // 古い要約をクリア
      setCurrentNextActions(''); // 古いネクストアクションをクリア
      try {
          // 会話のメッセージ履歴を取得
          const messagesResponse = await fetch(`http://localhost:5000/api/conversations/${conversationId}/messages`);
          const messagesData = await messagesResponse.json();
          setChatHistory(messagesData);

          // 会話自体の詳細（要約とネクストアクション）を取得
          const conversationDetailResponse = await fetch(`http://localhost:5000/api/conversations/${conversationId}`);
          const conversationDetailData = await conversationDetailResponse.json();
          setCurrentSummary(conversationDetailData.summary || '');
          setCurrentNextActions(conversationDetailData.next_actions || '');

          setAppState('on_demand');
      } catch (error) {
          console.error('Error loading conversation:', error);
          setChatHistory([{ sender: 'ai', text: '過去の会話の読み込みに失敗しました。' }]);
          setCurrentSummary('読み込みに失敗しました。');
          setCurrentNextActions('読み込みに失敗しました。');
      } finally {
          setIsLoading(false);
      }
  };

  // 新しい1on1を開始
  const startNew1on1 = async () => {
    setIsLoading(true);
    setViewingPastConversationId(null); // 新しい会話を開始するので過去の会話IDをリセット
    setChatHistory([]); // チャット履歴をクリア
    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '__START__' }), // 固定フロー開始のシグナル
      });
      const data = await response.json();
      setChatHistory([{ sender: 'ai', text: data.reply }]);
      setAppState('theme_selection');
      fetchPastConversations(); // 新しい会話が追加される可能性があるのでリストを更新
    } catch (error) {
      console.error('Error starting new 1on1:', error);
      setChatHistory([{ sender: 'ai', text: 'エラーが発生しました。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // メッセージをバックエンドに送信
  const sendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message; // メッセージを一時保存
    const newChatHistory = [...chatHistory, { sender: 'user', text: currentMessage }];
    setChatHistory(newChatHistory);
    setMessage(''); // 入力欄をクリア
    setIsLoading(true);

    let backendMessage = currentMessage;
    // 固定フローの選択肢もそのままバックエンドに送信されるようにする
    // バックエンド側で`conversationState`に基づいて処理を分岐

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: backendMessage }),
      });
      const data = await response.json();
      setChatHistory(prev => [...prev, { sender: 'ai', text: data.reply }]);

      // アプリの状態遷移ロジック
      if (appState === 'theme_selection') {
          setAppState('engagement_selection');
      } else if (appState === 'engagement_selection') {
          setAppState('on_demand');
      }
      // on_demand状態の場合は、状態は変更しない

    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'エラーが発生しました。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enterキーでのメッセージ送信
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && message.trim()) {
      sendMessage();
    }
  };

  // テーマ選択ボタンのハンドラ
  const handleThemeSelect = (selectedTheme) => {
    setMessage(selectedTheme); // 選択したテーマをメッセージにセット
    // setImmediate(() => sendMessage()); // Reactの状態更新の非同期性を考慮し、即座に送信
    sendMessage(); // 非同期性を考慮しない場合でも、多くはこれで動作する
  };

  // 関わり方選択ボタンのハンドラ
  const handleEngagementSelect = (selectedEngagement) => {
    setMessage(selectedEngagement); // 選択した関わり方をメッセージにセット
    // setImmediate(() => sendMessage());
    sendMessage();
  };

  // 要約とネクストアクションを生成する関数
  const generateSummaryAndNextActions = async () => {
    if (!viewingPastConversationId) {
        alert('要約を生成するには、まず会話を開始または過去の会話をロードしてください。');
        return;
    }

    setIsGeneratingSummary(true);
    try {
        const response = await fetch('http://localhost:5000/api/summarize_and_next_action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: viewingPastConversationId }),
        });
        const data = await response.json();
        setCurrentSummary(data.summary);
        setCurrentNextActions(data.nextActions);
        // データベース更新後、過去の会話リストを再フェッチして更新を反映させる
        fetchPastConversations();
    } catch (error) {
        console.error('Error generating summary:', error);
        alert('要約の生成に失敗しました。');
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const deleteConversation = async (conversationId) => {
    if (!window.confirm('この会話履歴を完全に削除してもよろしいですか？関連するすべてのメッセージも削除されます。')) {
      return; // ユーザーがキャンセルした場合
    }

    setIsLoading(true); // 削除中はローディング表示
    try {
      const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}`, {
        method: 'DELETE', // DELETEメソッドを使用
      });

      if (response.ok) { // ステータスコードが2xxの場合
        alert('会話履歴が削除されました。');
        fetchPastConversations(); // リストを再フェッチして更新
        setAppState('initial'); // 会話リスト画面に戻る
        setChatHistory([]); // 現在のチャット履歴もクリア
        setViewingPastConversationId(null);
        setCurrentSummary('');
        setCurrentNextActions('');
      } else {
        const errorData = await response.json();
        alert(`履歴の削除に失敗しました: ${errorData.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('履歴の削除中にエラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App container mx-auto p-4 max-w-2xl border rounded-lg shadow-lg min-h-[600px] flex flex-col">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">おたすけ地蔵くん</h1>

      {appState === 'initial' && (
        <div className="flex flex-col items-center">
          <button
            onClick={startNew1on1}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md mb-6 transition duration-200 ease-in-out disabled:opacity-50"
          >
            新しい1on1を始める
          </button>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">過去の1on1</h2>
          {pastConversations.length === 0 ? (
            <p className="text-gray-500">過去の会話はありません。</p>
          ) : (
            <ul className="w-full bg-white rounded-lg shadow overflow-hidden">
              {pastConversations.map(conv => (
                <li key={conv.id} className="border-b last:border-b-0 flex items-center justify-between"> {/* Flexbox for content and delete button */}
                  <button
                    onClick={() => loadConversation(conv.id)}
                    className="flex-grow text-left p-4 hover:bg-gray-50 flex flex-col items-start"
                  >
                    <span className="font-medium text-gray-800 mb-1 break-words">
                        {new Date(conv.timestamp).toLocaleString()} - テーマ: {conv.theme || '未設定'}
                    </span>
                    {conv.summary && (
                        <span className="text-sm text-gray-600 w-full mb-1 line-clamp-2">
                            要約: {conv.summary}
                        </span>
                    )}
                     {conv.next_actions && (
                        <span className="text-sm text-gray-500 w-full line-clamp-2">
                            ネクストアクション: {conv.next_actions}
                        </span>
                    )}
                  </button>
                  {/* 削除ボタンの追加 */}
                  <button
                    onClick={(e) => {
                        e.stopPropagation(); // 親要素のクリックイベント（loadConversation）が発火しないようにする
                        deleteConversation(conv.id);
                    }}
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-md mr-2 transition duration-200 ease-in-out disabled:opacity-50 flex-shrink-0"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {appState !== 'initial' && (
        <>
          <button
            onClick={() => setAppState('initial')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md mb-4 self-start transition duration-200 ease-in-out"
          >
            会話リストに戻る
          </button>

          {/* 要約生成ボタン */}
          <button
            onClick={generateSummaryAndNextActions}
            disabled={isGeneratingSummary || !viewingPastConversationId}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md mb-4 self-center transition duration-200 ease-in-out disabled:opacity-50"
          >
            {isGeneratingSummary ? '要約を生成中...' : '会話を要約しネクストアクションを提案'}
          </button>

          {/* 要約とネクストアクションの表示エリア */}
          {(currentSummary || currentNextActions) && (
            <div className="summary-area bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
              <h3 className="text-xl font-semibold mb-2 text-yellow-800">会話の要約</h3>
              <p className="text-gray-800 whitespace-pre-wrap mb-4">{currentSummary}</p>
              <h3 className="text-xl font-semibold mb-2 text-yellow-800">ネクストアクション</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{currentNextActions}</p>
            </div>
          )}

          <div className="chat-window flex-grow border border-gray-300 p-4 rounded-lg bg-gray-50 overflow-y-auto mb-4 custom-scrollbar">
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`mb-3 p-3 rounded-lg max-w-[80%] ${
                  chat.sender === 'user'
                    ? 'bg-blue-100 self-end ml-auto text-right'
                    : 'bg-green-100 self-start mr-auto'
                }`}
              >
                <strong className="block text-sm font-semibold mb-1">
                  {chat.sender === 'user' ? 'あなた' : 'AI'}:
                </strong>
                <p className="text-gray-800 break-words whitespace-pre-wrap">{chat.text}</p>
                {/* 仮のタイムスタンプ表示。実際はDBから取得したものを表示する */}
                <span className="block text-xs text-gray-500 mt-1">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message ai bg-green-100 p-3 rounded-lg max-w-[80%] self-start mr-auto">
                <strong className="block text-sm font-semibold mb-1">AI:</strong>
                <p className="text-gray-600">返信を生成中...</p>
              </div>
            )}
            <div ref={messagesEndRef} /> {/* スクロールターゲット */}
          </div>

          {/* テーマ選択UI */}
          {appState === 'theme_selection' && (
            <div className="input-area flex flex-col items-start p-4 bg-white rounded-lg shadow-inner">
              <p className="mb-3 font-semibold text-gray-700">【お話ししたいテーマ】</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {themes.map((theme, index) => (
                  <button
                    key={index}
                    onClick={() => handleThemeSelect(theme)}
                    disabled={isLoading}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-full text-sm transition duration-200 disabled:opacity-50"
                  >
                    {index + 1}. {theme}
                  </button>
                ))}
              </div>
              {/* 自由入力欄も残す場合 */}
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="その他のテーマを自由に入力..."
                disabled={isLoading}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
               <button
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out disabled:opacity-50 self-end"
              >
                送信
              </button>
            </div>
          )}

          {/* 関わり方選択UI */}
          {appState === 'engagement_selection' && (
            <div className="input-area flex flex-col items-start p-4 bg-white rounded-lg shadow-inner">
              <p className="mb-3 font-semibold text-gray-700">【期待する関わり方】</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {engagementTypes.map((type, index) => (
                  <button
                    key={index}
                    onClick={() => handleEngagementSelect(type)}
                    disabled={isLoading}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-full text-sm transition duration-200 disabled:opacity-50"
                  >
                    {index + 1}. {type}
                  </button>
                ))}
              </div>
               <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="その他の関わり方を自由に入力..."
                disabled={isLoading}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
               <button
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out disabled:opacity-50 self-end"
              >
                送信
              </button>
            </div>
          )}

          {/* 通常の入力エリア */}
          {appState === 'on_demand' && (
            <div className="input-area flex mt-auto">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="メッセージを入力... (部下のセリフは「部下から『○○』と言われました」と入力)"
                disabled={isLoading}
                className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-r-lg transition duration-200 ease-in-out disabled:opacity-50"
              >
                送信
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;