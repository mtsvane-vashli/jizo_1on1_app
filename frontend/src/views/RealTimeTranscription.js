// frontend/src/views/RealTimeTranscription.js
import React, { useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';

const RealTimeTranscription = ({ isRecording, transcript, onTranscriptUpdate, employeeName }) => {
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);
  const streamRestartIntervalRef = useRef(null);

  // Socket.IOの初期化とイベントリスナーの設定
  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

    socketRef.current.on('transcript_data', (data) => {
      onTranscriptUpdate(data);
    });

    // コンポーネントのアンマウント時にソケットを切断
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onTranscriptUpdate]);

  // 録音停止処理
  const stopRecording = useCallback(() => {
    // ストリーム再起動のインターバルをクリア
    if (streamRestartIntervalRef.current) {
      clearInterval(streamRestartIntervalRef.current);
      streamRestartIntervalRef.current = null;
    }

    // MediaRecorderを停止
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // オーディオトラックを停止
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    // サーバーに転写終了を通知
    if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('end_transcription');
    }
  }, []);

  // 録音開始処理
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
      audioStreamRef.current = stream;

      // サーバーに転写開始を通知
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

      recorder.start(1000); // 1秒ごとにデータを送信

    } catch (error) {
      console.error('マイクへのアクセスに失敗しました:', error);
      alert('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      // isRecordingをfalseに更新するなどのエラー処理が必要になる可能性
    }
  }, []);


  // isRecordingの状態に応じて録音を開始・停止
  useEffect(() => {
    if (isRecording) {
        const restartStream = async () => {
            // 1. 現在のストリームを停止・終了
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop(); // ondataavailableは呼ばれなくなる
            }
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('end_transcription');
            }

            // 2. 少し待ってから新しいストリームを開始
            setTimeout(async () => {
                await startRecording();
            }, 500); // サーバー側がストリームを閉じるのを待つ
        };

        startRecording();
        // 240秒ごとにストリームを再起動
        streamRestartIntervalRef.current = setInterval(restartStream, 240000);

    } else {
      stopRecording();
    }

    // クリーンアップ関数
    return () => {
      stopRecording();
    };
  }, [isRecording, startRecording, stopRecording]);

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
