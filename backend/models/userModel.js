// backend/models/userModel.js (修正後)

const db = require('../database'); // ここで pool を取得

const findUserByUsername = async (username) => {
    const sql = 'SELECT * FROM users WHERE username = $1';
    try {
        const { rows } = await db.query(sql, [username]);
        return rows[0];
    } catch (err) {
        throw err;
    }
};

const createUser = async (username, hashedPassword) => {
    const sql = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id';
    try {
        const { rows } = await db.query(sql, [username, hashedPassword]);
        return rows[0].id;
    } catch (err) {
        if (err.code === '23505') { // UNIQUE constraint violation
            throw new Error('Username already exists.');
        }
        throw err;
    }
};

module.exports = {
    findUserByUsername,
    createUser
};