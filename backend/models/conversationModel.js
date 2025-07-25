// backend/models/conversationModel.js

const pool = require('../database');

// ... (getAllConversations から updateConversation までの関数は変更ありません) ...
const getAllConversations = async (user) => {
    let sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.transcript,
               e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id `;
    let params = [];
    if (user.role === 'admin') {
        sql += `WHERE c.organization_id = $1 ORDER BY c.timestamp DESC`;
        params.push(user.organizationId);
    } else {
        sql += `WHERE c.user_id = $1 ORDER BY c.timestamp DESC`;
        params.push(user.id);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
};
const getConversationById = async (id, user) => {
    let sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.employee_id, c.user_id, c.transcript,
               e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = $1 `;
    let params = [id];
    if (user.role === 'admin') {
        sql += `AND c.organization_id = $2`;
        params.push(user.organizationId);
    } else {
        sql += `AND c.user_id = $2`;
        params.push(user.id);
    }
    const { rows } = await pool.query(sql, params);
    return rows[0];
};
const getMessagesByConversationId = async (id) => {
    const sql = "SELECT m.sender, m.text FROM messages m WHERE m.conversation_id = $1 ORDER BY m.id ASC";
    const { rows } = await pool.query(sql, [id]);
    return rows;
};
const createConversation = async (convData, user) => {
    const sql = 'INSERT INTO conversations (theme, engagement, employee_id, organization_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const params = [convData.theme, convData.engagement, convData.employeeId, user.organizationId, user.id];
    const { rows } = await pool.query(sql, params);
    return rows[0].id;
};
const deleteConversationAndMessages = async (id, user) => {
    let sql = 'DELETE FROM conversations WHERE id = $1 ';
    let params = [id];

    if (user.role !== 'admin') {
        sql += 'AND user_id = $2';
        params.push(user.id);
    } else {
        sql += 'AND organization_id = $2';
        params.push(user.organizationId);
    }
    const result = await pool.query(sql, params);
    return result.rowCount;
};
const createConversationFromTranscript = async (transcript, employeeId, user) => {
    const sql = `
        INSERT INTO conversations (transcript, user_id, organization_id, theme, employee_id) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`;
    const theme = "リアルタイム文字起こしセッション";
    const params = [transcript, user.id, user.organizationId, theme, employeeId];
    const { rows } = await pool.query(sql, params);
    return rows[0];
};
const updateConversationEngagement = async (engagement, conversationId) => {
    const sql = 'UPDATE conversations SET engagement = $1 WHERE id = $2';
    const result = await pool.query(sql, [engagement, conversationId]);
    return result.rowCount;
};
const updateConversationSummary = async (summary, nextActions, conversationId) => {
    const sql = 'UPDATE conversations SET summary = $1, next_actions = $2 WHERE id = $3';
    const { rows } = await pool.query(sql, [summary, nextActions, conversationId]);
    return rows;
};
const updateConversationTranscript = async (transcript, conversationId) => {
    const sql = 'UPDATE conversations SET transcript = $1 WHERE id = $2';
    const { rows } = await pool.query(sql, [transcript, conversationId]);
    return rows;
};
const addMessage = async (conversationId, sender, text) => {
    const sql = 'INSERT INTO messages (conversation_id, sender, text) VALUES ($1, $2, $3) RETURNING id';
    const { rows } = await pool.query(sql, [conversationId, sender, text]);
    return rows[0].id;
};
const saveKeywords = async (conversationId, keywords) => {
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
        client.release();
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
const getDashboardKeywords = async (user, employeeId) => {
    let sql = `
        SELECT k.keyword, COUNT(k.keyword)::int as frequency
        FROM keywords k
        JOIN conversations c ON k.conversation_id = c.id `;
    let params = [];
    let whereClauses = [];
    if (user.role === 'admin') {
        whereClauses.push(`c.organization_id = $` + (params.length + 1));
        params.push(user.organizationId);
    } else {
        whereClauses.push(`c.user_id = $` + (params.length + 1));
        params.push(user.id);
    }
    if (employeeId) {
        whereClauses.push(`c.employee_id = $` + (params.length + 1));
        params.push(employeeId);
    }
    if (whereClauses.length > 0) {
        sql += `WHERE ` + whereClauses.join(' AND ');
    }
    sql += ` GROUP BY k.keyword ORDER BY frequency DESC LIMIT 10`;
    const { rows } = await pool.query(sql, params);
    return rows;
};
const getDashboardSentiments = async (user, employeeId) => {
    let sql = `
        SELECT s.overall_sentiment, s.positive_score, s.negative_score, s.neutral_score, c.timestamp AS conversation_timestamp
        FROM sentiments s
        JOIN conversations c ON s.conversation_id = c.id `;
    let params = [];
    let whereClauses = [];
    if (user.role === 'admin') {
        whereClauses.push(`c.organization_id = $` + (params.length + 1));
        params.push(user.organizationId);
    } else {
        whereClauses.push(`c.user_id = $` + (params.length + 1));
        params.push(user.id);
    }
    if (employeeId) {
        whereClauses.push(`c.employee_id = $` + (params.length + 1));
        params.push(employeeId);
    }
    if (whereClauses.length > 0) {
        sql += `WHERE ` + whereClauses.join(' AND ');
    }
    sql += ` ORDER BY c.timestamp ASC LIMIT 20`;
    const { rows } = await pool.query(sql, params);
    return rows;
};
const updateConversation = async (id, dataToUpdate, user) => {
    const { transcript } = dataToUpdate;

    if (typeof transcript === 'undefined') {
        return getConversationById(id, user);
    }
    const query = `
        UPDATE conversations 
        SET transcript = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *
    `;
    const values = [transcript, id, user.id];
    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error('Error in updateConversation model:', error);
        throw error;
    }
};

// --- ★★★ ここからが修正箇所 ★★★ ---

/**
 * 文字起こしデータを含む、指定されたユーザーの全ての会話を取得する (ダッシュボード分析用)
 * @param {object} user - 認証済みユーザーオブジェクト
 * @param {string} [employeeId] - フィルタリングする部下のID (オプション)
 * @returns {Promise<Array<object>>}
 */
const getAllConversationsWithTranscripts = async (user, employeeId) => {
    // 元のクエリ: WHERE organization_id = $1
    // これだと組織内の全ユーザーの会話が取得されてしまう

    // 修正後のクエリ:
    // user.roleに応じて、organization_id または user_id でフィルタリングする
    let query = `
        SELECT id, transcript FROM conversations 
    `;
    const params = [];
    const whereClauses = [];

    if (user.role === 'admin') {
        whereClauses.push(`organization_id = $${params.length + 1}`);
        params.push(user.organizationId);
    } else {
        whereClauses.push(`user_id = $${params.length + 1}`);
        params.push(user.id);
    }

    if (employeeId) {
        whereClauses.push(`employee_id = $${params.length + 1}`);
        params.push(employeeId);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    try {
        const { rows } = await pool.query(query, params);
        return rows;
    } catch (error) {
        console.error('Error in getAllConversationsWithTranscripts:', error);
        throw error;
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
    createConversationFromTranscript,
    updateConversationTranscript,
    updateConversation,
    getAllConversationsWithTranscripts,
};
