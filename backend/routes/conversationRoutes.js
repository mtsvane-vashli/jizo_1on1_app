// backend/routes/conversationRoutes.js

const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const authenticateToken = require('../middleware/authMiddleware');

// 全ての会話履歴を取得
router.get('/conversations', authenticateToken, conversationController.listConversations);

// 特定の会話の詳細を取得
router.get('/conversations/:id', authenticateToken, conversationController.getConversationDetails);

// 特定の会話のメッセージ履歴を取得
router.get('/conversations/:id/messages', authenticateToken, conversationController.getConversationMessages);

// 特定の会話を削除
router.delete('/conversations/:id', authenticateToken, conversationController.deleteConversation);

// 文字起こし結果から新しい会話として保存
router.post('/conversations', authenticateToken, conversationController.saveTranscript);


// ★★★ ここに追記 ★★★
// 特定の会話を更新 (文字起こしの編集保存用)
router.put('/conversations/:id', authenticateToken, conversationController.updateConversation);
// ★★★ 追記ここまで ★★★


module.exports = router;
