// frontend/src/views/New1on1Support.js
import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// ★修正点: 未使用の 'getMessagesByConversationId' を削除
import { getEmployees, createConversation, getConversationById, sendMessage, generateSummary } from '../services';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import layoutStyles from '../App.module.css';
import styles from './New1on1Support.module.css';
import RealTimeTranscription from './RealTimeTranscription';

// --- 定数定義 ---
const THEMES = [
  { id: 1, text: '日々の業務やタスクの進め方について' },
  { id: 2, text: 'コンディションや心身の健康について' },
  { id: 3, text: '職場や周囲の人との関わりについて' },
  { id: 4, text: '将来のキャリアパスや成長について' },
  { id: 5, text: 'スキルアップや学びについて' },
  { id: 6, text: 'プライベートな出来事や関心事について' },
  { id: 7, text: '組織や会社全体に関することについて' },
  { id: 8, text: 'その他、自由に話したいこと（前回の宿題等）' },
];

const INTERACTIONS = [
  { id: 1, text: 'ただただ、じっくり話を聞いてほしい' },
  { id: 2, text: '考えを深めるための壁打ち相手になってほしい' },
  { id: 3, text: '具体的な助言やヒントが欲しい' },
  { id: 4, text: '多様な視点や考え方を聞いてみたい' },
  { id: 5, text: '状況や結果を共有・報告したい' },
  { id: 6, text: 'その他' },
];


// --- Reducer ---
const initialState = {
  appState: 'initial', // 'initial', 'loading', 'employee_selection', 'session_ready', 'theme_selection', 'interaction_selection', 'support_started'
  isLoading: false,
  isGeneratingSummary: false,
  error: null,
  chatHistory: [],
  employees: [],
  currentConversationId: null,
  currentEmployee: null,
  selectedTheme: null,
  selectedInteraction: null,
  currentSummary: '',
  currentNextActions: '',
  isRecording: true,
  transcript: [],
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    case 'SET_ERROR':
      return { ...state, isLoading: false, isGeneratingSummary: false, error: action.payload };
    
    // 部下選択画面のフロー
    case 'FETCH_EMPLOYEES_SUCCESS':
      return { ...state, isLoading: false, employees: action.payload, appState: 'employee_selection' };

    // セッション画面のフロー
    case 'SESSION_INIT_SUCCESS':
      return { 
        ...state, 
        isLoading: false, 
        appState: 'session_ready',
        currentConversationId: action.payload.conversationId,
        currentEmployee: action.payload.employee,
      };
    case 'START_CONVERSATION_FLOW':
      return {
        ...state,
        isLoading: true,
        chatHistory: [...state.chatHistory, { sender: 'system', text: '「始める」' }]
      };
    case 'RECEIVE_THEME_PROMPT':
      return {
        ...state,
        isLoading: false,
        appState: 'theme_selection',
        chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }]
      };
    case 'SELECT_THEME':
      return {
        ...state,
        isLoading: true,
        selectedTheme: action.payload,
        chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload.text }]
      };
    case 'RECEIVE_INTERACTION_PROMPT':
      return {
        ...state,
        isLoading: false,
        appState: 'interaction_selection',
        chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }]
      };
    case 'SELECT_INTERACTION':
        return {
          ...state,
          isLoading: true,
          selectedInteraction: action.payload,
          chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload.text }]
        };
    case 'RECEIVE_SUPPORT_START_PROMPT':
      return {
        ...state,
        isLoading: false,
        appState: 'support_started',
        chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }]
      };
    
    // 汎用チャット処理
    case 'SEND_MESSAGE':
      return { 
        ...state, 
        isLoading: true, 
        chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload }] 
      };
    case 'RECEIVE_REPLY':
      return { 
        ...state, 
        isLoading: false, 
        chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }] 
      };

    // 要約機能
    case 'START_SUMMARY_GENERATION':
      return { ...state, isGeneratingSummary: true };
    case 'SUMMARY_GENERATION_SUCCESS':
      return { ...state, isGeneratingSummary: false, currentSummary: action.payload.summary, currentNextActions: action.payload.nextActions };

    // 文字起こし機能
    case 'TOGGLE_RECORDING':
      return { ...state, isRecording: !state.isRecording };
    case 'UPDATE_TRANSCRIPT':
      return { ...state, transcript: [...state.transcript, action.payload] };

    default:
      return state;
  }
}

