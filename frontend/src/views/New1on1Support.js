import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployees, startConversation, postMessage, generateSummary, updateConversation } from '../services';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import layoutStyles from '../App.module.css';
import styles from './New1on1Support.module.css';
import Tabs from '../components/Tabs';
import Memo from '../components/Memo';
import MindMap from '../components/MindMap';
import TranscriptPopup from '../components/TranscriptPopup';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { io } from 'socket.io-client';
import { FiMic, FiMicOff, FiRefreshCw } from 'react-icons/fi';

// ★★★ 修正点: ポップアップの文言変更とキーボードイベント処理を追加 ★★★
const ReplyModal = ({ isOpen, onClose, onSubmit, question, reply, setReply }) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    // Shift + Enterで改行を許可
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }
    // Enterキーで送信
    if (e.key === 'Enter') {
      e.preventDefault();
      if (reply.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalHeader}>部下の返答を入力</h3>
        <div className={styles.modalQuestionSection}>
          {/* 文言を「上司の質問」に変更 */}
          <p className={styles.modalQuestionLabel}>上司の質問:</p>
          <p className={styles.modalQuestionText}>{question}</p>
        </div>
        <textarea
          className={styles.modalTextarea}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="部下の返答をここに入力してください... (Shift+Enterで改行)"
          autoFocus
        />
        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.modalButtonCancel}>キャンセル</button>
          <button onClick={onSubmit} disabled={!reply.trim()} className={styles.modalButtonSubmit}>送信</button>
        </div>
      </div>
    </div>
  );
};

