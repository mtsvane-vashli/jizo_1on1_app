const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const { scheduleOneOnOneReminders } = require('./services/reminderService');

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

// .env で FRONTEND_URL を渡している場合もホワイトリストに追加
if (process.env.FRONTEND_URL && !whitelist.includes(process.env.FRONTEND_URL)) {
  whitelist.push(process.env.FRONTEND_URL);
}

/**
 * dev 用: localhost/127.0.0.1 はポート不問で許可
 */
const isDevOrigin = (origin) => {
  if (!origin) return true; // 同一オリジンやcurl/Postman等は許可
  try {
    const u = new URL(origin);
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch (_) {
    return false;
  }
};

// 共通の許可判定
const isAllowedOrigin = (origin) => {
  return isDevOrigin(origin) || whitelist.includes(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn('[CORS BLOCKED] origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  optionsSuccessStatus: 200,
  credentials: true
};

// --- ミドルウェア設定 ---
app.use(cors(corsOptions));
app.use(express.json());

// --- ルーターの接続 ---
// ★ ベースパス '/api' を維持
const authenticateToken = require('./middleware/authMiddleware');
const maintenanceController = require('./controllers/maintenanceController');

app.get('/api/maintenance', maintenanceController.getMaintenanceMessage);
app.post('/api/maintenance', authenticateToken, maintenanceController.updateMaintenanceMessage);

app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/employeeRoutes'));
app.use('/api', require('./routes/conversationRoutes'));
app.use('/api', require('./routes/dashboardRoutes'));

// --- WebSocketサーバー設定 ---
// socket.io にも同じ CORS 判定を適用（メソッド/ヘッダも明示）
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      console.warn('[Socket.IO CORS BLOCKED] origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
});

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

scheduleOneOnOneReminders();
