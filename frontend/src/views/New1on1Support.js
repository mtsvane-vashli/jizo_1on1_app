import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom'; // ★追加: useLocationをインポート

function New1on1Support() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState('initial'); // 'initial', 'theme_selection', 'engagement_selection', 'on_demand'
  const [currentConversationId, setCurrentConversationId] = useState(null); // 新規会話のIDを保持
  const [currentSummary, setCurrentSummary] = useState('');
  const [currentNextActions, setCurrentNextActions] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const messagesEndRef = useRef(null); // スクロール用のref
  const location = useLocation(); // URLのクエリパラメータを読み取るため

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

  // chatHistoryが更新されるたびに最下部へスクロール
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // URLクエリパラメータのconversationIdを監視し、過去の会話をロードする
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const convId = queryParams.get('conversationId');

    if (convId && convId !== currentConversationId) {
      // 過去の会話をロードする
      loadPastConversation(convId);
    } else if (!convId && appState === 'initial' && chatHistory.length === 0) {
      // クエリパラメータがない、かつ初回ロード時であれば最初のプロンプトをAIにリクエスト
      // ただし、DBにはまだ保存しない
      requestInitialPrompt();
    }
  }, [location.search, currentConversationId, appState, chatHistory.length]);

  // チャットウィンドウを最下部へスクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // AIに最初のプロンプトをリクエストする関数 (__START__を送るだけ)
  const requestInitialPrompt = async () => {
    setIsLoading(true);
    setChatHistory([]); // チャット履歴をクリア
    setCurrentConversationId(null); // IDをリセット
    setCurrentSummary(''); // 要約もクリア
    setCurrentNextActions(''); // ネクストアクションもクリア
    setAppState('initial'); // 初期状態に戻す

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '__START__' }), // 固定フロー開始のシグナル
      });
      const data = await response.json();
      setChatHistory([{ sender: 'ai', text: data.reply }]);
      setAppState('theme_selection'); // テーマ選択状態に移行
      // この段階では conversationId は返ってこない (DBに未保存のため)
    } catch (error) {
      console.error('Error requesting initial prompt:', error);
      setChatHistory([{ sender: 'ai', text: '初期プロンプトの取得に失敗しました。' }]);
    } finally {
      setIsLoading(false);
    }
  };


  // 過去の会話をロードする関数 (SessionLogからの遷移用)
  const loadPastConversation = async (conversationId) => {
    setIsLoading(true);
    setCurrentConversationId(conversationId); // 現在の会話IDを設定
    setChatHistory([]); // チャット履歴をクリア
    setCurrentSummary(''); // 要約もクリア
    setCurrentNextActions(''); // ネクストアクションもクリア
    setAppState('on_demand'); // 直接オンデマンド状態へ

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

    } catch (error) {
        console.error('Error loading past conversation:', error);
        setChatHistory([{ sender: 'ai', text: '過去の会話の読み込みに失敗しました。' }]);
        setCurrentSummary('読み込みに失敗しました。');
        setCurrentNextActions('読み込みに失敗しました。');
    } finally {
        setIsLoading(false);
    }
  };


  // メッセージをバックエンドに送信
  const sendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    const newChatHistory = [...chatHistory, { sender: 'user', text: currentMessage }];
    setChatHistory(newChatHistory);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ★修正: conversationId と現在の appState をバックエンドに渡す
        body: JSON.stringify({
          message: currentMessage,
          conversationId: currentConversationId, // null の場合もある (テーマ選択前)
          appState: appState // 現在のフロントエンドの状態を渡す
        }),
      });
      const data = await response.json();
      setChatHistory(prev => [...prev, { sender: 'ai', text: data.reply }]);

      // アプリの状態遷移ロジック
      if (appState === 'theme_selection') {
          setAppState('engagement_selection');
      } else if (appState === 'engagement_selection') {
          setAppState('on_demand');
      }
      // ★修正: バックエンドから会話IDが返ってきたら更新
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }

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
    setMessage(selectedTheme);
    sendMessage();
  };

  // 関わり方選択ボタンのハンドラ
  const handleEngagementSelect = (selectedEngagement) => {
    setMessage(selectedEngagement);
    sendMessage();
  };

  // 要約とネクストアクションを生成する関数
  const generateSummaryAndNextActions = async () => {
    // currentConversationIdが設定されていない場合は要約できない
    if (!currentConversationId) {
        alert('会話が開始されていないため、要約を生成できません。会話を開始してから再度お試しください。');
        return;
    }

    setIsGeneratingSummary(true);
    try {
        const response = await fetch('http://localhost:5000/api/summarize_and_next_action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: currentConversationId }),
        });
        const data = await response.json();
        setCurrentSummary(data.summary);
        setCurrentNextActions(data.nextActions);
    } catch (error) {
        console.error('Error generating summary:', error);
        alert('要約の生成に失敗しました。');
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="view-container">
      <h2 className="screen-header">新規1on1サポート</h2>
      <p className="screen-description">
        こんにちは。1on1傾聴サポートAIです。部下の方との1on1、私が傾聴の側面からサポートします。
        地蔵1on1メソッドに基づき、部下の方の内省を深め、心理的安全性の高い対話を実現するお手伝いをします。
        もし前回の1on1で部下に宿題や考えておいてほしいことをお伝えしていた場合は、まずそちらの確認から始めるとよいでしょう。
        本日はどのようなテーマについてお話ししたいですか? もしよろしければ、以下の選択肢から近いものを選ぶか、自由にお聞かせください。
      </p>

      <button
        onClick={generateSummaryAndNextActions}
        disabled={isGeneratingSummary || !currentConversationId || appState !== 'on_demand'} // 会話開始前は無効
        className="generate-summary-button"
      >
        {isGeneratingSummary ? '要約を生成中...' : '会話を要約しネクストアクションを提案'}
      </button>

      {(currentSummary || currentNextActions) && (
        <div className="summary-area">
          <h3 className="summary-header">
              <svg xmlns="http://www.w3.org/2000/svg" className="summary-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              会話の要約
          </h3>
          <p className="summary-text">{currentSummary}</p>
          <h3 className="summary-header">
              <svg xmlns="http://www.w3.org/2000/svg" className="summary-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              ネクストアクション
          </h3>
          {currentNextActions.split('\n').filter(line => line.trim().length > 0).map((line, index) => (
              <p key={index} className="summary-list-item">
                  {line.trim().startsWith('- ') ? line.trim().substring(2) : line.trim()}
              </p>
          ))}
        </div>
      )}


      <div className="chat-window-container">
        <div className="chat-window">
          {chatHistory.map((chat, index) => (
            <div key={index} className={`chat-message ${chat.sender}`}>
              <strong className="chat-sender">{chat.sender === 'user' ? 'あなた' : 'AI'}:</strong>
              <p className="chat-text">{chat.text}</p>
              <span className="chat-timestamp">{new Date().toLocaleTimeString()}</span>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message ai loading-message">
              <strong className="chat-sender">AI:</strong>
              <p className="chat-text">返信を生成中...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* テーマ選択UI */}
        {appState === 'theme_selection' && (
          <div className="input-area fixed-flow">
            <p className="prompt-text">【お話ししたいテーマ】</p>
            <div className="button-group">
              {themes.map((theme, index) => (
                <button
                  key={index}
                  onClick={() => handleThemeSelect(theme)}
                  disabled={isLoading}
                  className="option-button"
                >
                  {index + 1}. {theme}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="その他のテーマを自由に入力..."
              disabled={isLoading}
              className="normal-input"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !message.trim()}
              className="fixed-flow-send-button"
            >
              送信
            </button>
          </div>
        )}

        {/* 関わり方選択UI */}
        {appState === 'engagement_selection' && (
          <div className="input-area fixed-flow">
            <p className="prompt-text">【期待する関わり方】</p>
            <div className="button-group">
              {engagementTypes.map((type, index) => (
                <button
                  key={index}
                  onClick={() => handleEngagementSelect(type)}
                  disabled={isLoading}
                  className="option-button"
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
              className="normal-input"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !message.trim()}
              className="fixed-flow-send-button"
            >
              送信
            </button>
          </div>
        )}

        {/* 通常の入力エリア */}
        {appState === 'on_demand' && (
          <div className="input-area">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力... (部下のセリフは「部下から『○○』と言われました」と入力)"
              disabled={isLoading}
              className="normal-input"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !message.trim()}
              className="send-button"
            >
              送信
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default New1on1Support;