// backend/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const { setupTranscriptionStream } = require('./services/aiService');

// 本番環境用のCORS設定
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};

// ★ Socket.ioサーバーを作成し、CORS設定を適用
const io = new Server(server, {
  cors: corsOptions
});

// ルーターのインポート
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const port = process.env.PORT || 5000;

// ミドルウェアの設定
app.use(cors(corsOptions));
app.use(express.json());

// ルーターの接続
app.use('/api', authRoutes);
app.use('/api', employeeRoutes);
app.use('/api', conversationRoutes);
app.use('/api', chatRoutes);
app.use('/api', dashboardRoutes);


// ★ WebSocketの接続処理
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  // ★ 各クライアント専用の文字起こしストリームをセットアップ
  const recognizeStream = setupTranscriptionStream((transcript) => {
    // 文字起こし結果が得られたら、該当クライアントに送信
    socket.emit('transcript_data', transcript);
  });

  // フロントエンドから 'audio_stream' イベントで音声データが送られてきた時の処理
  socket.on('audio_stream', (audioData) => {
    // Google Cloudのストリームに音声データを書き込む
    if (recognizeStream) {
      recognizeStream.write(audioData);
    }
  });

  // 接続が切れた時の処理
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    // ★ ストリームを終了させる
    if (recognizeStream) {
      recognizeStream.destroy();
    }
  });
});


// ★ app.listenをserver.listenに変更
server.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});