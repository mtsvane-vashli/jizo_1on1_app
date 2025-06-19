import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // useAuth をインポート

function New1on1Support() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState('initial'); // 'initial', 'employee_selection', 'theme_selection', 'engagement_selection', 'on_demand'
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null); // 現在選択されている部下
  const [employees, setEmployees] = useState([]); // 登録済みの部下リスト
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [currentSummary, setCurrentSummary] = useState('');
  const [currentNextActions, setCurrentNextActions] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const messagesEndRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth(); // ★追加: useAuth を取得

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

  // チャットウィンドウを最下部へスクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 部下の一覧を取得する関数 (選択用)
  const fetchEmployeesForSelection = useCallback(async () => {
    // 認証情報のロードが完了していない、または認証されていない場合は処理しない
    if (authLoading || !isAuthenticated) {
      console.log('Auth loading or not authenticated, skipping employee fetch for selection.');
      setLoadingEmployees(false); // ローディング状態を解除
      setEmployees([]); // 部下リストを空にする
      setAppState('initial'); // 状態を初期に戻す
      return;
    }

    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('jwtToken'); // ★追加: トークンを取得
      if (!token) { // トークンがない場合はAPI呼び出しをスキップ
        console.warn('No JWT token found, skipping employee fetch for selection.');
        // alert('認証トークンが見つかりません。再度ログインしてください。'); // alertはAuthContextで処理されるべき
        setLoadingEmployees(false);
        setEmployees([]);
        setAppState('initial');
        // navigate('/login', { replace: true }); // 強制リダイレクト
        return;
      }

      const response = await fetch('http://localhost:5000/api/employees', {
          headers: {
              'Authorization': `Bearer ${token}` // ★認証ヘッダー
          }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        // 401/403の場合はログアウト処理を促す
        if (response.status === 401 || response.status === 403) {
            alert('認証に失敗しました。再度ログインしてください。');
            navigate('/login', { replace: true }); // 強制リダイレクト
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setEmployees(data);
      if (data.length === 0) {
        alert('まだ部下が登録されていません。会話を開始する前に、まず設定画面で部下を登録してください。');
        navigate('/settings');
      } else {
        setAppState('employee_selection');
      }
    } catch (error) {
      console.error('Error fetching employees for selection:', error);
      alert(`部下の一覧の取得に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setLoadingEmployees(false);
    }
  }, [authLoading, isAuthenticated, setLoadingEmployees, setEmployees, setAppState, navigate]); // 依存配列に isAuthenticated, authLoading を追加

  // 過去の会話をロードする関数 (SessionLogからの遷移用)
  const loadPastConversation = useCallback(async (conversationId) => {
    setIsLoading(true);
    setCurrentConversationId(conversationId);
    setChatHistory([]);
    setCurrentSummary('');
    setCurrentNextActions('');
    setAppState('on_demand');
    setCurrentEmployee(null); // 過去の会話ロード時は部下情報をクリア

    try {
        const token = localStorage.getItem('jwtToken'); // ★追加: トークンを取得
        if (!token) {
            alert('認証に失敗しました。再度ログインしてください。');
            navigate('/login', { replace: true }); // 強制リダイレクト
            throw new Error('No authentication token found.');
        }

        const messagesResponse = await fetch(`http://localhost:5000/api/conversations/${conversationId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` } // ★追加
        });
        if (!messagesResponse.ok) {
            const errorText = await messagesResponse.text();
            throw new Error(`HTTP error! status: ${messagesResponse.status} - ${errorText}`);
        }
        const messagesData = await messagesResponse.json();
        setChatHistory(messagesData);

        const conversationDetailResponse = await fetch(`http://localhost:5000/api/conversations/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${token}` } // ★追加
        });
        if (!conversationDetailResponse.ok) {
            const errorText = await conversationDetailResponse.text();
            throw new Error(`HTTP error! status: ${conversationDetailResponse.status} - ${errorText}`);
        }
        const conversationDetailData = await conversationDetailResponse.json();
        setCurrentSummary(conversationDetailData.summary || '');
        setCurrentNextActions(conversationDetailData.next_actions || '');
        if (conversationDetailData.employee_id && conversationDetailData.employee_name) {
            setCurrentEmployee({ id: conversationDetailData.employee_id, name: conversationDetailData.employee_name });
        }


    } catch (error) {
        console.error('Error loading past conversation:', error);
        setChatHistory([{ sender: 'ai', text: '過去の会話の読み込みに失敗しました。' }]);
        setCurrentSummary('読み込みに失敗しました。');
        setCurrentNextActions('読み込みに失敗しました。');
        // エラー時もログインページへリダイレクト
        navigate('/login', { replace: true });
    } finally {
        setIsLoading(false);
    }
  }, [setIsLoading, setCurrentConversationId, setChatHistory, setCurrentSummary, setCurrentNextActions, setAppState, setCurrentEmployee, navigate]);

  // URLクエリパラメータのconversationIdを監視し、過去の会話をロードする
  useEffect(() => {
    // 認証情報のロードが完了していない、または認証されていない場合は処理しない
    if (authLoading || !isAuthenticated) {
      console.log('Auth loading or not authenticated, skipping initial fetch in New1on1Support.');
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    const convId = queryParams.get('conversationId');

    if (convId && convId !== currentConversationId) {
      console.log('Loading past conversation:', convId);
      loadPastConversation(convId);
    } else if (!convId && appState === 'initial' && chatHistory.length === 0) {
      console.log('Fetching employees for new session.');
      fetchEmployeesForSelection();
    }
  }, [location.search, currentConversationId, appState, chatHistory.length, loadPastConversation, fetchEmployeesForSelection, isAuthenticated, authLoading]);

  // AIに最初のプロンプトをリクエストする関数 (__START__を送るだけ)
  const requestInitialPrompt = useCallback(async () => {
    setIsLoading(true);
    setChatHistory([]);
    setCurrentConversationId(null);
    setCurrentSummary('');
    setCurrentNextActions('');
    // appState は既に 'employee_selection' から変わっているはずなので、ここでは更新しない

    try {
        const token = localStorage.getItem('jwtToken'); // ★追加: トークンを取得
        if (!token) {
            alert('認証に失敗しました。再度ログインしてください。');
            navigate('/login', { replace: true }); // 強制リダイレクト
            throw new Error('No authentication token found.');
        }

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ★追加
        },
        body: JSON.stringify({ message: '__START__' }),
      });
      if (!response.ok) { // エラーハンドリング強化
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setChatHistory([{ sender: 'ai', text: data.reply }]);
      setAppState('theme_selection'); // テーマ選択状態へ移行
    } catch (error) {
      console.error('Error requesting initial prompt:', error);
      alert(`初期プロンプトの取得に失敗しました: ${error.message || '不明なエラー'}`);
      // エラー時もログインページへリダイレクト
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setChatHistory, setCurrentConversationId, setCurrentSummary, setCurrentNextActions, setAppState, navigate]);


  // メッセージをバックエンドに送信
  const sendMessage = useCallback(async () => {
    if (!message.trim()) return;
    if (!currentEmployee && appState !== 'initial') {
      alert('会話を開始する部下を選択してください。');
      return;
    }

    const currentMessage = message;
    const newChatHistory = [...chatHistory, { sender: 'user', text: currentMessage }];
    setChatHistory(newChatHistory);
    setMessage('');
    setIsLoading(true);

    try {
        const token = localStorage.getItem('jwtToken'); // ★追加: トークンを取得
        if (!token) {
            alert('認証に失敗しました。再度ログインしてください。');
            navigate('/login', { replace: true }); // 強制リダイレクト
            throw new Error('No authentication token found.');
        }

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ★追加
        },
        body: JSON.stringify({
          message: currentMessage,
          conversationId: currentConversationId,
          appState: appState,
          employeeId: currentEmployee ? currentEmployee.id : null
        }),
      });
      if (!response.ok) { // エラーハンドリング強化
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setChatHistory(prev => [...prev, { sender: 'ai', text: data.reply }]);

      if (appState === 'theme_selection') {
          setAppState('engagement_selection');
      } else if (appState === 'engagement_selection') {
          setAppState('on_demand');
      }
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`メッセージ送信に失敗しました: ${error.message || '不明なエラー'}`);
      // エラー時もログインページへリダイレクト
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [message, currentEmployee, appState, currentConversationId, setIsLoading, setChatHistory, setMessage, setAppState, setCurrentConversationId, navigate]);


  // Enterキーでのメッセージ送信
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !isLoading && message.trim()) {
      sendMessage();
    }
  }, [isLoading, message, sendMessage]);

  // テーマ選択ボタンのハンドラ
  const handleThemeSelect = useCallback((selectedTheme) => {
    setMessage(selectedTheme);
    sendMessage();
  }, [setMessage, sendMessage]);

  // 関わり方選択ボタンのハンドラ
  const handleEngagementSelect = useCallback((selectedEngagement) => {
    setMessage(selectedEngagement);
    sendMessage();
  }, [setMessage, sendMessage]);

  const handleEmployeeSelect = useCallback((employee) => {
    setCurrentEmployee(employee);
    requestInitialPrompt();
  }, [setCurrentEmployee, requestInitialPrompt]);

  // 要約とネクストアクションを生成する関数
  const generateSummaryAndNextActions = useCallback(async () => {
    if (!currentConversationId) {
        alert('会話が開始されていないため、要約を生成できません。会話を開始してから再度お試しください。');
        return;
    }

    setIsGeneratingSummary(true);
    try {
        const token = localStorage.getItem('jwtToken'); // ★追加: トークンを取得
        if (!token) {
            alert('認証に失敗しました。再度ログインしてください。');
            navigate('/login', { replace: true }); // 強制リダイレクト
            throw new Error('No authentication token found.');
        }

        const response = await fetch('http://localhost:5000/api/summarize_and_next_action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // ★追加
            },
            body: JSON.stringify({ conversationId: currentConversationId }),
        });
        if (!response.ok) { // エラーハンドリング強化
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setCurrentSummary(data.summary);
        setCurrentNextActions(data.nextActions);
    } catch (error) {
        console.error('Error generating summary:', error);
        alert(`要約生成に失敗しました: ${error.message || '不明なエラー'}`);
        // エラー時もログインページへリダイレクト
        navigate('/login', { replace: true });
    } finally {
        setIsGeneratingSummary(false);
    }
  }, [currentConversationId, setIsGeneratingSummary, setCurrentSummary, setCurrentNextActions, navigate]);


  return (
    <div className="view-container">
      <h2 className="screen-header">新規1on1サポート</h2>
      <p className="screen-description">
        {/* メッセージも動的に変更 */}
        {appState === 'employee_selection' ? '会話を開始する部下を選択してください。' :
         currentEmployee ? `${currentEmployee.name}さんとの1on1セッションです。` :
         'こんにちは。1on1傾聴サポートAIです。部下の方との1on1、私が傾聴の側面からサポートします。'
        }
      </p>

      <button
        onClick={generateSummaryAndNextActions}
        disabled={isGeneratingSummary || !currentConversationId || appState !== 'on_demand'}
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
        {/* 部下選択UI */}
        {appState === 'employee_selection' && (
          <div className="input-area fixed-flow">
            <p className="prompt-text">会話を開始する部下を選んでください。</p>
            {loadingEmployees ? (
              <p className="text-gray-600">部下情報を読み込み中...</p>
            ) : employees.length === 0 ? (
              <p className="text-red-600">部下が登録されていません。設定画面で登録してください。</p>
            ) : (
              <div className="button-group employee-selection-group">
                {employees.map(employee => (
                  <button
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee)}
                    disabled={isLoading}
                    className="option-button employee-option-button"
                  >
                    {employee.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* チャットウィンドウ (部下選択中は非表示) */}
        {appState !== 'employee_selection' && (
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
        )}

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