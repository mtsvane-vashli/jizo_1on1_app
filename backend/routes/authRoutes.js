// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/register
router.post('/register', authController.registerUser);

// POST /api/login
router.post('/login', authController.loginUser);

module.exports = router;