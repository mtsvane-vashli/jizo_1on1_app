// frontend/src/views/RealTimeTranscription.js
import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';
import { saveTranscript } from '../services/conversationService';
import { getEmployees } from '../services/employeeService'; 

const RealTimeTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
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
    socketRef.current.on('transcript_data', (data) => {
      setTranscript(prev => prev === '録音中...' ? data : prev + data);
    });
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      setSaveStatus({ message: '', type: '' });
      setTranscript('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socketRef.current) {
            socketRef.current.emit('audio_stream', event.data);
          }
        };
        recorder.start(1000);
        setIsRecording(true);
        setTranscript('録音中...');
      } catch (error) {
        console.error('マイクへのアクセスに失敗しました:', error);
        alert('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      }
    }
  };

  const handleSave = async () => {
    if (!transcript || isRecording || !selectedEmployeeId) return;
    setIsSaving(true);
    setSaveStatus({ message: '', type: '' });
    try {
      await saveTranscript(transcript, selectedEmployeeId);
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
              onClick={() => {
                setSelectedEmployeeId(emp.id);
              }}
              className={`${styles.employeeOptionButton} ${selectedEmployeeId === emp.id ? styles.selected : ''}`}
              disabled={isRecording}
            >
              {emp.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className={styles.transcriptionArea}>
        <div className={transcript ? styles.content : styles.placeholder}>
          {transcript || '従業員を選択して、録音を開始してください。'}
        </div>
      </div>

      {saveStatus.message && (
        <div className={`${styles.statusMessage} ${styles[saveStatus.type]}`}>
          {saveStatus.message}
        </div>
      )}

      <div className={styles.controls}>
        {/* ★★★ 変更点1 ★★★ */}
        {/* 従業員が選択されるまで、または録音中はボタンを無効化 */}
        <button 
          onClick={handleToggleRecording} 
          className={`${styles.actionButton} ${isRecording ? styles.recording : ''}`}
          disabled={isRecording ? false : !selectedEmployeeId}
        >
          {isRecording ? '録音停止' : '録音開始'}
        </button>

        {/* ★★★ 変更点2 ★★★ */}
        {/* 従業員が選択されていないと保存ボタンも無効化 */}
        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={!transcript || transcript === '録音中...' || isRecording || isSaving || !selectedEmployeeId}
        >
          {isSaving ? '保存中...' : 'ログとして保存'}
        </button>
      </div>
    </div>
  );
};

export default RealTimeTranscription;