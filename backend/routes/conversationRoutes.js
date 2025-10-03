// backend/routes/conversationRoutes.js
const express = require('express');
const router = express.Router();

// 認証ミドルウェア
const authenticateToken = require('../middleware/authMiddleware');

// コントローラ
const conversationController = require('../controllers/conversationController');

// POST /api/conversations -> 新規会話開始
router.post(
    '/conversations',
    authenticateToken,
    conversationController.startConversation
);

// GET /api/conversations -> 会話一覧
router.get(
    '/conversations',
    authenticateToken,
    conversationController.listConversations
);

// GET /api/conversations/:id -> 会話詳細
router.get(
    '/conversations/:id',
    authenticateToken,
    conversationController.getConversationDetails
);

// PATCH /api/conversations/:id -> 会話更新（メモ・マインドマップ・文字起こしなど）
router.patch(
    '/conversations/:id',
    authenticateToken,
    conversationController.updateConversation
);

// DELETE /api/conversations/:id -> 会話削除
router.delete(
    '/conversations/:id',
    authenticateToken,
    conversationController.deleteConversation
);

// POST /api/conversations/:id/messages -> メッセージ投稿
router.post(
    '/conversations/:id/messages',
    authenticateToken,
    conversationController.postMessage
);

// POST /api/conversations/:id/summarize -> 要約生成
router.post(
    '/conversations/:id/summarize',
    authenticateToken,
    conversationController.summarizeConversation
);

// POST /api/conversations/:id/deep-dive -> 深掘り説明
router.post(
    '/conversations/:id/deep-dive',
    authenticateToken,
    conversationController.deepDiveExplanation
);

// POST /api/conversations/:id/refresh-questions -> 質問例の再提案（単一登録）
router.post(
    '/conversations/:id/refresh-questions',
    authenticateToken,
    conversationController.refreshQuestions
);

// POST /api/conversations/:id/one-point-advice -> ワンポイントアドバイス（単一登録）
router.post(
    '/conversations/:id/one-point-advice',
    authenticateToken,
    conversationController.onePointAdvice
);

module.exports = router;
