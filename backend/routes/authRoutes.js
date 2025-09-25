// backend/routes/authRoutes.js (修正後)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/login', authController.loginUser);

router.post('/password-reset/request', authController.requestPasswordReset);
router.post('/password-reset/confirm', authController.resetPassword);

// ★ /register から /users に変更し、管理者が実行するため認証をかける
router.post('/users', authenticateToken, authController.createUserByAdmin); 

// 自分のパスワードを変更（要認証）
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
