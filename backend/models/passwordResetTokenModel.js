const pool = require('../database');

/**
 * 既存の未使用トークンを無効化する
 */
const invalidateExistingTokens = async (userId) => {
    await pool.query(
        `UPDATE password_reset_tokens
            SET used_at = NOW()
          WHERE user_id = $1
            AND used_at IS NULL`,
        [userId]
    );
};

/**
 * パスワードリセットトークンを保存する
 */
const createToken = async ({ userId, tokenHash, expiresAt }) => {
    await invalidateExistingTokens(userId);
    const { rows } = await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
        [userId, tokenHash, expiresAt]
    );
    return rows[0];
};

/**
 * ハッシュ値から有効なトークンを取得する
 */
const findValidToken = async (tokenHash) => {
    const { rows } = await pool.query(
        `SELECT *
           FROM password_reset_tokens
          WHERE token_hash = $1
            AND used_at IS NULL
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1`,
        [tokenHash]
    );
    return rows[0];
};

/**
 * トークンを使用済みに更新する
 */
const markTokenUsed = async (tokenId) => {
    await pool.query(
        `UPDATE password_reset_tokens
            SET used_at = NOW()
          WHERE id = $1`,
        [tokenId]
    );
};

module.exports = {
    createToken,
    findValidToken,
    markTokenUsed
};
