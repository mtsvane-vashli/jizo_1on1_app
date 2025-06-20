// backend/routes/chatRoutes.js

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middleware/authMiddleware');

// POST /api/chat
router.post('/chat', authenticateToken, chatController.handleChat);

// POST /api/summarize_and_next_action
router.post('/summarize_and_next_action', authenticateToken, chatController.summarizeConversation);

module.exports = router;