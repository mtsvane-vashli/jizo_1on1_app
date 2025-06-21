// backend/server.js (最終形)

const express = require('express');
const cors = require('cors');
// 本番環境用のCORS設定
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // 環境変数からフロントエンドのURLを取得
  optionsSuccessStatus: 200
};

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ルーターのインポート
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
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

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});