// ---- コンポーネント本体 ----
function New1on1Support() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const isSessionView = location.pathname === '/session';

  // メッセージ履歴の末尾に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory]);

  // バックエンドにメッセージを送信する共通関数
  const sendMessageToApi = useCallback(async (textToSend) => {
    if (!state.currentConversationId) return;
    try {
      const data = await sendMessage({
        message: textToSend,
        conversationId: state.currentConversationId,
      });
      return data.reply;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  }, [state.currentConversationId]);

  // --- 初期化 & 自動開始ロジック ---
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    // --- セッション画面の初期化 ---
    if (isSessionView && state.appState === 'initial') {
      const convId = searchParams.get('conversationId');
      if (convId) {
        dispatch({ type: 'START_LOADING' });
        getConversationById(convId)
          .then(details => {
            dispatch({ 
              type: 'SESSION_INIT_SUCCESS', 
              payload: { 
                conversationId: details.id,
                employee: { id: details.employee_id, name: details.employee_name }
              } 
            });
          })
          .catch(err => {
            dispatch({ type: 'SET_ERROR', payload: `セッションの読み込みに失敗しました: ${err.message}` });
          });
      }
    } 
    // --- 部下選択画面の初期化 ---
    else if (!isSessionView && state.appState === 'initial') {
      dispatch({ type: 'START_LOADING' });
      getEmployees()
        .then(data => {
          if (data.length === 0) {
            alert('部下が登録されていません。設定画面で登録してください。');
            navigate('/app/settings');
          } else {
            dispatch({ type: 'FETCH_EMPLOYEES_SUCCESS', payload: data });
          }
        })
        .catch(err => dispatch({ type: 'SET_ERROR', payload: err.message }));
    }
  }, [state.appState, isSessionView, searchParams, isAuthenticated, authLoading, navigate]);

  // --- セッション準備完了後に自動で会話を開始 ---
  useEffect(() => {
    if (state.appState === 'session_ready') {
      const startFlow = async () => {
        dispatch({ type: 'START_CONVERSATION_FLOW' });
        const reply = await sendMessageToApi('始める');
        if (reply) {
          dispatch({ type: 'RECEIVE_THEME_PROMPT', payload: reply });
        }
      };
      startFlow();
    }
  }, [state.appState, sendMessageToApi]);

  // --- イベントハンドラ ---

  // 部下選択時の処理
  const handleEmployeeSelect = useCallback(async (employee) => {
    dispatch({ type: 'START_LOADING' });
    try {
      const newConversationResponse = await createConversation({ employeeId: employee.id });
      const conversationId = newConversationResponse?.conversation?.id;
      if (conversationId) {
        window.open(`/session?conversationId=${conversationId}`, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error("サーバーから会話IDが返されませんでした。");
      }
      dispatch({ type: 'STOP_LOADING' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);
  
  // テーマ選択の処理
  const handleThemeSelect = useCallback(async (theme) => {
    dispatch({ type: 'SELECT_THEME', payload: theme });
    const reply = await sendMessageToApi(theme.text);
    if (reply) {
      dispatch({ type: 'RECEIVE_INTERACTION_PROMPT', payload: reply });
    }
  }, [sendMessageToApi]);

  // 関わり方選択の処理
  const handleInteractionSelect = useCallback(async (interaction) => {
    dispatch({ type: 'SELECT_INTERACTION', payload: interaction });
    const reply = await sendMessageToApi(interaction.text);
    if(reply) {
      dispatch({ type: 'RECEIVE_SUPPORT_START_PROMPT', payload: reply });
    }
  }, [sendMessageToApi]);

  // 自由入力メッセージ送信の処理
  const handleSendFreeMessage = useCallback(async () => {
    if (!message.trim() || !state.currentConversationId) return;
    const textToSend = message;
    setMessage('');
    dispatch({ type: 'SEND_MESSAGE', payload: textToSend });
    const reply = await sendMessageToApi(textToSend);
    if (reply) {
      dispatch({ type: 'RECEIVE_REPLY', payload: reply });
    }
  }, [message, state.currentConversationId, sendMessageToApi]);

  // 要約生成の処理
  const handleGenerateSummary = useCallback(async () => {
    if (!state.currentConversationId) return;
    dispatch({ type: 'START_SUMMARY_GENERATION' });
    try {
      const formattedTranscript = state.transcript.map(item => `${item.speakerTag ? `話者${item.speakerTag}: ` : ''}${item.transcript}`).join('\n');
      const data = await generateSummary(state.currentConversationId, formattedTranscript);
      dispatch({ type: 'SUMMARY_GENERATION_SUCCESS', payload: data });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.currentConversationId, state.transcript]);

  // 文字起こし関連の処理
  const handleTranscriptUpdate = useCallback((newTranscript) => {
    dispatch({ type: 'UPDATE_TRANSCRIPT', payload: newTranscript });
  }, []);

  const handleToggleRecording = () => {
    dispatch({ type: 'TOGGLE_RECORDING' });
  };

  // --- レンダリング ---

  if (authLoading || (state.appState === 'initial' && state.isLoading)) {
    return <div className={layoutStyles.loadingScreen}><p>データを読み込み中...</p></div>;
  }

  // --- セッション画面のレンダリング ---
  if (isSessionView) {
    if (state.appState === 'loading' || (state.appState === 'initial' && state.isLoading) || state.appState === 'session_ready') {
        return <div className={styles.sessionLoadingScreen}><p>セッションを準備中です...</p></div>;
    }
    return (
      <div className={styles.sessionViewContainer}>
        <div className={styles.leftPanel}>
          <button onClick={handleGenerateSummary} disabled={state.isGeneratingSummary || !state.currentConversationId} className={styles.summaryButton}>
            {state.isGeneratingSummary ? '要約を生成中...' : '会話を要約しネクストアクションを提案'}
          </button>
          
          {(state.currentSummary || state.currentNextActions) && (
            <div className={styles.summaryArea}>
              {state.currentSummary && (
                <>
                  <h3 className={styles.summaryHeader}>会話の要約</h3>
                  <div className={styles.summaryText} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(state.currentSummary)) }} />
                </>
              )}
              {state.currentNextActions && (
                <>
                  <h3 className={styles.summaryHeader} style={{ marginTop: '1rem' }}>ネクストアクション</h3>
                  <div className={styles.summaryText} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(state.currentNextActions)) }} />
                </>
              )}
            </div>
          )}

          <div className={styles.chatContainer}>
            <div className={styles.chatWindow}>
              {state.chatHistory.map((chat, index) => (
                // システムメッセージは非表示
                chat.sender !== 'system' && (
                  <div key={index} className={`${styles.message} ${styles[chat.sender]}`}>
                    <strong className={styles.sender}>{chat.sender === 'user' ? 'あなた' : 'AI'}:</strong>
                    <div className={styles.text} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(chat.text)) }}></div>
                  </div>
                )
              ))}

              {/* 選択肢ボタンの表示 */}
              {state.appState === 'theme_selection' && !state.isLoading && (
                <div className={styles.optionButtonContainer}>
                  {THEMES.map(theme => (
                    <button key={theme.id} onClick={() => handleThemeSelect(theme)} className={styles.optionButton}>
                      {theme.text}
                    </button>
                  ))}
                </div>
              )}
              {state.appState === 'interaction_selection' && !state.isLoading && (
                <div className={styles.optionButtonContainer}>
                  {INTERACTIONS.map(interaction => (
                    <button key={interaction.id} onClick={() => handleInteractionSelect(interaction)} className={styles.optionButton}>
                      {interaction.text}
                    </button>
                  ))}
                </div>
              )}

              {state.isLoading && <div className={`${styles.message} ${styles.ai} ${styles.loading}`}><p className={styles.text}>AIが応答を生成中...</p></div>}
              <div ref={messagesEndRef} />
            </div>
            
            {/* 入力エリアの表示制御 */}
            {state.appState === 'support_started' && (
              <div className={styles.inputArea}>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendFreeMessage()} placeholder="部下から言われたことなどを入力..." className={styles.normalInput} />
                  <button onClick={handleSendFreeMessage} disabled={state.isLoading || !message.trim()} className={styles.sendButton}>送信</button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.rightPanel}>
          <RealTimeTranscription
            isRecording={state.isRecording}
            onToggleRecording={handleToggleRecording}
            transcript={state.transcript}
            onTranscriptUpdate={handleTranscriptUpdate}
            employeeName={state.currentEmployee?.name || '...'}
          />
        </div>
      </div>
    );
  }

  // --- 部下選択画面のレンダリング ---
  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>新規1on1サポート</h2>
      <p className={layoutStyles.screenDescription}>
        会話を開始する部下を選択してください。新しいタブでセッションが開始されます。
      </p>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.employeeSelectionContainer}>
        {state.isLoading && state.appState === 'employee_selection' && <p>読み込み中...</p>}
        {state.appState === 'employee_selection' && (
          <div className={styles.employeeSelectionGroup}>
            {state.employees.map(emp => <button key={emp.id} onClick={() => handleEmployeeSelect(emp)} disabled={state.isLoading} className={styles.employeeOptionButton}>{emp.name}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default New1on1Support;
