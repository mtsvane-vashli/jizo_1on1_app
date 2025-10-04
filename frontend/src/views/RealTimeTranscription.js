// frontend/src/views/RealTimeTranscription.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';

// Add isPopup and isMinimized to props
const RealTimeTranscription = ({
  isRecording,
  onToggleRecording,
  transcript,
  onTranscriptUpdate,
  employeeName,
  isPopup = false,
  isMinimized = false
}) => {
  const [interimTranscript, setInterimTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isTranscriptionActiveRef = useRef(false);
  const socketReadyRef = useRef(false);
  const pendingStartRef = useRef(false);
  const lastSpeakerTag = useRef(null);
  const transcriptDisplayRef = useRef(null);

  useEffect(() => {
    if (transcriptDisplayRef.current) {
      transcriptDisplayRef.current.scrollTop = transcriptDisplayRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  // Socket.IOの初期化とイベントリスナーの設定
  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    socketRef.current = io(backendUrl);

    const handleTranscriptData = (data) => {
      if (data.isFinal) {
        onTranscriptUpdate(data);
        setInterimTranscript('');
        lastSpeakerTag.current = data.speakerTag;
      } else {
        const speakerPrefix = data.speakerTag ? `話者${data.speakerTag}: ` : '';
        setInterimTranscript(speakerPrefix + data.transcript);
      }
    };

    const handleRestart = (payload) => restartRecording(payload || {});
    const handleConnect = () => {
      socketReadyRef.current = true;
      if (pendingStartRef.current) {
        socketRef.current.emit('start_transcription', { lastSpeakerTag: lastSpeakerTag.current });
        pendingStartRef.current = false;
      }
    };
    const handleDisconnect = () => {
      socketReadyRef.current = false;
      pendingStartRef.current = false;
    };

    socketRef.current.on('transcript_data', handleTranscriptData);
    socketRef.current.on('transcription_restart', handleRestart);
    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('disconnect', handleDisconnect);

    return () => {
      pendingStartRef.current = false;
      socketReadyRef.current = false;
      if (socketRef.current) {
        socketRef.current.off('transcript_data', handleTranscriptData);
        socketRef.current.off('transcription_restart', handleRestart);
        socketRef.current.off('connect', handleConnect);
        socketRef.current.off('disconnect', handleDisconnect);
        socketRef.current.disconnect();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
    };
  }, [onTranscriptUpdate, restartRecording]);

  const stopRecording = useCallback(() => {
    isTranscriptionActiveRef.current = false;

    pendingStartRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (err) {
        console.warn('MediaRecorder stop failed:', err);
      }
      recorder.ondataavailable = null;
      recorder.onstop = null;
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('end_transcription');
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true
        }
      });
      audioStreamRef.current = stream;

      if (socketRef.current?.connected && socketReadyRef.current) {
        socketRef.current.emit('start_transcription', { lastSpeakerTag: lastSpeakerTag.current });
      } else {
        pendingStartRef.current = true;
        console.warn('Socket not connected, transcription start has been queued.');
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          isTranscriptionActiveRef.current &&
          socketRef.current?.connected &&
          socketReadyRef.current
        ) {
          socketRef.current.emit('audio_stream', event.data);
        }
      };

      recorder.onstart = () => {
        isTranscriptionActiveRef.current = true;
      };

      recorder.onstop = () => {
        isTranscriptionActiveRef.current = false;
      };

      recorder.start(1000);

    } catch (error) {
      console.error('マイクへのアクセスに失敗しました:', error);
      alert('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      if (isRecording) {
        onToggleRecording();
      }
    }
  }, [isRecording, onToggleRecording]);

  const restartRecording = useCallback(({ reason } = {}) => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    console.info('Received transcription restart request from backend', reason);

    const shouldResume = isRecording;
    stopRecording();

    if (!shouldResume) {
      return;
    }

    restartTimeoutRef.current = setTimeout(() => {
      startRecording();
    }, 400);
  }, [isRecording, startRecording, stopRecording]);


  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
    return () => {
      stopRecording();
    };
  }, [isRecording, startRecording, stopRecording]);

  const containerClasses = `${styles.transcriptionContainer} ${isMinimized ? styles.minimized : ''}`;

  return (
    <div className={containerClasses}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>リアルタイム文字起こし</h2>
          <p className={styles.conversationPartner}>{employeeName ? `${employeeName}さんとの会話` : '会話'}</p>
        </div>
        <button
          onClick={onToggleRecording}
          className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
        >
          {isRecording ? '■ 録音停止' : '● 録音開始'}
        </button>
      </header>

      <div ref={transcriptDisplayRef} className={styles.transcriptDisplay}>
        {transcript.length === 0 && !interimTranscript && (
          <p className={styles.noTranscript}>
            {isRecording ? '会話を始めるとここに文字起こしが表示されます...' : '「録音開始」ボタンを押して会話を始めてください。'}
          </p>
        )}
        {transcript.map((item, index) => (
          <div key={index} className={styles.transcriptItem}>
            <p className={styles.transcriptText}>
              {item.speakerTag && <span className={styles.speakerTag}>{`話者${item.speakerTag}: `}</span>}
              {item.transcript}
            </p>
          </div>
        ))}
        {interimTranscript && (
          <div className={`${styles.transcriptItem} ${styles.interim}`}>
            <p className={styles.transcriptText}>{interimTranscript}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeTranscription;
