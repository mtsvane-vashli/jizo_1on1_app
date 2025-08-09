// frontend/src/views/New1on1Support.js
import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployees, sendMessage, generateSummary, updateConversation, getConversationById } from '../services';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import layoutStyles from '../App.module.css';
import styles from './New1on1Support.module.css';
import Tabs from '../components/Tabs';
import Memo from '../components/Memo';
import MindMap from '../components/MindMap';
import TranscriptPopup from '../components/TranscriptPopup';
import { io } from 'socket.io-client';
import { FiMic, FiMicOff } from 'react-icons/fi';

const initialNodes = [
  { id: '1', type: 'default', data: { label: '中心テーマ' }, position: { x: 250, y: 150 } },
];

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

const SelectionList = ({ title, items, onSelect, disabled }) => {
  const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return (
    <div className={styles.selectionListContainer}>
      <h3 className={styles.selectionListTitle}>{title}</h3>
      <ul className={styles.selectionList}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.selectionListItem}>
            <button onClick={() => onSelect(item)} disabled={disabled}>
              <span className={styles.selectionListNumber}>{circledNumbers[index] || `${index + 1}.`}</span>
              <span className={styles.selectionListText}>{item.text}</span>
              <span className={styles.selectionListArrow}>&rarr;</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const initialState = {
  appState: 'initial', isLoading: false, isGeneratingSummary: false, error: null, chatHistory: [],
  employees: [], currentConversationId: null, currentEmployee: null, selectedTheme: null,
  selectedInteraction: null, currentSummary: '', currentNextActions: '', isSummaryVisible: false,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'START_LOADING': return { ...state, isLoading: true, error: null };
    case 'STOP_LOADING': return { ...state, isLoading: false };
    case 'SET_ERROR': return { ...state, isLoading: false, isGeneratingSummary: false, error: action.payload };
    case 'FETCH_EMPLOYEES_SUCCESS': return { ...state, isLoading: false, employees: action.payload, appState: 'employee_selection' };
    case 'SESSION_INIT_SUCCESS': return { ...state, isLoading: false, appState: 'session_ready', currentEmployee: action.payload.employee, currentConversationId: null, };
    case 'START_CONVERSATION_FLOW': return { ...state, isLoading: true };
    case 'RECEIVE_THEME_PROMPT': return { ...state, isLoading: false, appState: 'theme_selection', chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }] };
    case 'SELECT_THEME': return { ...state, isLoading: true, selectedTheme: action.payload, chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload.text }] };
    case 'RECEIVE_INTERACTION_PROMPT': return { ...state, isLoading: false, appState: 'engagement_selection', chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload.reply }], currentConversationId: action.payload.conversationId, };
    case 'SELECT_INTERACTION': return { ...state, isLoading: true, selectedInteraction: action.payload, chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload.text }] };
    case 'RECEIVE_SUPPORT_START_PROMPT': return { ...state, isLoading: false, appState: 'support_started', chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }] };
    case 'SEND_MESSAGE': return { ...state, isLoading: true, chatHistory: [...state.chatHistory, { sender: 'user', text: action.payload }] };
    case 'RECEIVE_REPLY': return { ...state, isLoading: false, chatHistory: [...state.chatHistory, { sender: 'ai', text: action.payload }] };
    case 'START_SUMMARY_GENERATION': return { ...state, isGeneratingSummary: true };
    case 'SUMMARY_GENERATION_SUCCESS': return { ...state, isGeneratingSummary: false, currentSummary: action.payload.summary, currentNextActions: action.payload.nextActions, isSummaryVisible: true, };
    case 'TOGGLE_SUMMARY_VISIBILITY': return { ...state, isSummaryVisible: !state.isSummaryVisible };
    default: return state;
  }
}

