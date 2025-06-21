// backend/models/conversationModel.js (PostgreSQL版)

const db = require('../database');

const getAllConversations = async () => {
    const sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions,
               e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        ORDER BY c.timestamp DESC`;
    try {
        const { rows } = await db.query(sql);
        return rows;
    } catch (err) {
        throw err;
    }
};

const getConversationById = async (id) => {
    const sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.employee_id,
               e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = $1`;
    try {
        const { rows } = await db.query(sql, [id]);
        return rows[0];
    } catch (err) {
        throw err;
    }
};

const getMessagesByConversationId = async (id) => {
    const sql = "SELECT sender, text FROM messages WHERE conversation_id = $1 ORDER BY id ASC";
    try {
        const { rows } = await db.query(sql, [id]);
        return rows;
    } catch (err) {
        throw err;
    }
};

const deleteConversationAndMessages = async (id) => {
    // ON DELETE CASCADE を設定しているので、conversations を削除するだけで関連データも削除される
    const sql = 'DELETE FROM conversations WHERE id = $1';
    try {
        const result = await db.query(sql, [id]);
        return result.rowCount; // 削除された行数を返す
    } catch (err) {
        throw err;
    }
};

const createConversation = async (theme, engagement, employeeId) => {
    const sql = 'INSERT INTO conversations (theme, engagement, employee_id) VALUES ($1, $2, $3) RETURNING id';
    try {
        const { rows } = await db.query(sql, [theme, engagement, employeeId]);
        return rows[0].id;
    } catch (err) {
        throw err;
    }
};

const addMessage = async (conversationId, sender, text) => {
    const sql = 'INSERT INTO messages (conversation_id, sender, text) VALUES ($1, $2, $3) RETURNING id';
    try {
        const { rows } = await db.query(sql, [conversationId, sender, text]);
        return rows[0].id;
    } catch (err) {
        throw err;
    }
};

const updateConversationEngagement = async (engagement, conversationId) => {
    const sql = 'UPDATE conversations SET engagement = $1 WHERE id = $2';
    try {
        const result = await db.query(sql, [engagement, conversationId]);
        return result.rowCount;
    } catch (err) {
        throw err;
    }
};

const updateConversationSummary = async (summary, nextActions, conversationId) => {
    const sql = 'UPDATE conversations SET summary = $1, next_actions = $2 WHERE id = $3';
    try {
        const result = await db.query(sql, [summary, nextActions, conversationId]);
        return result.rowCount;
    } catch (err) {
        throw err;
    }
};

const saveKeywords = async (conversationId, keywords) => {
    // トランザクションを開始して、一連の処理が全て成功するか全て失敗するようにする
    const client = await db.query('BEGIN');
    try {
        await db.query('DELETE FROM keywords WHERE conversation_id = $1', [conversationId]);
        for (const keyword of keywords) {
            await db.query('INSERT INTO keywords (conversation_id, keyword) VALUES ($1, $2)', [conversationId, keyword]);
        }
        await db.query('COMMIT');
    } catch (err) {
        await db.query('ROLLBACK');
        throw err;
    }
};

const saveSentiment = async (conversationId, sentimentResult) => {
    const { overall_sentiment, positive_score, negative_score, neutral_score } = sentimentResult;
    const client = await db.query('BEGIN');
    try {
        await db.query('DELETE FROM sentiments WHERE conversation_id = $1', [conversationId]);
        const sql = 'INSERT INTO sentiments (conversation_id, overall_sentiment, positive_score, negative_score, neutral_score) VALUES ($1, $2, $3, $4, $5)';
        await db.query(sql, [conversationId, overall_sentiment, positive_score, negative_score, neutral_score]);
        await db.query('COMMIT');
    } catch (err) {
        await db.query('ROLLBACK');
        throw err;
    }
};

const getDashboardKeywords = async () => {
    const sql = `
        SELECT keyword, COUNT(keyword) as frequency
        FROM keywords
        GROUP BY keyword
        ORDER BY frequency DESC
        LIMIT 10`;
    try {
        const { rows } = await db.query(sql);
        return rows;
    } catch (err) {
        throw err;
    }
};

const getDashboardSentiments = async () => {
    const sql = `
        SELECT
            s.overall_sentiment, s.positive_score, s.negative_score, s.neutral_score, c.timestamp AS conversation_timestamp
        FROM sentiments s
        JOIN conversations c ON s.conversation_id = c.id
        ORDER BY c.timestamp ASC
        LIMIT 20`;
    try {
        const { rows } = await db.query(sql);
        return rows;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getAllConversations,
    getConversationById,
    getMessagesByConversationId,
    deleteConversationAndMessages,
    createConversation,
    addMessage,
    updateConversationEngagement,
    updateConversationSummary,
    saveKeywords,
    saveSentiment,
    getDashboardKeywords,
    getDashboardSentiments,
};