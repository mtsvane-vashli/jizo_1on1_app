// backend/models/conversationModel.js (修正後)

const pool = require('../database');

/**
 * 会話履歴一覧を取得する (役割に応じて結果が変わる)
 * @param {object} user - ログイン中のユーザー ({ id, role, organizationId })
 */
const getAllConversations = async (user) => {
    let sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.transcript,
               e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id `;
    let params = [];

    // ★ ユーザーの役割に応じて、実行するクエリを動的に変更
    if (user.role === 'admin') {
        // 管理者なら、組織全体の会話を取得
        sql += `WHERE c.organization_id = $1 ORDER BY c.timestamp DESC`;
        params.push(user.organizationId);
    } else {
        // 一般ユーザーなら、自分が担当した会話のみ取得
        sql += `WHERE c.user_id = $1 ORDER BY c.timestamp DESC`;
        params.push(user.id);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
};

/**
 * 特定の会話詳細を取得する (役割に応じてアクセスを制限)
 * @param {number} id
 * @param {object} user
 */
const getConversationById = async (id, user) => {
    let sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.employee_id, c.user_id, c.transcript,
               e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = $1 `;
    let params = [id];

    // ★ ユーザーの役割に応じて、アクセスできる範囲を制限
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

/**
 * 特定の会話のメッセージを取得する
 * (この関数を呼び出す前に、コントローラーで getConversationById を使って権限を確認済みの前提)
 * @param {number} id
 */
const getMessagesByConversationId = async (id) => {
    const sql = "SELECT m.sender, m.text FROM messages m WHERE m.conversation_id = $1 ORDER BY m.id ASC";
    const { rows } = await pool.query(sql, [id]);
    return rows;
};


/**
 * 新しい会話を作成する
 * @param {object} convData - { theme, engagement, employeeId }
 * @param {object} user
 */
const createConversation = async (convData, user) => {
    const sql = 'INSERT INTO conversations (theme, engagement, employee_id, organization_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const params = [convData.theme, convData.engagement, convData.employeeId, user.organizationId, user.id];
    const { rows } = await pool.query(sql, params);
    return rows[0].id;
};


/**
 * 特定の会話を削除する
 * @param {number} id
 * @param {object} user
 */
const deleteConversationAndMessages = async (id, user) => {
    let sql = 'DELETE FROM conversations WHERE id = $1 ';
    let params = [id];

    if (user.role !== 'admin') { // 管理者でない場合は、自分の会話しか削除できない
        sql += 'AND user_id = $2';
        params.push(user.id);
    } else { // 管理者は組織が一致すればOK
        sql += 'AND organization_id = $2';
        params.push(user.organizationId);
    }
    const result = await pool.query(sql, params);
    return result.rowCount;
};

/**
 * 文字起こし結果から新しい会話レコードを作成する
 * @param {string} transcript - 保存する文字起こしテキスト
 * @param {number} employeeId - 紐付ける従業員のID 
 * @param {object} user - ログイン中のユーザー情報
 * @returns {object} 作成された会話レコード
 */
const createConversationFromTranscript = async (transcript, employeeId, user) => {
    const sql = `
        INSERT INTO conversations (transcript, user_id, organization_id, theme, employee_id) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`;
    
    // themeは必須項目のようなので、仮のテーマを設定
    const theme = "リアルタイム文字起こしセッション";
    const params = [transcript, user.id, user.organizationId, theme, employeeId];
    
    const { rows } = await pool.query(sql, params);
    return rows[0];
};

/**
 * 特定の会話のエンゲージメントを更新する
 * (権限チェックはコントローラーで行う)
 * @param {string} engagement
 * @param {number} conversationId
 */
const updateConversationEngagement = async (engagement, conversationId) => {
    const sql = 'UPDATE conversations SET engagement = $1 WHERE id = $2';
    const result = await pool.query(sql, [engagement, conversationId]);
    return result.rowCount;
};

/**
 * 特定の会話の要約等を更新する
 * (権限チェックはコントローラーで行う)
 * @param {string} summary
 * @param {string} nextActions
 * @param {number} conversationId
 */
const updateConversationSummary = async (summary, nextActions, conversationId) => {
    const sql = 'UPDATE conversations SET summary = $1, next_actions = $2 WHERE id = $3';
    const { rows } = await pool.query(sql, [summary, nextActions, conversationId]);
    return rows;
};

/**
 * 特定の会話の文字起こしを更新する
 * (権限チェックはコントローラーで行う)
 * @param {string} transcript
 * @param {number} conversationId
 */
const updateConversationTranscript = async (transcript, conversationId) => {
    const sql = 'UPDATE conversations SET transcript = $1 WHERE id = $2';
    const { rows } = await pool.query(sql, [transcript, conversationId]);
    return rows;
};

// --- 権限チェックをコントローラーに委ねる関数群（変更不要） ---
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


/**
 * ダッシュボード用キーワードデータを取得する (役割に応じて結果が変わる)
 * @param {object} user
 */
const getDashboardKeywords = async (user) => {
    let sql = `
        SELECT k.keyword, COUNT(k.keyword)::int as frequency
        FROM keywords k
        JOIN conversations c ON k.conversation_id = c.id `;
    let params = [];

    if (user.role === 'admin') {
        sql += `WHERE c.organization_id = $1 GROUP BY k.keyword ORDER BY frequency DESC LIMIT 10`;
        params.push(user.organizationId);
    } else {
        sql += `WHERE c.user_id = $1 GROUP BY k.keyword ORDER BY frequency DESC LIMIT 10`;
        params.push(user.id);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
};

/**
 * ダッシュボード用感情データを取得する (役割に応じて結果が変わる)
 * @param {object} user
 */
const getDashboardSentiments = async (user) => {
    let sql = `
        SELECT s.overall_sentiment, s.positive_score, s.negative_score, s.neutral_score, c.timestamp AS conversation_timestamp
        FROM sentiments s
        JOIN conversations c ON s.conversation_id = c.id `;
    let params = [];
    
    if (user.role === 'admin') {
        sql += `WHERE c.organization_id = $1 ORDER BY c.timestamp ASC LIMIT 20`;
        params.push(user.organizationId);
    } else {
        sql += `WHERE c.user_id = $1 ORDER BY c.timestamp ASC LIMIT 20`;
        params.push(user.id);
    }
    const { rows } = await pool.query(sql, params);
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
    createConversationFromTranscript,
    updateConversationTranscript,
};