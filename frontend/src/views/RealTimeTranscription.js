// frontend/src/views/RealTimeTranscription.js
import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';
import { saveTranscript } from '../services/conversationService';
import { getEmployees } from '../services/employeeService'; 

const RealTimeTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  // ★ Stateを文字列からオブジェクトの配列に変更
  const [transcript, setTranscript] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        setSaveStatus({ message: '従業員リストの読み込みに失敗しました。', type: 'error' });
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');
    
    // ★ オブジェクトを受け取り、配列に追加する
    socketRef.current.on('transcript_data', (data) => {
      // dataは { speakerTag, transcript }
      setTranscript(prev => [...prev, data]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (socketRef.current) {
          socketRef.current.emit('stop_transcription');
        }
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      setSaveStatus({ message: '', type: '' });
      // ★ 配列を初期化
      setTranscript([]);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
        audioStreamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socketRef.current) {
            socketRef.current.emit('audio_stream', event.data);
          }
        };
        if (socketRef.current) {
          socketRef.current.emit('start_transcription');
        }
        recorder.start(1000); 
        setIsRecording(true);
      } catch (error) {
        console.error('マイクへのアクセスに失敗しました:', error);
        alert('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      }
    }
  };

  const handleSave = async () => {
    // ★ 保存条件を配列の長さに変更
    if (transcript.length === 0 || isRecording || !selectedEmployeeId) return;
    setIsSaving(true);
    setSaveStatus({ message: '', type: '' });
    try {
      // ★ 配列から保存用の文字列を生成
      const formattedTranscript = transcript
        .map(item => `話者${item.speakerTag}: ${item.transcript}\n`)
        .join('');
      
      await saveTranscript(formattedTranscript, selectedEmployeeId);
      setSaveStatus({ message: 'セッションログに保存しました！', type: 'success' });
    } catch (error) {
      console.error('Failed to save transcript:', error);
      setSaveStatus({ message: '保存に失敗しました。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>リアルタイム文字起こし</h2>
        <p>このページで1on1の会話をマイク入力からリアルタイムで文字に起こします。</p>
      </header>
      
      <div className={styles.employeeSelector}>
        <label>対象の従業員:</label>
        <div className={styles.buttonGroup}>
          {employees.map(emp => (
            <button 
              key={emp.id} 
              onClick={() => setSelectedEmployeeId(emp.id)}
              className={`${styles.employeeOptionButton} ${selectedEmployeeId === emp.id ? styles.selected : ''}`}
              disabled={isRecording}
            >
              {emp.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* ★ 表示ロジックを配列のマップに変更 */}
      <div className={styles.transcriptionArea}>
        {transcript.length === 0 && !isRecording && <div className={styles.placeholder}>従業員を選択して、録音を開始してください。</div>}
        {transcript.length === 0 && isRecording && <div className={styles.placeholder}>録音中...</div>}
        {transcript.map((item, index) => (
          <p key={index} className={styles.transcriptLine}>
            <strong className={styles.speakerLabel}>話者{item.speakerTag}:</strong>
            <span>{item.transcript}</span>
          </p>
        ))}
      </div>

      {saveStatus.message && (
        <div className={`${styles.statusMessage} ${styles[saveStatus.type]}`}>
          {saveStatus.message}
        </div>
      )}

      <div className={styles.controls}>
        <button 
          onClick={handleToggleRecording} 
          className={`${styles.actionButton} ${isRecording ? styles.recording : ''}`}
          disabled={!selectedEmployeeId && !isRecording}
        >
          {isRecording ? '録音停止' : '録音開始'}
        </button>

        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={transcript.length === 0 || isRecording || isSaving || !selectedEmployeeId}
        >
          {isSaving ? '保存中...' : 'ログとして保存'}
        </button>
      </div>
    </div>
  );
};

export default RealTimeTranscription;