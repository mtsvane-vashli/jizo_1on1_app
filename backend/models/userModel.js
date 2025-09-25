// backend/models/userModel.js (修正後)

const pool = require('../database');

const findUserByUsername = async (username) => {
    const sql = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await pool.query(sql, [username]);
    return rows[0];
};

const findUserByEmail = async (email) => {
    const sql = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
    const { rows } = await pool.query(sql, [email]);
    return rows[0];
};

const findUserById = async (id) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
};

const getUsersByOrganization = async (organizationId) => {
    const sql = `
        SELECT id, username, email, role, must_change_password, password_changed_at, created_at
          FROM users
         WHERE organization_id = $1
         ORDER BY created_at ASC, id ASC
    `;
    const { rows } = await pool.query(sql, [organizationId]);
    return rows;
};

/**
 * 新しいユーザーを作成する (管理者が実行)
 * @param {object} newUser - { username, password (hashed) }
 * @param {object} adminUser - 実行した管理者ユーザーのオブジェクト
 * @returns {Promise<number>} 作成されたユーザーのID
 */
const createUser = async (newUser, adminUser) => {
    // ★ 管理者と同じ組織に、新しいユーザー(role='user')を作成する
    const sql = `INSERT INTO users (username, email, password, organization_id, role, must_change_password)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`;
    try {
        const { rows } = await pool.query(sql, [
            newUser.username,
            newUser.email,
            newUser.hashedPassword,
            adminUser.organizationId,
            'user',
            true
        ]);
        return rows[0].id;
    } catch (err) {
        if (err.code === '23505') { // UNIQUE constraint violation
            throw new Error('Username or email already exists in this organization.');
        }
        throw err;
    }
};

/**
 * パスワードを更新し、強制変更フラグを解除
 */
const updatePassword = async ({ userId, orgId, hashedPassword }) => {
    const sql = `
        UPDATE users
           SET password = $1,
               must_change_password = FALSE,
               password_changed_at = NOW()
         WHERE id = $2 AND organization_id = $3
    `;
    await pool.query(sql, [hashedPassword, userId, orgId]);
};

const updateUserByAdmin = async ({ targetUserId, organizationId, username, email, role, mustChangePassword }) => {
    const fields = [];
    const params = [];

    if (username !== undefined) {
        fields.push(`username = $${fields.length + 1}`);
        params.push(username);
    }
    if (email !== undefined) {
        fields.push(`email = $${fields.length + 1}`);
        params.push(email);
    }
    if (role !== undefined) {
        fields.push(`role = $${fields.length + 1}`);
        params.push(role);
    }
    if (mustChangePassword !== undefined) {
        fields.push(`must_change_password = $${fields.length + 1}`);
        params.push(mustChangePassword);
        if (!mustChangePassword) {
            // 既にパスワードを変更済み扱いにする場合、特に更新不要
        }
    }

    if (fields.length === 0) {
        return null;
    }

    const sql = `
        UPDATE users
           SET ${fields.join(', ')}
         WHERE id = $${fields.length + 1}
           AND organization_id = $${fields.length + 2}
         RETURNING id, username, email, role, must_change_password, password_changed_at, created_at
    `;

    params.push(targetUserId, organizationId);

    const { rows } = await pool.query(sql, params);
    return rows[0] || null;
};

module.exports = {
    findUserByUsername,
    findUserByEmail,
    findUserById,
    getUsersByOrganization,
    createUser,
    updatePassword,
    updateUserByAdmin
};
