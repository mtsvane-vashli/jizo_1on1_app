// frontend/src/views/New1on1Support.js (全面改訂版)

import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployees, getConversationById, getMessagesByConversationId, sendMessage, generateSummary } from '../services';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Reducerのための初期状態
const initialState = {
  appState: 'initial', // 'initial', 'employee_selection', 'theme_selection', 'engagement_selection', 'on_demand'
  isLoading: false,
  isGeneratingSummary: false,
  error: null,
  chatHistory: [],
  employees: [],
  currentConversationId: null,
  currentEmployee: null,
  currentSummary: '',
  currentNextActions: '',
};

// 状態遷移を管理するReducer関数
function chatReducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_EMPLOYEES_SUCCESS':
      return { ...state, isLoading: false, employees: action.payload, appState: 'employee_selection' };
    case 'SELECT_EMPLOYEE':
      return { ...state, currentEmployee: action.payload, chatHistory: [], currentConversationId: null, currentSummary: '', currentNextActions: '' };
    case 'START_CONVERSATION_SUCCESS':
      return { ...state, isLoading: false, chatHistory: [action.payload], appState: 'theme_selection' };
    case 'LOAD_PAST_CONVERSATION_SUCCESS':
      const { messages, details } = action.payload;
      return { 
        ...state, 
        isLoading: false, 
        appState: 'on_demand', 
        chatHistory: messages,
        currentConversationId: details.id,
        currentSummary: details.summary || '',
        currentNextActions: details.next_actions || '',
        currentEmployee: { id: details.employee_id, name: details.employee_name }
      };
    case 'SEND_MESSAGE':
      return { ...state, isLoading: true, chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload }] };
    case 'RECEIVE_REPLY':
      const { reply, conversationId } = action.payload;
      let nextAppState = state.appState;
      if (state.appState === 'theme_selection') nextAppState = 'engagement_selection';
      else if (state.appState === 'engagement_selection') nextAppState = 'on_demand';
      return { 
        ...state, 
        isLoading: false, 
        chatHistory: [...state.chatHistory, { sender: 'ai', text: reply }],
        currentConversationId: conversationId || state.currentConversationId,
        appState: nextAppState
      };
    case 'START_SUMMARY_GENERATION':
      return { ...state, isGeneratingSummary: true };
    case 'SUMMARY_GENERATION_SUCCESS':
      return { ...state, isGeneratingSummary: false, currentSummary: action.payload.summary, currentNextActions: action.payload.nextActions };
    case 'ERROR':
      return { ...state, isLoading: false, isGeneratingSummary: false, error: action.payload };
    case 'RESET':
        return { ...initialState, appState: 'employee_selection', employees: state.employees };
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
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // スクロール処理
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory]);

  // 初期化ロジック (URLクエリまたは新規開始)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const queryParams = new URLSearchParams(location.search);
    const convId = queryParams.get('conversationId');

    if (convId && convId !== state.currentConversationId) {
      dispatch({ type: 'START_LOADING' });
      Promise.all([
          getConversationById(convId),
          getMessagesByConversationId(convId)
      ]).then(([details, messages]) => {
          dispatch({ type: 'LOAD_PAST_CONVERSATION_SUCCESS', payload: { details, messages }});
      }).catch(err => dispatch({ type: 'ERROR', payload: err.message }));
    } else if (!convId && state.appState === 'initial') {
      dispatch({ type: 'START_LOADING' });
      getEmployees()
        .then(data => {
            if(data.length === 0) {
                alert('部下が登録されていません。設定画面で登録してください。');
                navigate('/settings');
            } else {
                dispatch({ type: 'FETCH_EMPLOYEES_SUCCESS', payload: data });
            }
        })
        .catch(err => dispatch({ type: 'ERROR', payload: err.message }));
    }
  }, [location.search, state.currentConversationId, state.appState, isAuthenticated, authLoading, navigate]);

  const handleEmployeeSelect = useCallback((employee) => {
    dispatch({ type: 'SELECT_EMPLOYEE', payload: employee });
    dispatch({ type: 'START_LOADING' });
    sendMessage({ message: '__START__' })
      .then(data => dispatch({ type: 'START_CONVERSATION_SUCCESS', payload: { sender: 'ai', text: data.reply } }))
      .catch(err => dispatch({ type: 'ERROR', payload: err.message }));
  }, []);

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    dispatch({ type: 'SEND_MESSAGE', payload: text });
    try {
        const data = await sendMessage({
            message: text,
            conversationId: state.currentConversationId,
            appState: state.appState,
            employeeId: state.currentEmployee ? state.currentEmployee.id : null
        });
        dispatch({ type: 'RECEIVE_REPLY', payload: data });
    } catch (err) {
        dispatch({ type: 'ERROR', payload: err.message });
    }
  }, [state.appState, state.currentConversationId, state.currentEmployee]);

  const handleFixedFlowSelect = useCallback((text) => {
    setMessage(text);
    handleSendMessage(text);
  }, [handleSendMessage]);

  const handleGenerateSummary = useCallback(async () => {
    if (!state.currentConversationId) return;
    dispatch({ type: 'START_SUMMARY_GENERATION' });
    try {
        const data = await generateSummary(state.currentConversationId);
        dispatch({ type: 'SUMMARY_GENERATION_SUCCESS', payload: data });
    } catch (err) {
        dispatch({ type: 'ERROR', payload: err.message });
    }
  }, [state.currentConversationId]);
  
  const renderInputArea = () => {
      const themes = ["日々の業務やタスクの進め方について", "コンディションや心身の健康について", "職場や周囲の人との関わりについて", "将来のキャリアパスや成長について", "スキルアップや学びについて", "プライベートな出来事や関心事について", "組織や会社全体に関することについて", "その他、自由に話したいこと(前回の宿題等)"];
      const engagementTypes = ["ただただ、じっくり話を聞いてほしい", "考えを深めるための壁打ち相手になってほしい", "具体的な助言やヒントが欲しい", "多様な視点や考え方を聞いてみたい", "状況や結果を共有・報告したい", "その他"];
      
      switch (state.appState) {
          case 'employee_selection':
              return (
                  <div className="input-area fixed-flow">
                    <p className="prompt-text">会話を開始する部下を選んでください。</p>
                    <div className="button-group employee-selection-group">
                      {state.employees.map(emp => <button key={emp.id} onClick={() => handleEmployeeSelect(emp)} className="option-button employee-option-button">{emp.name}</button>)}
                    </div>
                  </div>
              );
          case 'theme_selection':
          case 'engagement_selection':
              const options = state.appState === 'theme_selection' ? themes : engagementTypes;
              return (
                  <div className="input-area fixed-flow">
                      <p className="prompt-text">{state.appState === 'theme_selection' ? '【お話ししたいテーマ】' : '【期待する関わり方】'}</p>
                      <div className="button-group">
                          {options.map((opt, i) => <button key={i} onClick={() => handleFixedFlowSelect(opt)} disabled={state.isLoading} className="option-button">{i + 1}. {opt}</button>)}
                      </div>
                      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(message)} placeholder="その他のテーマを自由に入力..." className="normal-input" />
                      <button onClick={() => handleSendMessage(message)} disabled={state.isLoading || !message.trim()} className="fixed-flow-send-button">送信</button>
                  </div>
              );
          case 'on_demand':
              return (
                  <div className="input-area">
                      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(message)} placeholder="メッセージを入力..." className="normal-input" />
                      <button onClick={() => handleSendMessage(message)} disabled={state.isLoading || !message.trim()} className="send-button">送信</button>
                  </div>
              );
          default: return null;
      }
  };

  // --- JSX (return) 部分 ---
  if (authLoading) return <div className="loading-screen"><p>認証情報を確認中...</p></div>;
  if (state.appState === 'initial' && state.isLoading) return <div className="loading-screen"><p>データを読み込み中...</p></div>;

  return (
    <div className="view-container">
      <h2 className="screen-header">新規1on1サポート</h2>
      <p className="screen-description">
        {state.appState === 'employee_selection' ? '会話を開始する部下を選択してください。' : state.currentEmployee ? `${state.currentEmployee.name}さんとの1on1セッションです。` : 'こんにちは。'}
      </p>

      <button onClick={handleGenerateSummary} disabled={state.isGeneratingSummary || !state.currentConversationId || state.appState !== 'on_demand'} className="generate-summary-button">
        {state.isGeneratingSummary ? '要約を生成中...' : '会話を要約しネクストアクションを提案'}
      </button>

      {(state.currentSummary || state.currentNextActions) && (
        <div className="summary-area">
          <h3 className="summary-header">会話の要約</h3>
          <p className="summary-text">{state.currentSummary}</p>
          <h3 className="summary-header">ネクストアクション</h3>
          {state.currentNextActions.split('\n').map((line, i) => <p key={i} className="summary-list-item">{line.replace(/^- /, '')}</p>)}
        </div>
      )}

      {state.error && <p style={{color: 'red'}}>{state.error}</p>}

      <div className="chat-window-container">
        {state.appState !== 'employee_selection' && (
            <div className="chat-window">
              {state.chatHistory.map((chat, index) => (
                <div key={index} className={`chat-message ${chat.sender}`}>
                  <strong className="chat-sender">{chat.sender === 'user' ? 'あなた' : 'AI'}:</strong>
                  {chat.sender === 'ai' ? <p className="chat-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(chat.text)) }}></p> : <p className="chat-text">{chat.text}</p>}
                </div>
              ))}
              {state.isLoading && <div className="chat-message ai loading-message"><p className="chat-text">返信を生成中...</p></div>}
              <div ref={messagesEndRef} />
            </div>
        )}
        {renderInputArea()}
      </div>
    </div>
  );
}

export default New1on1Support;