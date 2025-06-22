// backend/routes/authRoutes.js (修正後)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/login', authController.loginUser);

// ★ /register から /users に変更し、管理者が実行するため認証をかける
router.post('/users', authenticateToken, authController.createUserByAdmin); 

module.exports = router;