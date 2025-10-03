const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// --- CORS設定 ---
const whitelist = [
  'http://localhost:3000',
  'https://jizo-1on1.vercel.app',
  'https://jizo.monetam.xyz',
  'http://jizo.monetam.xyz',
  'https://memento-1on1.com',
  'http://memento-1on1.com',
  'https://www.memento-1on1.com',
  'http://www.memento-1on1.com',
];
if (process.env.FRONTEND_URL && !whitelist.includes(process.env.FRONTEND_URL)) {
  whitelist.push(process.env.FRONTEND_URL);
}
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};

// --- ミドルウェア設定 ---
app.use(cors(corsOptions));
app.use(express.json());

// --- ルーターの接続 ---
// ★★★ 修正: ベースパスを '/api' に統一し、元のURL構造を維持します ★★★
// これにより、フロントエンドのserviceファイルを変更する必要がなくなります。
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/employeeRoutes'));
app.use('/api', require('./routes/conversationRoutes'));
app.use('/api', require('./routes/dashboardRoutes'));


// --- WebSocketサーバー設定 ---
const io = new Server(server, { cors: corsOptions });
const { setupTranscriptionStream } = require('./services/aiService');

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let transcriptionManager = null;

  socket.on('start_transcription', () => {
    console.log('Starting transcription for:', socket.id);
    if (transcriptionManager) {
      transcriptionManager.destroy();
    }

    transcriptionManager = setupTranscriptionStream((transcript) => {
      socket.emit('transcript_data', transcript);
    }, {
      onRestartRequest: (reason) => {
        console.log(`Requesting client transcription restart for ${socket.id} (reason: ${reason})`);
        if (socket.connected) {
          socket.emit('transcription_restart', { reason });
        }
        if (transcriptionManager) {
          transcriptionManager.destroy();
          transcriptionManager = null;
        }
      }
    });
  });

  socket.on('audio_stream', (audioData) => {
    if (transcriptionManager && !transcriptionManager.destroyed) {
      transcriptionManager.write(audioData);
    } else if (!transcriptionManager) {
      console.warn('Received audio_stream without active transcription manager.');
    }
  });

  socket.on('end_transcription', () => {
    console.log('Ending transcription for:', socket.id);
    if (transcriptionManager) {
      transcriptionManager.destroy();
      transcriptionManager = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (transcriptionManager) {
      transcriptionManager.destroy();
      transcriptionManager = null;
    }
  });
});

// --- サーバー起動 ---
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
