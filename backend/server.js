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
const whitelist = [
  'http://localhost:3000',
  'https://jizo-1on1.vercel.app',
];
// 環境変数で指定されたフロントエンドURLも許可リストに追加
if (process.env.FRONTEND_URL) {
  // 同じURLが複数登録されるのを防ぐ
  if (!whitelist.includes(process.env.FRONTEND_URL)) {
    whitelist.push(process.env.FRONTEND_URL);
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    // originがないリクエスト(curlなど)も許可する
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true // Cookieなどの認証情報をやり取りするために必要
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


// WebSocketの接続処理
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let recognizeStream = null;

    socket.on('start_transcription', () => {
        console.log('Starting transcription for:', socket.id);
        if (recognizeStream) {
            recognizeStream.destroy();
        }
        
        recognizeStream = setupTranscriptionStream((transcript) => {
            socket.emit('transcript_data', transcript);
        });
        // エラーハンドリングを追加
        recognizeStream.on('error', (err) => {
            console.error('Speech-to-Text API Error:', err);
            // エラーをクライアントに通知することも可能
            // socket.emit('transcription_error', err.message);
        });
    });

    socket.on('audio_stream', (audioData) => {
        // ストリームが有効な場合のみ書き込む
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.write(audioData);
        }
    });

    socket.on('end_transcription', () => {
        console.log('Ending transcription for:', socket.id);
        if (recognizeStream) {
            recognizeStream.destroy();
            recognizeStream = null;
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (recognizeStream) {
            recognizeStream.destroy();
            recognizeStream = null;
        }
    });
});


// ★ app.listenをserver.listenに変更
server.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});