// frontend/src/views/RealTimeTranscription.js
import React, { useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';

const RealTimeTranscription = ({ isRecording, transcript, onTranscriptUpdate, employeeName }) => {
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

    socketRef.current.on('transcript_data', (data) => {
      onTranscriptUpdate(data);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [onTranscriptUpdate]);

  useEffect(() => {
    const startRecording = async () => {
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
      } catch (error) {
        console.error('マイクへのアクセスに失敗しました:', error);
        alert('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (socketRef.current) {
          socketRef.current.emit('stop_transcription');
        }
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };

    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }

    // クリーンアップ関数
    return () => {
        stopRecording();
    };
  }, [isRecording]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>リアルタイム文字起こし</h2>
        <p>{employeeName ? `${employeeName}さんとの会話` : '会話を開始すると文字起こしが始まります'}</p>
      </header>

      <div className={styles.transcriptionArea}>
        {transcript.length === 0 && !isRecording && <div className={styles.placeholder}>録音は停止中です。</div>}
        {transcript.length === 0 && isRecording && <div className={styles.placeholder}>録音中...</div>}
        {transcript.map((item, index) => (
          <p key={index} className={styles.transcriptLine}>
            <span>{item.transcript}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

export default RealTimeTranscription;