function New1on1Support() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('memo');
  const [memo, setMemo] = useState('');
  const [mindMapData, setMindMapData] = useState({ nodes: initialNodes, edges: [] });

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isTranscriptPopupVisible, setIsTranscriptPopupVisible] = useState(false);
  const [isTranscriptPopupMinimized, setIsTranscriptPopupMinimized] = useState(false);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);

  const isSessionView = location.pathname === '/session';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.chatHistory]);

  const handleTranscriptUpdate = useCallback((data) => {
    if (data.isFinal) {
      setTranscript(prev => [...prev, { transcript: data.transcript.trim(), speakerTag: data.speakerTag }]);
      setInterimTranscript('');
    } else {
      const speakerPrefix = data.speakerTag ? `話者${data.speakerTag}: ` : '';
      setInterimTranscript(speakerPrefix + data.transcript);
    }
  }, []);

  useEffect(() => {
    if (!isSessionView) return;
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    socketRef.current = io(backendUrl);
    socketRef.current.on('transcript_data', handleTranscriptUpdate);
    return () => { socketRef.current?.disconnect(); };
  }, [isSessionView, handleTranscriptUpdate]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('end_transcription');
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
      audioStreamRef.current = stream;
      socketRef.current.emit('start_transcription');
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
          socketRef.current.emit('audio_stream', event.data);
        }
      };
      recorder.start(1000);
    } catch (error) {
      console.error('Mic access failed:', error);
      alert('マイクへのアクセス許可が必要です。');
      setIsRecording(false);
      setIsTranscriptPopupVisible(false);
    }
  }, []);

  const handleToggleRecording = () => {
    if (isRecording && isTranscriptPopupMinimized) {
      setIsTranscriptPopupVisible(true);
      setIsTranscriptPopupMinimized(false);
      return;
    }
    const nextState = !isRecording;
    setIsRecording(nextState);
    if (nextState) {
      setIsTranscriptPopupVisible(true);
      setIsTranscriptPopupMinimized(false);
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleClosePopup = () => {
    setIsTranscriptPopupVisible(false);
    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    }
  };

  const handleMinimizePopup = () => {
    setIsTranscriptPopupVisible(false);
    setIsTranscriptPopupMinimized(true);
  };

  const handleSaveTools = useCallback(async () => {
    if (!state.currentConversationId) return;
    try {
      const formattedTranscript = transcript.map(item => `${item.speakerTag ? `話者${item.speakerTag}: ` : ''}${item.transcript}`).join('\n');
      await updateConversation(state.currentConversationId, {
        memo,
        mindMapData,
        transcript: formattedTranscript
      });
    } catch (err) {
      console.error("Failed to save tools data", err);
      alert("メモとマインドマップの保存に失敗しました。");
    }
  }, [state.currentConversationId, memo, mindMapData, transcript]);

  const sendMessageToApi = useCallback(async ({ textToSend, appStateOverride }) => {
    const formattedTranscript = transcript.map(item => `${item.speakerTag ? `話者${item.speakerTag}: ` : ''}${item.transcript}`).join('\n');
    try {
      const payload = { message: textToSend, conversationId: state.currentConversationId, appState: appStateOverride || state.appState, employeeId: state.currentEmployee?.id, chatHistory: state.chatHistory, transcript: formattedTranscript, };
      const data = await sendMessage(payload);
      return data;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  }, [state.currentConversationId, state.appState, state.currentEmployee, state.chatHistory, transcript]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (isSessionView && state.appState === 'initial') {
      const employeeId = searchParams.get('employeeId');
      const employeeName = searchParams.get('employeeName');
      if (employeeId && employeeName) {
        dispatch({ type: 'SESSION_INIT_SUCCESS', payload: { employee: { id: employeeId, name: employeeName } } });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'セッション情報が不正です。' });
      }
    } else if (!isSessionView && state.appState === 'initial') {
      dispatch({ type: 'START_LOADING' });
      getEmployees().then(data => {
        if (data.length === 0) {
          alert('部下が登録されていません。設定画面で登録してください。');
          navigate('/app/settings');
        } else {
          dispatch({ type: 'FETCH_EMPLOYEES_SUCCESS', payload: data });
        }
      }).catch(err => dispatch({ type: 'SET_ERROR', payload: err.message }));
    }
  }, [state.appState, isSessionView, searchParams, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (state.appState === 'session_ready') {
      const startFlow = async () => {
        dispatch({ type: 'START_CONVERSATION_FLOW' });
        const data = await sendMessage({ message: '__START__' });
        if (data && data.reply) {
          dispatch({ type: 'RECEIVE_THEME_PROMPT', payload: data.reply });
        }
      };
      startFlow();
    }
  }, [state.appState]);

  const handleEmployeeSelect = useCallback(async (employee) => {
    window.open(`/session?employeeId=${employee.id}&employeeName=${encodeURIComponent(employee.name)}`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleThemeSelect = useCallback(async (theme) => {
    dispatch({ type: 'SELECT_THEME', payload: theme });
    try {
      const response = await sendMessageToApi({ textToSend: theme.text, appStateOverride: 'theme_selection' });
      if (response && response.reply && response.conversationId) {
        dispatch({ type: 'RECEIVE_INTERACTION_PROMPT', payload: response });
        const convData = await getConversationById(response.conversationId);
        if (convData.memo) setMemo(convData.memo);
        if (convData.mind_map_data) setMindMapData(convData.mind_map_data);
      } else {
        throw new Error('サーバーから不正な応答がありました。');
      }
    } catch (err) {
      console.error("テーマ選択時のエラー:", err);
    }
  }, [sendMessageToApi]);

  const handleInteractionSelect = useCallback(async (interaction) => {
    dispatch({ type: 'SELECT_INTERACTION', payload: interaction });
    try {
      const response = await sendMessageToApi({ textToSend: interaction.text, appStateOverride: 'engagement_selection' });
      if (response && response.reply) {
        dispatch({ type: 'RECEIVE_SUPPORT_START_PROMPT', payload: response.reply });
      }
    } catch (err) {
      console.error("関わり方選択時のエラー:", err);
    }
  }, [sendMessageToApi]);

  const handleSendFreeMessage = useCallback(async () => {
    if (!message.trim()) return;
    const textToSend = message;
    setMessage('');
    dispatch({ type: 'SEND_MESSAGE', payload: textToSend });
    try {
      const response = await sendMessageToApi({ textToSend, appStateOverride: 'support_started' });
      if (response && response.reply) {
        dispatch({ type: 'RECEIVE_REPLY', payload: response.reply });
      }
    } catch (err) {
      console.error("自由対話メッセージ送信エラー:", err);
    }
  }, [message, sendMessageToApi]);

  const handleGenerateSummary = useCallback(async () => {
    if (!state.currentConversationId) return;
    dispatch({ type: 'START_SUMMARY_GENERATION' });
    try {
      await handleSaveTools();
      const formattedTranscript = transcript.map(item => `${item.speakerTag ? `話者${item.speakerTag}: ` : ''}${item.transcript}`).join('\n');
      const data = await generateSummary(state.currentConversationId, formattedTranscript);
      dispatch({ type: 'SUMMARY_GENERATION_SUCCESS', payload: data });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.currentConversationId, transcript, handleSaveTools]);

  const handleToggleSummary = () => { dispatch({ type: 'TOGGLE_SUMMARY_VISIBILITY' }); };

  if (authLoading || (state.appState === 'initial' && state.isLoading)) {
    return <div className={layoutStyles.loadingScreen}><p>データを読み込み中...</p></div>;
  }

  if (isSessionView) {
    if (state.appState === 'loading' || (state.appState === 'initial' && state.isLoading) || state.appState === 'session_ready') {
      return <div className={styles.sessionLoadingScreen}><p>セッションを準備中です...</p></div>;
    }
    return (
      <div className={styles.sessionViewContainer}>
        <div className={styles.leftPanel}>
          <button onClick={handleGenerateSummary} disabled={state.isGeneratingSummary || !state.currentConversationId} className={styles.summaryButton}>
            {state.isGeneratingSummary ? '要約を生成中...' : '会話を終了して要約'}
          </button>
          <div className={styles.summaryContainer}>
            <div className={styles.summaryToggleHeader} onClick={handleToggleSummary}>
              <h4 className={styles.summaryTitle}>要約とネクストアクション</h4>
              <span className={`${styles.summaryToggleIcon} ${!state.isSummaryVisible ? styles.closed : ''}`}>▼</span>
            </div>
            {state.isSummaryVisible && (
              <div className={styles.collapsibleContent}>
                <div className={styles.summaryArea}>
                  {(state.currentSummary || state.currentNextActions) ? (
                    <>
                      {state.currentSummary && (<> <h5 className={styles.summaryHeader}>会話の要約</h5> <div className={styles.summaryText} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(state.currentSummary)) }} /> </>)}
                      {state.currentNextActions && (<> <h5 className={styles.summaryHeader} style={{ marginTop: '1rem' }}>ネクストアクション</h5> <div className={styles.summaryText} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(state.currentNextActions)) }} /> </>)}
                    </>
                  ) : (<p className={styles.noSummaryText}>まだ要約はありません。</p>)}
                </div>
              </div>
            )}
          </div>
          <div className={styles.chatContainer}>
            <div className={styles.chatWindow}>
              {state.chatHistory.map((chat, index) => (chat.sender !== 'system' && (<div key={index} className={`${styles.message} ${styles[chat.sender]}`}> <strong className={styles.sender}>{chat.sender === 'user' ? 'あなた' : 'AIアシスタント'}:</strong> <div className={styles.text} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(chat.text)) }}></div> </div>)))}
              {state.appState === 'theme_selection' && !state.isLoading && (<SelectionList title="本日の1on1のテーマをお聞かせください" items={THEMES} onSelect={handleThemeSelect} disabled={state.isLoading} />)}
              {state.appState === 'engagement_selection' && !state.isLoading && (<SelectionList title="AIにどのような関わり方を期待しますか？" items={INTERACTIONS} onSelect={handleInteractionSelect} disabled={state.isLoading} />)}
              {state.isLoading && <div className={`${styles.message} ${styles.ai} ${styles.loading}`}><p className={styles.text}>AIが応答を生成中...</p></div>}
              <div ref={messagesEndRef} />
            </div>
            {state.appState === 'support_started' && (<div className={styles.inputArea}> <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendFreeMessage()} placeholder="部下から言われたことなどを入力..." className={styles.normalInput} /> <button onClick={handleSendFreeMessage} disabled={state.isLoading || !message.trim()} className={styles.sendButton}>送信</button> </div>)}
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.sessionControls}>
            <button onClick={handleToggleRecording} className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}>
              {isRecording ? <FiMicOff /> : <FiMic />}
              <span>{isRecording ? (isTranscriptPopupMinimized ? '録音中 (表示)' : '録音停止') : '録音開始'}</span>
            </button>
          </div>
          <div className={styles.workspace}>
            <Tabs activeTab={activeTab} onTabClick={setActiveTab} />
            <div className={styles.tabContent}>
              {activeTab === 'memo' && <Memo memo={memo} setMemo={setMemo} />}
              {activeTab === 'mindmap' && <MindMap mindMapData={mindMapData} setMindMapData={setMindMapData} />}
            </div>
          </div>
        </div>

        <TranscriptPopup
          isVisible={isTranscriptPopupVisible}
          onClose={handleClosePopup}
          onMinimize={handleMinimizePopup}
          transcript={transcript}
          interimTranscript={interimTranscript}
        />
      </div>
    );
  }

  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>新規1on1サポート</h2>
      <p className={layoutStyles.screenDescription}>会話を開始する部下を選択してください。新しいタブでセッションが開始されます。</p>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.employeeSelectionContainer}>
        {state.isLoading && state.appState === 'employee_selection' && <p>読み込み中...</p>}
        {state.appState === 'employee_selection' && (<div className={styles.employeeSelectionGroup}> {state.employees.map(emp => <button key={emp.id} onClick={() => handleEmployeeSelect(emp)} disabled={state.isLoading} className={styles.employeeOptionButton}>{emp.name}</button>)} </div>)}
      </div>
    </div>
  );
}

export default New1on1Support;
