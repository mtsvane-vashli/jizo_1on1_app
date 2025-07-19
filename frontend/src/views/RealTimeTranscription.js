// frontend/src/views/RealTimeTranscription.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './RealTimeTranscription.module.css';

// ★修正点: onToggleRecording を props として受け取る
const RealTimeTranscription = ({ isRecording, onToggleRecording, transcript, onTranscriptUpdate, employeeName }) => {
  const [interimTranscript, setInterimTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);
  const streamRestartIntervalRef = useRef(null);
  const lastSpeakerTag = useRef(null);

  // Socket.IOの初期化とイベントリスナーの設定
  useEffect(() => {
    // 環境変数からバックエンドのURLを取得、なければデフォルト値を使用
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    socketRef.current = io(backendUrl);

    // サーバーから文字起こしデータを受信
    socketRef.current.on('transcript_data', (data) => {
      if (data.isFinal) {
        // 確定した文字起こしを親コンポーネントに渡す
        onTranscriptUpdate(data); 
        setInterimTranscript(''); // 中間結果をクリア
        lastSpeakerTag.current = data.speakerTag;
      } else {
        // 中間結果を画面に表示
        const speakerPrefix = data.speakerTag ? `話者${data.speakerTag}: ` : '';
        setInterimTranscript(speakerPrefix + data.transcript);
      }
    });

    // コンポーネントのアンマウント時にソケットを切断
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onTranscriptUpdate]);

  // 録音停止処理の共通化
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
  }, []);

  // 録音開始処理
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          noiseSuppression: true, 
          echoCancellation: true 
        } 
      });
      audioStreamRef.current = stream;

      if (socketRef.current) {
        // 最後に認識された話者タグをサーバーに送信
        socketRef.current.emit('start_transcription', { lastSpeakerTag: lastSpeakerTag.current });
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
          socketRef.current.emit('audio_stream', event.data);
        }
      };
      
      // 1秒ごとにデータを送信
      recorder.start(1000); 

    } catch (error) {
      console.error('マイクへのアクセスに失敗しました:', error);
      alert('マイクへのアクセス許可が必要です。ブラウザの設定を確認してください。');
      if (isRecording) {
        onToggleRecording(); // エラー時に録音状態を親コンポーネントに反映
      }
    }
  }, [isRecording, onToggleRecording]);


  // isRecordingの状態に応じて録音を開始・停止
  useEffect(() => {
    if (isRecording) {
        // ストリームを定期的に再起動する関数
        const restartStream = async () => {
            stopRecording();
            // 少し待ってから新しいストリームを開始 (サーバー側の準備を待つ)
            setTimeout(() => startRecording(), 500);
        };

        startRecording();
        // 4分 (240000ミリ秒) ごとにストリームを再起動
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
    // ★修正点: CSSクラス名を .module.css ファイルと一致させる
    <div className={styles.transcriptionContainer}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>リアルタイム文字起こし</h2>
          <p className={styles.conversationPartner}>{employeeName ? `${employeeName}さんとの会話` : '会話'}</p>
        </div>
        {/* ★修正点: 録音開始・停止ボタンを追加 */}
        <button 
          onClick={onToggleRecording} 
          className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
        >
          {isRecording ? '■ 録音停止' : '● 録音開始'}
        </button>
      </header>
      
      {/* ★修正点: 文字起こし表示エリアのクラス名と構造を修正 */}
      <div className={styles.transcriptDisplay}>
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
