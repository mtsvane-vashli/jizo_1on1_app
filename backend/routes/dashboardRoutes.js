// backend/routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
// ★★★ ここを修正 ★★★
// { protect } という分割代入でのインポートをやめ、モジュール全体をインポートします。
// これにより、authMiddleware.jsがどのような形式でエクスポートしていても正しく関数を読み込めます。
const protect = require('../middleware/authMiddleware');

// ダッシュボード関連の全ルートに認証ミドルウェアを適用
router.use(protect);

// 各ダッシュボードデータのエンドポイント
router.get('/dashboard/keywords', dashboardController.getDashboardKeywords);
router.get('/dashboard/sentiments', dashboardController.getDashboardSentiments);
router.get('/dashboard/issues', dashboardController.getIssues);
router.get('/dashboard/positives', dashboardController.getPositives);

module.exports = router;
