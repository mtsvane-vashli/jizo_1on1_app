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
            role: user.role,
            mustChangePassword: !!user.must_change_password
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
    createUserByAdmin,
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new password are required.' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'New password must be at least 8 characters.' });
            }

            const userId = req.user.id;
            const orgId = req.user.organizationId;
            // 現在のパスワードを検証
            const dbUser = await userModel.findUserById(userId);
            if (!dbUser || dbUser.organization_id !== orgId) {
                return res.status(404).json({ error: 'User not found.' });
            }
            const ok = await bcrypt.compare(currentPassword, dbUser.password);
            if (!ok) {
                return res.status(401).json({ error: 'Current password is incorrect.' });
            }
            // パスワード更新
            const hashed = await bcrypt.hash(newPassword, 10);
            await userModel.updatePassword({ userId, orgId, hashedPassword: hashed });

            // 新しいJWTを返す（mustChangePassword を false に更新）
            const tokenPayload = {
                id: dbUser.id,
                username: dbUser.username,
                organizationId: dbUser.organization_id,
                role: dbUser.role,
                mustChangePassword: false
            };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
            return res.status(200).json({ message: 'Password updated successfully.', token, user: tokenPayload });
        } catch (err) {
            console.error('Error changing password:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};
