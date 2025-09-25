import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployees, startConversation, postMessage, generateSummary, updateConversation, deepDive } from '../services';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import layoutStyles from '../App.module.css';
import styles from './New1on1Support.module.css';
import Tabs from '../components/Tabs';
import Memo from '../components/Memo';
import MindMap from '../components/MindMap';
import TranscriptPopup from '../components/TranscriptPopup';
import ThemeToggleButton from '../components/ThemeToggleButton';
import BrainJuiceButton from '../components/BrainJuiceButton';
import { io } from 'socket.io-client';
import { FiMic, FiMicOff, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';

/**
 * ReplyModal
 * - 上司の質問（編集可）＋部下の返答（編集可）の2フィールド
 * - 日本語入力中（isComposing）の Enter は送信しない
 * - Enter で送信 / Shift+Enter で改行
 */
const ReplyModal = ({
  isOpen,
  onClose,
  onSubmit,
  question,
  setQuestion,
  reply,
  setReply,
}) => {
  if (!isOpen) return null;

  const trySubmit = () => {
    if (question.trim() && reply.trim()) onSubmit();
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && e.shiftKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      trySubmit();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalHeader}>上司の質問と部下の返答を入力</h3>

        <div className={styles.modalFieldGroup}>
          <label className={styles.modalLabel}>上司の質問</label>
          <input
            className={styles.modalInput}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例）日常生活で何か困っていることはありますか？"
            autoFocus={!question}
          />
        </div>

        <div className={styles.modalFieldGroup}>
          <label className={styles.modalLabel}>部下の返答</label>
          <textarea
            className={styles.modalTextarea}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例）睡眠が不規則で朝のパフォーマンスが落ちています。"
            rows={6}
            autoFocus={!!question}
          />
          <p className={styles.modalHint}>
            Enterで送信、Shift+Enterで改行。
          </p>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.modalButtonCancel}>キャンセル</button>
          <button
            onClick={trySubmit}
            disabled={!question.trim() || !reply.trim()}
            className={styles.modalButtonSubmit}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * SafetyChecklistModal
 * - 新規セッション開始時に表示される「安全宣言チェック」ポップアップ
 * - 4項目すべてにチェック → 右下のボタンが有効化
 * - チェック操作にアニメーション
 */
const SafetyChecklistModal = ({ open, onConfirm }) => {
  const [checks, setChecks] = useState([false, false, false, false]);
  const allChecked = checks.every(Boolean);

  const toggle = (idx) => {
    setChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  if (!open) return null;

  return (
    <div className={styles.checklistOverlay}>
      <div className={styles.checklistModal} role="dialog" aria-modal="true" aria-labelledby="safetyChecklistTitle">
        <h3 id="safetyChecklistTitle" className={styles.checklistTitle}>1on1 セッション前の安全宣言</h3>
        <p className={styles.checklistLead}>
          次の宣言に同意し、チェックを入れてから会話を始める。
        </p>

        <ul className={styles.checklistItems}>
          {[
            'これは評価の場ではない（安心して話せる環境を作る）',
            '上司は否定しない（ネガティブな意見も受け止める）',
            '上司は傾聴を大事にする（真剣に耳を傾ける）',
            '難しく考えすぎないこと（聴くことに集中する、必要なのは愛）',
          ].map((text, i) => (
            <li key={i} className={styles.checkItem}>
              <label className={styles.checkboxWrap}>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={() => toggle(i)}
                />
                <span className={styles.fancyCheckbox}>
                  <svg viewBox="0 0 24 24" className={styles.checkIcon} aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={styles.checkText}>{text}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className={styles.checklistNote}>
          上司側は、部下が話をしても良いんだという環境づくりを徹底して守ります。
        </div>

        <div className={styles.checklistActions}>
          <button
            className={styles.startButton}
            disabled={!allChecked}
            onClick={onConfirm}
            aria-disabled={!allChecked}
            title={allChecked ? '会話を始める' : 'すべてにチェックを入れてください'}
          >
            会話を始める
          </button>
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
  const [isVoiceInputAvailable, setIsVoiceInputAvailable] = useState(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [voiceInputError, setVoiceInputError] = useState('');

  const memoAutoSaveTimeoutRef = useRef(null);
  const lastSavedMemoRef = useRef('');
  const memoValueRef = useRef('');
  const [memoSaveState, setMemoSaveState] = useState('idle');
  const [memoSaveError, setMemoSaveError] = useState('');

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const voiceRecognitionRef = useRef(null);
  const resumeTranscriptAfterVoiceRef = useRef(false);
  const isComponentMountedRef = useRef(true);

  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [employeeReply, setEmployeeReply] = useState('');

  const [showChecklist, setShowChecklist] = useState(false); // ★ 追加: 安全宣言ポップアップ

  const isSessionView = location.pathname === '/session';

  // 深掘り（要約/ネクストアクション）用の状態はコンポーネント直下で宣言（Hooks順序を守る）
  const [isDeepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState('');
  const [deepDiveContent, setDeepDiveContent] = useState('');
  const [deepDiveAnchor, setDeepDiveAnchor] = useState('');
  const [deepDivePosition, setDeepDivePosition] = useState({ top: 0, left: 0 });
  const [deepDivePlacement, setDeepDivePlacement] = useState('bottom'); // 'bottom' | 'top'
  const deepDiveRef = useRef(null);
  const [deepDiveAnchorEl, setDeepDiveAnchorEl] = useState(null);
  const scrollParentRef = useRef(null);

  // 脳汁ボタンの沈黙状態（必要ならUI制御に利用可）
  const [isSilenceActive, setIsSilenceActive] = useState(false);

  const getScrollParent = (element) => {
    if (!element) return null;
    let el = element.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return el;
      el = el.parentElement;
    }
    return null;
  };

  useEffect(() => {
    isComponentMountedRef.current = true;
    if (typeof window === 'undefined') return undefined;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsVoiceInputAvailable(Boolean(SpeechRecognition));

    return () => {
      isComponentMountedRef.current = false;
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.stop();
        } catch (err) {
          // no-op
        }
        voiceRecognitionRef.current = null;
      }
      resumeTranscriptAfterVoiceRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (state.appState === 'support_started' || !isVoiceInputActive) return;
    resumeTranscriptAfterVoiceRef.current = false;
    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop voice input on state change:', err);
      }
    }
  }, [isVoiceInputActive, state.appState]);

  const positionPopover = useCallback((anchorEl) => {
    if (!anchorEl) return { top: 0, left: 0, placement: 'bottom' };
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = 360;
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const preferred = spaceBelow >= 180 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
    const left = Math.min(Math.max(rect.left, margin), viewportWidth - popoverWidth - margin);
    const top = preferred === 'bottom' ? Math.min(rect.bottom + 8, viewportHeight - margin) : Math.max(rect.top - 8, margin);
    return { top, left, placement: preferred };
  }, []);

  // ポップオーバー: 外側クリックやEscで閉じる
  useEffect(() => {
    if (!isDeepDiveOpen) return;
    const onDocMouseDown = (e) => {
      if (deepDiveRef.current && !deepDiveRef.current.contains(e.target)) {
        setDeepDiveOpen(false);
      }
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setDeepDiveOpen(false); };
    let rafId = null;
    const onReposition = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const pos = positionPopover(deepDiveAnchorEl);
        setDeepDivePosition({ top: pos.top, left: pos.left });
        setDeepDivePlacement(pos.placement);
      });
    };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReposition, { passive: true });
    window.addEventListener('resize', onReposition);
    const sp = scrollParentRef.current;
    if (sp) sp.addEventListener('scroll', onReposition, { passive: true });
    onReposition();
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReposition);
      window.removeEventListener('resize', onReposition);
      if (sp) sp.removeEventListener('scroll', onReposition);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isDeepDiveOpen, deepDiveAnchorEl, positionPopover]);

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
    const backendUrl = '';
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

  const cleanupVoiceRecognition = useCallback((resume = true) => {
    const shouldResume = resume && resumeTranscriptAfterVoiceRef.current;
    resumeTranscriptAfterVoiceRef.current = false;

    if (isComponentMountedRef.current) {
      setIsVoiceInputActive(false);
      setVoiceInterimText('');
    }
    voiceRecognitionRef.current = null;

    if (shouldResume && isComponentMountedRef.current) {
      setIsTranscriptPopupVisible(true);
      setIsTranscriptPopupMinimized(false);
      setIsRecording(true);
      startRecording();
    }
  }, [startRecording]);

  const handleToggleVoiceInput = useCallback(() => {
    if (isVoiceInputActive) {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.stop();
        } catch (err) {
          console.error('Failed to stop voice input:', err);
        }
      }
      return;
    }

    if (!isVoiceInputAvailable || typeof window === 'undefined') {
      setVoiceInputError('このブラウザでは音声入力を利用できません。');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceInputError('このブラウザでは音声入力を利用できません。');
      return;
    }

    setVoiceInputError('');
    resumeTranscriptAfterVoiceRef.current = isRecording;

    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcriptText = result[0]?.transcript?.trim();
          if (!transcriptText) continue;
          if (result.isFinal) {
            finalText += `${transcriptText} `;
          } else {
            interim += `${transcriptText} `;
          }
        }

        const trimmedFinal = finalText.trim();
        if (trimmedFinal) {
          setMessage((prev) => {
            if (!prev) return trimmedFinal;
            const needsSpace = !prev.endsWith(' ') && !/^([、。,.!?])/.test(trimmedFinal);
            return `${prev}${needsSpace ? ' ' : ''}${trimmedFinal}`;
          });
        }

        setVoiceInterimText(interim.trim());
      };

      recognition.onerror = (event) => {
        console.error('Voice input error:', event);
        const errorMessage = event.error === 'not-allowed'
          ? 'マイクの使用が許可されませんでした。ブラウザの設定を確認してください。'
          : event.error === 'no-speech'
            ? '音声が検出できませんでした。もう一度お試しください。'
            : '音声入力中にエラーが発生しました。';
        setVoiceInputError(errorMessage);
        try {
          recognition.stop();
        } catch (err) {
          // ignore stop error
        }
      };

      recognition.onend = () => {
        cleanupVoiceRecognition(true);
      };

      voiceRecognitionRef.current = recognition;
      setIsVoiceInputActive(true);
      setVoiceInterimText('');
      recognition.start();
    } catch (error) {
      console.error('Failed to start voice input:', error);
      setVoiceInputError('音声入力を開始できませんでした。');
      cleanupVoiceRecognition(true);
    }
  }, [cleanupVoiceRecognition, isRecording, isVoiceInputActive, isVoiceInputAvailable, setMessage, startRecording, stopRecording]);

  const persistMemo = useCallback(async (nextMemo) => {
    if (!state.currentConversationId) return;
    setMemoSaveState('saving');
    setMemoSaveError('');
    try {
      await updateConversation(state.currentConversationId, { memo: nextMemo });
      lastSavedMemoRef.current = nextMemo;
      setMemoSaveState('saved');
    } catch (err) {
      console.error('Failed to auto-save memo', err);
      setMemoSaveState('error');
      setMemoSaveError(err.message || 'メモの自動保存に失敗しました。');
    }
  }, [state.currentConversationId]);

  const handleSaveTools = useCallback(async () => {
    if (!state.currentConversationId) return;
    if (memoAutoSaveTimeoutRef.current) {
      clearTimeout(memoAutoSaveTimeoutRef.current);
      memoAutoSaveTimeoutRef.current = null;
    }
    setMemoSaveState('saving');
    setMemoSaveError('');
    try {
      const formattedTranscript = transcript.map(item => `${item.speakerTag ? `話者${item.speakerTag}: ` : ''}${item.transcript}`).join('\n');
      await updateConversation(state.currentConversationId, {
        memo,
        mindMapData,
        transcript: formattedTranscript
      });
      lastSavedMemoRef.current = memo;
      setMemoSaveState('saved');
    } catch (err) {
      console.error("Failed to save tools data", err);
      setMemoSaveState('error');
      setMemoSaveError(err?.message || 'メモの保存に失敗しました。');
      alert("メモとマインドマップの保存に失敗しました。");
    }
  }, [state.currentConversationId, memo, mindMapData, transcript]);

  useEffect(() => {
    memoValueRef.current = memo;
  }, [memo]);

  useEffect(() => {
    if (!state.currentConversationId) return;
    if (memo === lastSavedMemoRef.current) return;

    if (memoAutoSaveTimeoutRef.current) {
      clearTimeout(memoAutoSaveTimeoutRef.current);
    }

    setMemoSaveState('saving');
    setMemoSaveError('');

    memoAutoSaveTimeoutRef.current = setTimeout(() => {
      memoAutoSaveTimeoutRef.current = null;
      persistMemo(memo);
    }, 1200);

    return () => {
      if (memoAutoSaveTimeoutRef.current) {
        clearTimeout(memoAutoSaveTimeoutRef.current);
        memoAutoSaveTimeoutRef.current = null;
      }
    };
  }, [memo, persistMemo, state.currentConversationId]);

  useEffect(() => {
    if (memoAutoSaveTimeoutRef.current) {
      clearTimeout(memoAutoSaveTimeoutRef.current);
      memoAutoSaveTimeoutRef.current = null;
    }
    lastSavedMemoRef.current = memoValueRef.current;
    setMemoSaveState('idle');
    setMemoSaveError('');
  }, [state.currentConversationId]);

  useEffect(() => () => {
    if (memoAutoSaveTimeoutRef.current) {
      clearTimeout(memoAutoSaveTimeoutRef.current);
      memoAutoSaveTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (isSessionView && state.appState === 'initial') {
      const employeeId = searchParams.get('employeeId');
      const employeeName = searchParams.get('employeeName');
      if (employeeId && employeeName) {
        dispatch({ type: 'SESSION_INIT_SUCCESS', payload: { employee: { id: employeeId, name: employeeName } } });
        setShowChecklist(true); // ★ セッション初期化時に安全宣言ポップアップ表示
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
    if (showChecklist) return; // ★ チェックリスト完了前は選択不可
    dispatch({ type: 'SELECT_THEME', payload: theme });
  }, [showChecklist]);

  const handleInteractionSelect = useCallback(async (interaction) => {
    if (showChecklist) return; // ★ チェックリスト完了前は選択不可
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
  }, [state.currentEmployee, state.selectedTheme, showChecklist]);

  const handleSuggestionClick = (question) => {
    const isOther = question?.startsWith('その他');
    setSelectedQuestion(isOther ? '' : question || '');
    setIsReplyModalOpen(true);
  };

  const handleSubmitReply = useCallback(async () => {
    if (!selectedQuestion.trim() || !employeeReply.trim() || !state.currentConversationId) return;

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

  const handleFreeMessageKeyDown = (e) => {
    if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendFreeMessage();
    }
  };

  // 要約/ネクストアクションのクリックテキスト抽出と深掘り実行
  const extractClickedText = (event) => {
    try {
      const sel = window.getSelection ? window.getSelection() : null;
      // 明示選択があればそれを優先
      const selected = sel && sel.toString().trim();
      if (selected) return selected.slice(0, 400);
      // キャレット位置の文を抽出
      if (sel && sel.focusNode) {
        const node = sel.focusNode;
        const source = node.nodeType === 3 ? node.nodeValue : (node.textContent || '');
        const offset = typeof sel.focusOffset === 'number' ? sel.focusOffset : 0;
        const len = source.length;
        const isDelim = (ch) => /[。．\.！？!？\?]/.test(ch) || ch === '\n';
        let start = 0;
        for (let i = Math.max(0, offset - 1); i >= 0; i--) {
          if (isDelim(source[i])) { start = i + 1; break; }
        }
        let end = len;
        for (let i = Math.min(len - 1, offset); i < len; i++) {
          if (isDelim(source[i])) { end = i + 1; break; }
        }
        const sentence = source.slice(start, end).trim();
        if (sentence) return sentence.slice(0, 600);
      }
    } catch (_) { }
    const target = event.target;
    if (!target) return '';
    const text = (target.innerText || target.textContent || '').trim();
    return text ? text.slice(0, 600) : '';
  };

  const handleSummaryClick = async (event) => {
    const queryText = extractClickedText(event);
    if (!queryText) return;
    if (!state.currentConversationId) return;
    const anchorEl = event.currentTarget || event.target;
    setDeepDiveAnchorEl(anchorEl);
    // スクロール親を記録
    scrollParentRef.current = getScrollParent(anchorEl);
    // 初回配置
    const pos = positionPopover(anchorEl);
    setDeepDivePosition({ top: pos.top, left: pos.left });
    setDeepDivePlacement(pos.placement);
    setDeepDiveAnchor(queryText);
    setDeepDiveOpen(true);
    setDeepDiveLoading(true);
    setDeepDiveError('');
    setDeepDiveContent('');
    try {
      const res = await deepDive(state.currentConversationId, queryText);
      setDeepDiveContent(res.explanation || '');
    } catch (err) {
      setDeepDiveError(err.message || '説明の生成に失敗しました。');
    } finally {
      setDeepDiveLoading(false);
    }
  };

  if (authLoading || (state.appState === 'initial' && state.isLoading)) {
    return <div className={layoutStyles.loadingScreen}><p>データを読み込み中...</p></div>;
  }

  if (isSessionView) {
    return (
      <>
        <SafetyChecklistModal
          open={showChecklist}
          onConfirm={() => setShowChecklist(false)}
        />

        <ReplyModal
          isOpen={isReplyModalOpen}
          onClose={() => setIsReplyModalOpen(false)}
          onSubmit={handleSubmitReply}
          question={selectedQuestion}
          setQuestion={setSelectedQuestion}
          reply={employeeReply}
          setReply={setEmployeeReply}
        />
        <div className={styles.sessionViewContainer} aria-hidden={showChecklist}>
          <div className={styles.leftPanel}>
            <div className={styles.sessionHeader}>
              <button onClick={handleGenerateSummary} disabled={state.isGeneratingSummary || !state.currentConversationId} className={styles.summaryButton}>
                {state.isGeneratingSummary ? '要約を生成中...' : '会話を終了して要約'}
              </button>
              {state.appState === 'support_started' && (
                <button onClick={() => dispatch({ type: 'RESET_TO_THEME_SELECTION' })} className={styles.changeThemeButton} disabled={showChecklist}>
                  <FiRefreshCw />
                  <span>テーマを変更</span>
                </button>
              )}
              {/* 脳汁ボタン：小型アイコン＋15秒沈黙タイマー */}
              
              <BrainJuiceButton
                movable
                storageKey="brainjuice_pos"
                onStartSilence={() => setIsSilenceActive(true)}
                onEndSilence={() => setIsSilenceActive(false)}
              />

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
                        {/* ★ 注意書きを上（目立つ帯）に移動 */}
                        <div className={styles.summaryAlert} role="note" aria-live="polite">
                          <FiAlertTriangle className={styles.summaryAlertIcon} />
                          <div>
                            <strong>AI生成に関する注意</strong>
                            <div className={styles.summaryAlertBody}>
                              この要約はチャットの内容と録音の文字起こしを元に生成しております。文字起こしが不正確な場合があるため、内容に違いが生じることがあります。<br />
                              操作ヒント: 要約やネクストアクション内の気になる語句・文をクリックすると、その内容を深掘りした説明をポップオーバーで表示します。文を範囲選択してからクリックすると、より的確に深掘りできます。
                            </div>
                          </div>
                        </div>

                        {state.currentSummary && (
                          <>
                            <h5 className={styles.summaryHeader}>会話の要約</h5>
                            <div className={styles.summaryText} onClick={handleSummaryClick} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(state.currentSummary)) }} />
                          </>
                        )}
                        {state.currentNextActions && (
                          <>
                            <h5 className={styles.summaryHeader} style={{ marginTop: '1rem' }}>ネクストアクション</h5>
                            <div className={styles.summaryText} onClick={handleSummaryClick} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(state.currentNextActions)) }} />
                          </>
                        )}

                        {isDeepDiveOpen && (
                          <div
                            ref={deepDiveRef}
                            className={`${styles.deepDivePopover} ${deepDivePlacement === 'top' ? styles.top : styles.bottom}`}
                            style={{ top: deepDivePosition.top, left: deepDivePosition.left }}
                            role="dialog"
                            aria-label="深掘り説明"
                          >
                            <div className={styles.deepDiveHeader}>
                              <span className={styles.deepDiveTitle}>深掘り</span>
                              <button className={styles.deepDiveClose} onClick={() => setDeepDiveOpen(false)}>✕</button>
                            </div>
                            {deepDiveAnchor && (
                              <p className={styles.deepDiveAnchor}><strong>対象:</strong> {deepDiveAnchor}</p>
                            )}
                            {deepDiveLoading ? (
                              <p className={styles.deepDiveLoading}>深掘り中...</p>
                            ) : deepDiveError ? (
                              <p className={styles.deepDiveError}>{deepDiveError}</p>
                            ) : deepDiveContent ? (
                              <div className={styles.deepDiveBody} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(deepDiveContent)) }} />
                            ) : null}
                            <span className={`${styles.deepDiveArrow} ${deepDivePlacement === 'top' ? styles.top : styles.bottom}`} aria-hidden="true" />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className={styles.noSummaryText}>まだ要約はありません。</p>
                    )}
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
                          <button key={i} onClick={() => handleSuggestionClick(q)} className={styles.suggestionButton} disabled={showChecklist}>
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {state.appState === 'theme_selection' && !state.isLoading && (
                  <SelectionList title="本日の1on1のテーマをお聞かせください" items={THEMES} onSelect={handleThemeSelect} disabled={state.isLoading || showChecklist} />
                )}
                {state.appState === 'interaction_selection' && !state.isLoading && (
                  <SelectionList title="どのような関わり方を期待しますか？" items={INTERACTIONS} onSelect={handleInteractionSelect} disabled={state.isLoading || showChecklist} />
                )}
                {state.isLoading && <div className={`${styles.message} ${styles.ai} ${styles.loading}`}><p className={styles.text}>AIが応答を生成中...</p></div>}
                <div ref={messagesEndRef} />
              </div>
              {state.appState === 'support_started' && (
                <>
                  <div className={styles.inputArea}>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleFreeMessageKeyDown}
                      placeholder="部下への質問を自由に入力...（Shift+Enterで改行、Enterで送信）"
                      className={styles.normalInput}
                      rows="1"
                      disabled={showChecklist}
                    />
                    <div className={styles.inputButtons}>
                      <button
                        type="button"
                        onClick={handleToggleVoiceInput}
                        className={`${styles.voiceButton} ${isVoiceInputActive ? styles.voiceButtonActive : ''}`}
                        disabled={!isVoiceInputAvailable || state.isLoading || showChecklist}
                        aria-pressed={isVoiceInputActive}
                        title={isVoiceInputAvailable ? '音声で質問を入力します' : 'このブラウザでは音声入力を利用できません。'}
                      >
                        {isVoiceInputActive ? <FiMicOff className={styles.voiceIcon} /> : <FiMic className={styles.voiceIcon} />}
                        <span>{isVoiceInputActive ? '音声入力停止' : '音声入力'}</span>
                      </button>
                      <button
                        onClick={handleSendFreeMessage}
                        disabled={state.isLoading || !message.trim() || showChecklist}
                        className={styles.sendButton}
                      >
                        質問する
                      </button>
                    </div>
                  </div>
                  {(isVoiceInputActive || voiceInterimText || voiceInputError) && (
                    <div className={styles.voiceStatusRow} role="status" aria-live="polite">
                      {isVoiceInputActive && <span className={styles.voiceStatusActive}>音声入力中...</span>}
                      {voiceInterimText && <span className={styles.voiceInterimText}>{voiceInterimText}</span>}
                      {voiceInputError && <span className={styles.voiceStatusError}>{voiceInputError}</span>}
                    </div>
                  )}
                  {!isVoiceInputAvailable && !voiceInputError && (
                    <div className={styles.voiceStatusRow}>
                      <span className={styles.voiceStatusNotice}>このブラウザは音声入力に対応していません。</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.sessionControls}>
              <button onClick={handleToggleRecording} className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`} disabled={showChecklist || isVoiceInputActive}>
                {isRecording ? <FiMicOff className={styles.micIcon} /> : <FiMic className={styles.micIcon} />}
                <span>{isRecording ? (isTranscriptPopupMinimized ? '録音中 (表示)' : '録音停止') : '録音開始'}</span>
              </button>
            </div>
            <div className={styles.workspace}>
              <Tabs activeTab={activeTab} onTabClick={setActiveTab} />
              <div className={styles.tabContent}>
                {activeTab === 'memo' && <Memo memo={memo} setMemo={setMemo} saveState={memoSaveState} errorMessage={memoSaveError} />}
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
        {state.appState === 'employee_selection' && (
          <div className={styles.employeeSelectionGroup}>
            {state.employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => handleEmployeeSelect(emp)}
                disabled={state.isLoading}
                className={styles.employeeOptionButton}
              >
                {emp.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default New1on1Support;
