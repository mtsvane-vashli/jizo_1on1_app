const pool = require('../database');

/**
 * メッセージをDBに追加します。
 * @param {number} conversationId - 会話ID
 * @param {string} sender - 送信者 ('user', 'employee', 'ai')
 * @param {string} message - メッセージ本文
 * @param {Array<string>|null} suggestedQuestions - AIが生成した質問候補
 * @returns {Promise<number>} 追加されたメッセージのID
 */
const addMessage = async (conversationId, sender, message, suggestedQuestions = null) => {
    const sql = 'INSERT INTO messages (conversation_id, sender, message, suggested_questions) VALUES ($1, $2, $3, $4) RETURNING id';
    // suggestedQuestionsが配列の場合、JSON文字列に変換して保存
    const questionsJson = suggestedQuestions ? JSON.stringify(suggestedQuestions) : null;
    const { rows } = await pool.query(sql, [conversationId, sender, message, questionsJson]);
    return rows[0].id;
};

/**
 * 特定のIDの会話と、関連する全てのメッセージを取得します。
 * @param {number} id - 会話ID
 * @param {object} user - 認証済みユーザー情報
 * @returns {Promise<object|null>} 会話データ、またはnull
 */
const getConversationById = async (id, user) => {
    let convSql = `
        SELECT c.*, e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = $1 `;
    let params = [id];

    // ユーザーロールに応じた権限チェック
    if (user.role === 'admin') {
        convSql += `AND c.organization_id = $2`;
        params.push(user.organizationId);
    } else {
        convSql += `AND c.user_id = $2`;
        params.push(user.id);
    }

    const { rows: convRows } = await pool.query(convSql, params);
    const conversation = convRows[0];

    if (!conversation) {
        return null; // 会話が存在しないか、アクセス権がない
    }

    // 関連するメッセージを取得
    const msgSql = "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC";
    const { rows: messageRows } = await pool.query(msgSql, [id]);

    // DBから取得したデータは既にJSONオブジェクトなのでパースは不要
    conversation.messages = messageRows;

    return conversation;
};

const createConversation = async (convData, user) => {
    const sql = 'INSERT INTO conversations (theme, engagement, employee_id, organization_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const params = [convData.theme, convData.engagement, convData.employeeId, user.organizationId, user.id];
    const { rows } = await pool.query(sql, params);
    return rows[0].id;
};

// --- 以下、元のファイルにあった他のモデル関数 ---

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

const getMessagesByConversationId = async (id) => {
    // 注意: この関数は新しい `messages` テーブルに合わせて修正が必要です。
    // `text` カラムは `message` に変更されています。
    const sql = "SELECT m.sender, m.message FROM messages m WHERE m.conversation_id = $1 ORDER BY created_at ASC";
    const { rows } = await pool.query(sql, [id]);
    return rows;
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
    const { transcript, memo, mindMapData } = dataToUpdate;
    const fields = [];
    const values = [];
    let query = 'UPDATE conversations SET ';

    if (typeof transcript !== 'undefined') {
        fields.push(`transcript = $${values.length + 1}`);
        values.push(transcript);
    }
    if (typeof memo !== 'undefined') {
        fields.push(`memo = $${values.length + 1}`);
        values.push(memo);
    }
    if (typeof mindMapData !== 'undefined') {
        fields.push(`mind_map_data = $${values.length + 1}`);
        values.push(JSON.stringify(mindMapData)); // JSONBに保存するために文字列化
    }

    if (fields.length === 0) {
        return getConversationById(id, user); // 更新対象がない場合は何もしない
    }

    query += fields.join(', ');
    query += ` WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`;
    values.push(id, user.id);

    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error('Error in updateConversation model:', error);
        throw error;
    }
};

const getAllConversationsWithTranscripts = async (user, employeeId) => {
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