// (以降の定数やコンポーネントは変更なし)
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
const initialNodes = [
  { id: '1', type: 'default', data: { label: '中心テーマ' }, position: { x: 250, y: 150 } },
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
    case 'SESSION_INIT_SUCCESS': return { ...state, isLoading: false, appState: 'theme_selection', currentEmployee: action.payload.employee };
    case 'SELECT_THEME': return { ...state, selectedTheme: action.payload, chatHistory: [...state.chatHistory, { sender: 'user', message: action.payload.text }], appState: 'interaction_selection' };
    case 'SELECT_INTERACTION': return { ...state, isLoading: true, selectedInteraction: action.payload, chatHistory: [...state.chatHistory, { sender: 'user', message: action.payload.text }] };
    case 'START_CONVERSATION_SUCCESS': return { ...state, isLoading: false, appState: 'support_started', currentConversationId: action.payload.conversationId, chatHistory: [...state.chatHistory, action.payload.initialMessage] };
    case 'ADD_MESSAGES_TO_HISTORY': return { ...state, isLoading: true, chatHistory: [...state.chatHistory, ...action.payload] };
    case 'RECEIVE_REPLY': return { ...state, isLoading: false, chatHistory: [...state.chatHistory, action.payload] };
    case 'START_SUMMARY_GENERATION': return { ...state, isGeneratingSummary: true };
    case 'SUMMARY_GENERATION_SUCCESS': return { ...state, isGeneratingSummary: false, currentSummary: action.payload.summary, currentNextActions: action.payload.nextActions, isSummaryVisible: true, };
    case 'TOGGLE_SUMMARY_VISIBILITY': return { ...state, isSummaryVisible: !state.isSummaryVisible };
    case 'RESET_TO_THEME_SELECTION': return { ...state, appState: 'theme_selection', selectedTheme: null, selectedInteraction: null, chatHistory: state.chatHistory.slice(0, 1) };
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

  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [employeeReply, setEmployeeReply] = useState('');

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

  const handleEmployeeSelect = useCallback(async (employee) => {
    window.open(`/session?employeeId=${employee.id}&employeeName=${encodeURIComponent(employee.name)}`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleThemeSelect = useCallback((theme) => {
    dispatch({ type: 'SELECT_THEME', payload: theme });
  }, []);

  const handleInteractionSelect = useCallback(async (interaction) => {
    dispatch({ type: 'SELECT_INTERACTION', payload: interaction });
    try {
      const response = await startConversation({
        employeeId: state.currentEmployee.id,
        employeeName: state.currentEmployee.name,
        theme: state.selectedTheme.text,
        stance: interaction.text,
      });
      dispatch({ type: 'START_CONVERSATION_SUCCESS', payload: response });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.currentEmployee, state.selectedTheme]);

  const handleSuggestionClick = (question) => {
    if (question === 'その他（自由に質問する）') {
      setMessage("（部下への質問を自由に入力してください）");
    } else {
      setSelectedQuestion(question);
      setIsReplyModalOpen(true);
    }
  };

  const handleSubmitReply = useCallback(async () => {
    if (!employeeReply.trim() || !selectedQuestion || !state.currentConversationId) return;

    setIsReplyModalOpen(false);

    dispatch({
      type: 'ADD_MESSAGES_TO_HISTORY', payload: [
        { sender: 'user', message: selectedQuestion },
        { sender: 'employee', message: employeeReply }
      ]
    });

    try {
      const response = await postMessage(state.currentConversationId, { sender: 'employee', message: employeeReply });
      dispatch({ type: 'RECEIVE_REPLY', payload: response });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      setEmployeeReply('');
      setSelectedQuestion('');
    }
  }, [employeeReply, selectedQuestion, state.currentConversationId]);

  const handleSendFreeMessage = useCallback(async () => {
    if (!message.trim()) return;
    if (!state.currentConversationId) {
      alert("セッションが開始されていません。テーマと関わり方を選択してください。");
      return;
    }
    const textToSend = message;
    setMessage('');
    dispatch({ type: 'ADD_MESSAGES_TO_HISTORY', payload: [{ sender: 'user', message: textToSend }] });
    setSelectedQuestion(textToSend);
    setIsReplyModalOpen(true);
  }, [message, state.currentConversationId]);

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

  // ★★★ 修正点: チャット入力欄のキーボードイベント処理 ★★★
  const handleFreeMessageKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendFreeMessage();
    }
  };

  if (authLoading || (state.appState === 'initial' && state.isLoading)) {
    return <div className={layoutStyles.loadingScreen}><p>データを読み込み中...</p></div>;
  }

  if (isSessionView) {
    return (
      <>
        <ReplyModal
          isOpen={isReplyModalOpen}
          onClose={() => setIsReplyModalOpen(false)}
          onSubmit={handleSubmitReply}
          question={selectedQuestion}
          reply={employeeReply}
          setReply={setEmployeeReply}
        />
        <div className={styles.sessionViewContainer}>
          <div className={styles.leftPanel}>
            <div className={styles.sessionHeader}>
              <button onClick={handleGenerateSummary} disabled={state.isGeneratingSummary || !state.currentConversationId} className={styles.summaryButton}>
                {state.isGeneratingSummary ? '要約を生成中...' : '会話を終了して要約'}
              </button>
              {state.appState === 'support_started' && (
                <button onClick={() => dispatch({ type: 'RESET_TO_THEME_SELECTION' })} className={styles.changeThemeButton}>
                  <FiRefreshCw />
                  <span>テーマを変更</span>
                </button>
              )}
            </div>
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
                {state.chatHistory.map((chat, index) => (
                  <div key={index} className={`${styles.message} ${styles[chat.sender]}`}>
                    <strong className={styles.sender}>{chat.sender === 'user' ? 'あなた' : (chat.sender === 'employee' ? state.currentEmployee?.name || '部下' : 'AIアシスタント')}:</strong>
                    <div className={styles.text} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(chat.message)) }}></div>
                    {chat.sender === 'ai' && chat.suggested_questions && (
                      <div className={styles.suggestions}>
                        {chat.suggested_questions.map((q, i) => (
                          <button key={i} onClick={() => handleSuggestionClick(q)} className={styles.suggestionButton}>
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {state.appState === 'theme_selection' && !state.isLoading && (<SelectionList title="本日の1on1のテーマをお聞かせください" items={THEMES} onSelect={handleThemeSelect} disabled={state.isLoading} />)}
                {state.appState === 'interaction_selection' && !state.isLoading && (<SelectionList title="AIにどのような関わり方を期待しますか？" items={INTERACTIONS} onSelect={handleInteractionSelect} disabled={state.isLoading} />)}
                {state.isLoading && <div className={`${styles.message} ${styles.ai} ${styles.loading}`}><p className={styles.text}>AIが応答を生成中...</p></div>}
                <div ref={messagesEndRef} />
              </div>
              {state.appState === 'support_started' && (
                <div className={styles.inputArea}>
                  {/* ★★★ 修正点: inputをtextareaに変更し、キーイベントを追加 ★★★ */}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleFreeMessageKeyDown}
                    placeholder="部下への質問を自由に入力... (Shift+Enterで改行)"
                    className={styles.normalInput}
                    rows="1"
                  />
                  <button onClick={handleSendFreeMessage} disabled={state.isLoading || !message.trim()} className={styles.sendButton}>質問する</button>
                </div>
              )}
            </div>
          </div>
          <div className={styles.rightPanel}>
            <div className={styles.sessionControls}>
              <button onClick={handleToggleRecording} className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}>
                {isRecording ? <FiMicOff className={styles.micIcon} /> : <FiMic className={styles.micIcon} />}
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
          <ThemeToggleButton className={styles.themeToggle} />
        </div>
      </>
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
