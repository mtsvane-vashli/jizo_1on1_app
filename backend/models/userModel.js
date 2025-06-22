// backend/models/userModel.js (修正後)

const pool = require('../database');

const findUserByUsername = async (username) => {
    const sql = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await pool.query(sql, [username]);
    return rows[0];
};

/**
 * 新しいユーザーを作成する (管理者が実行)
 * @param {object} newUser - { username, password (hashed) }
 * @param {object} adminUser - 実行した管理者ユーザーのオブジェクト
 * @returns {Promise<number>} 作成されたユーザーのID
 */
const createUser = async (newUser, adminUser) => {
    // ★ 管理者と同じ組織に、新しいユーザー(role='user')を作成する
    const sql = 'INSERT INTO users (username, password, organization_id, role) VALUES ($1, $2, $3, $4) RETURNING id';
    try {
        const { rows } = await pool.query(sql, [newUser.username, newUser.hashedPassword, adminUser.organizationId, 'user']);
        return rows[0].id;
    } catch (err) {
        if (err.code === '23505') { // UNIQUE constraint violation
            throw new Error('Username already exists in this organization.');
        }
        throw err;
    }
};

module.exports = {
    findUserByUsername,
    createUser
};