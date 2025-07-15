// frontend/src/views/RealTimeTranscription.js

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';

// --- SVG Icons ---
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
);

const MicOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"></line><path d="M18.5 10.5c0 1.9-1 3.6-2.5 4.5"></path><path d="M12.5 18.5a7 7 0 0 0 7-7"></path><path d="M5 10v2a7 7 0 0 0 7 7"></path><path d="M5 5a3 3 0 0 0-3 3v2"></path><path d="M12 2a3 3 0 0 0-3 3v7"></path></svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
);
// --- End of SVG Icons ---

const RealTimeTranscription = ({ isRecording, onToggleRecording, transcript, onTranscriptUpdate, employeeName }) => {
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);
  const streamRestartIntervalRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // ★修正: onToggleRecording を useRef でラップし、useCallback内から常に最新の関数を参照できるようにする
  const onToggleRecordingRef = useRef(onToggleRecording);
  useEffect(() => {
    onToggleRecordingRef.current = onToggleRecording;
  }, [onToggleRecording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');
    socketRef.current.on('transcript_data', onTranscriptUpdate);
    socketRef.current.on('connect_error', (err) => {
      setError(`サーバーへの接続に失敗しました: ${err.message}`);
      setStatus('error');
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onTranscriptUpdate]);

  // ★修正: useCallbackの依存配列を空にし、UIの再レンダリングによる関数の再生成を防ぐ
  const stopRecording = useCallback(() => {
    if (streamRestartIntervalRef.current) {
      clearInterval(streamRestartIntervalRef.current);
      streamRestartIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('end_transcription');
    }
    setStatus('idle');
  }, []);

  // ★修正: useCallbackの依存配列を空にし、UIの再レンダリングによる関数の再生成を防ぐ
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
      audioStreamRef.current = stream;

      if (socketRef.current) {
        socketRef.current.emit('start_transcription');
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
          socketRef.current.emit('audio_stream', event.data);
        }
      };
      
      recorder.onstart = () => {
        setStatus('recording');
        setError('');
      };
      
      recorder.onerror = (event) => {
        setStatus('error');
        setError(`録音中にエラーが発生しました: ${event.error.message}`);
        onToggleRecordingRef.current(); // エラー時に録音を停止
      };

      recorder.start(1000);

    } catch (err) {
      console.error('マイクへのアクセスに失敗しました:', err);
      setError('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      setStatus('error');
      onToggleRecordingRef.current(); // エラー時に録音を停止
    }
  }, []); // 依存配列を空に

  // ★修正: useEffectの依存配列をisRecordingのみにし、ロジックの実行をisRecordingの変更時のみに限定
  useEffect(() => {
    const restartStream = () => {
      stopRecording();
      setTimeout(startRecording, 500);
    };

    if (isRecording) {
      startRecording();
      streamRestartIntervalRef.current = setInterval(restartStream, 240000);
    } else {
      stopRecording();
    }

    return () => {
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const getStatusIndicator = () => {
    if (status === 'error') {
      return <div className={`${styles.statusIndicator} ${styles.error}`}><AlertCircleIcon /> {error}</div>;
    }
    if (status === 'recording') {
      return <div className={`${styles.statusIndicator} ${styles.recognizing}`}><MicIcon /> 音声認識中...</div>;
    }
    return <div className={`${styles.statusIndicator} ${styles.idle}`}><MicOffIcon /> マイク入力待機中...</div>;
  };

  return (
    <div className={styles.transcriptionContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>リアルタイム文字起こし ({employeeName}さん)</h3>
        <button onClick={onToggleRecording} className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}>
          {isRecording ? <MicOffIcon /> : <MicIcon />}
          {isRecording ? '録音停止' : '録音開始'}
        </button>
      </div>
      
      {getStatusIndicator()}

      <div className={styles.transcriptDisplay}>
        {transcript.length === 0 && status !== 'error' && (
          <p className={styles.noTranscript}>録音を開始すると、ここに会話が文字起こしされます。</p>
        )}
        {transcript.map((item, index) => (
          <div key={index} className={styles.transcriptItem}>
            <span className={styles.speakerTag}>{item.speakerTag ? `話者${item.speakerTag}:` : '不明:'}</span>
            <p className={styles.transcriptText}>{item.transcript}</p>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
};

export default RealTimeTranscription;
