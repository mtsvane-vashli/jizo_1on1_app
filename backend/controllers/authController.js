// backend/controllers/authController.js (修正後)

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET;

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        
        // ★ JWTに organizationId と role を含める
        const tokenPayload = {
            id: user.id,
            username: user.username,
            organizationId: user.organization_id, // DBのカラム名は organization_id
            role: user.role
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
        
        // ★ フロントエンドがユーザー情報をすぐ使えるように、トークンと一緒にユーザー情報も返す
        res.status(200).json({
            message: 'Logged in successfully.',
            token,
            user: tokenPayload
        });
    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const createUserByAdmin = async (req, res) => {
    // ★ 実行者が管理者(admin)かどうかをチェック
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can create users.' });
    }

    const { username, password } = req.body;
    const adminUser = req.user; // ★ 管理者自身のユーザー情報を使う

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // ★ 新しいユーザー情報と、作成者である管理者情報をモデルに渡す
        const userId = await userModel.createUser({ username, hashedPassword }, adminUser);
        res.status(201).json({ message: 'User created successfully by admin.', userId });
    } catch (error) {
        console.error('Error during user creation by admin:', error.message);
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error during user creation.' });
    }
};

module.exports = {
    loginUser,
    createUserByAdmin
};