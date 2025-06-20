// backend/controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * ユーザー登録処理
 */
const registerUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await userModel.createUser(username, hashedPassword);
        res.status(201).json({ message: 'User registered successfully.', userId });
    } catch (error) {
        console.error('Error during user registration:', error.message);
        // userModelで重複エラーが判定されているので、それに合わせたステータスコードを返す
        if (error.message === 'Username already exists.') {
            return res.status(409).json({ error: error.message }); // 409 Conflict
        }
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
};

/**
 * ユーザーログイン処理
 */
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

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Logged in successfully.', token, username: user.username, userId: user.id });
    } catch (error) {
        console.error('Error during user login:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    registerUser,
    loginUser
};