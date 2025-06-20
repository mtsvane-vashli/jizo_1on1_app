// backend/routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/dashboard/keywords', authenticateToken, dashboardController.getDashboardKeywords);
router.get('/dashboard/sentiments', authenticateToken, dashboardController.getDashboardSentiments);

module.exports = router;