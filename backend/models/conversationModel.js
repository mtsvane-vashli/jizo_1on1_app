// backend/models/conversationModel.js (修正後)

const pool = require('../database'); // poolを直接インポート

const getAllConversations = async () => {
    const sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions,
               e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        ORDER BY c.timestamp DESC`;
    const { rows } = await pool.query(sql);
    return rows;
};

const getConversationById = async (id) => {
    const sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.employee_id,
               e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = $1`;
    const { rows } = await pool.query(sql, [id]);
    return rows[0];
};

const getMessagesByConversationId = async (id) => {
    const sql = "SELECT sender, text FROM messages WHERE conversation_id = $1 ORDER BY id ASC";
    const { rows } = await pool.query(sql, [id]);
    return rows;
};

const deleteConversationAndMessages = async (id) => {
    const sql = 'DELETE FROM conversations WHERE id = $1';
    const result = await pool.query(sql, [id]);
    return result.rowCount;
};

const createConversation = async (theme, engagement, employeeId) => {
    const sql = 'INSERT INTO conversations (theme, engagement, employee_id) VALUES ($1, $2, $3) RETURNING id';
    const { rows } = await pool.query(sql, [theme, engagement, employeeId]);
    return rows[0].id;
};

const addMessage = async (conversationId, sender, text) => {
    const sql = 'INSERT INTO messages (conversation_id, sender, text) VALUES ($1, $2, $3) RETURNING id';
    const { rows } = await pool.query(sql, [conversationId, sender, text]);
    return rows[0].id;
};

const updateConversationEngagement = async (engagement, conversationId) => {
    const sql = 'UPDATE conversations SET engagement = $1 WHERE id = $2';
    const result = await pool.query(sql, [engagement, conversationId]);
    return result.rowCount;
};

const updateConversationSummary = async (summary, nextActions, conversationId) => {
    const sql = 'UPDATE conversations SET summary = $1, next_actions = $2 WHERE id = $3';
    const result = await pool.query(sql, [summary, nextActions, conversationId]);
    return result.rowCount;
};

const saveKeywords = async (conversationId, keywords) => {
    // client をプールから取得し、トランザクションを開始
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM keywords WHERE conversation_id = $1', [conversationId]);
        for (const keyword of keywords) {
            await client.query('INSERT INTO keywords (conversation_id, keyword) VALUES ($1, $2)', [conversationId, keyword]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release(); // clientをプールに返却
    }
};

const saveSentiment = async (conversationId, sentimentResult) => {
    const { overall_sentiment, positive_score, negative_score, neutral_score } = sentimentResult;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM sentiments WHERE conversation_id = $1', [conversationId]);
        const sql = 'INSERT INTO sentiments (conversation_id, overall_sentiment, positive_score, negative_score, neutral_score) VALUES ($1, $2, $3, $4, $5)';
        await client.query(sql, [conversationId, overall_sentiment, positive_score, negative_score, neutral_score]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getDashboardKeywords = async () => {
    const sql = `
        SELECT keyword, COUNT(keyword)::int as frequency
        FROM keywords
        GROUP BY keyword
        ORDER BY frequency DESC
        LIMIT 10`;
    const { rows } = await pool.query(sql);
    return rows;
};

const getDashboardSentiments = async () => {
    const sql = `
        SELECT
            s.overall_sentiment, s.positive_score, s.negative_score, s.neutral_score, c.timestamp AS conversation_timestamp
        FROM sentiments s
        JOIN conversations c ON s.conversation_id = c.id
        ORDER BY c.timestamp ASC
        LIMIT 20`;
    const { rows } = await pool.query(sql);
    return rows;
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