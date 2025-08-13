const express = require('express');
const router = express.Router();
// authMiddlewareはデフォルトエクスポートのため、分割代入を使わずにインポートします
const protect = require('../middleware/authMiddleware');

// conversationControllerからエクスポートされている実際の関数名に合わせます
const {
    startConversation,
    postMessage,
    listConversations,
    getConversationDetails,
    updateConversation,
    deleteConversation,
    summarizeConversation
} = require('../controllers/conversationController');

// ★ 修正: ルーティングパスを修正し、'/conversations'を明示的に追加します
// これにより、フロントエンドからの '/api/conversations' へのリクエストが正しく処理されます。

// POST /api/conversations -> 新しい会話を開始
router.post('/conversations', protect, startConversation);

// GET /api/conversations -> 全ての会話リストを取得
router.get('/conversations', protect, listConversations);

// GET /api/conversations/:id -> 特定の会話の詳細を取得
router.get('/conversations/:id', protect, getConversationDetails);

// PATCH /api/conversations/:id -> 特定の会話を更新 (メモなど)
router.patch('/conversations/:id', protect, updateConversation);

// DELETE /api/conversations/:id -> 特定の会話を削除
router.delete('/conversations/:id', protect, deleteConversation);

// POST /api/conversations/:id/messages -> 特定の会話にメッセージを投稿
router.post('/conversations/:id/messages', protect, postMessage);

// POST /api/conversations/:id/summarize -> 会話の要約を生成
router.post('/conversations/:id/summarize', protect, summarizeConversation);

module.exports = router;
