// backend/routes/employeeRoutes.js

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authenticateToken = require('../middleware/authMiddleware'); // 分離したミドルウェアをインポート

// GET /api/employees - 認証が必要
router.get('/employees', authenticateToken, employeeController.getEmployees);

// POST /api/employees - 認証が必要
router.post('/employees', authenticateToken, employeeController.addEmployee);

// DELETE /api/employees/:id - 認証が必要
router.delete('/employees/:id', authenticateToken, employeeController.deleteEmployee);

module.exports = router;