const pool = require('../database');

/**
 * 補助: 対象の部下がユーザーの所属組織に属しているか確認
 */
async function isEmployeeInOrg(employeeId, organizationId) {
    const { rows } = await pool.query(
        'SELECT 1 FROM employees WHERE id = $1 AND organization_id = $2',
        [employeeId, organizationId]
    );
    return rows.length > 0;
}

/**
 * 補助: ユーザーが部下にリンク済みか
 */
async function isUserLinkedToEmployee(employeeId, user) {
    const { rows } = await pool.query(
        `SELECT 1
       FROM user_employee_links
      WHERE organization_id = $1
        AND user_id = $2
        AND employee_id = $3`,
        [user.organizationId, user.id, employeeId]
    );
    return rows.length > 0;
}

/**
 * 補助: 未リンクならリンクを作成（冪等）
 * 管理者は全件閲覧可能だが、作成者トレースのためにリンクを作っておいても副作用はない
 */
async function linkUserToEmployeeIfMissing(employeeId, user) {
    await pool.query(
        `INSERT INTO user_employee_links (organization_id, user_id, employee_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id, user_id, employee_id) DO NOTHING`,
        [user.organizationId, user.id, employeeId]
    );
}

/**
 * メッセージをDBに追加します。
 * ※ 既存スキーマに合わせて messages(message) を使用（text ではない）
 * @param {number} conversationId
 * @param {string} sender - 'user' | 'employee' | 'ai'
 * @param {string} message
 * @param {Array<string>|null} suggestedQuestions
 * @returns {Promise<number>}
 */
const addMessage = async (conversationId, sender, message, suggestedQuestions = null) => {
    const sql = 'INSERT INTO messages (conversation_id, sender, message, suggested_questions) VALUES ($1, $2, $3, $4) RETURNING id';
    const questionsJson = suggestedQuestions ? JSON.stringify(suggestedQuestions) : null;
    const { rows } = await pool.query(sql, [conversationId, sender, message, questionsJson]);
    return rows[0].id;
};

/**
 * 特定の会話を取得（メッセージ含む）
 * - admin: 組織内の任意の会話を取得可
 * - user : 自分にリンクされた部下の会話のみ取得可
 */
const getConversationById = async (id, user) => {
    let convSql = `
    SELECT c.*, e.name AS employee_name, e.email AS employee_email
      FROM conversations c
      LEFT JOIN employees e ON c.employee_id = e.id
     WHERE c.id = $1
  `;
    const params = [id];

    if (user.role === 'admin') {
        convSql += ` AND c.organization_id = $2`;
        params.push(user.organizationId);
    } else {
        convSql += `
      AND c.organization_id = $2
      AND EXISTS (
        SELECT 1
          FROM user_employee_links uel
         WHERE uel.organization_id = c.organization_id
           AND uel.user_id = $3
           AND uel.employee_id = c.employee_id
      )`;
        params.push(user.organizationId, user.id);
    }

    const { rows: convRows } = await pool.query(convSql, params);
    const conversation = convRows[0];
    if (!conversation) return null;

    const msgSql = "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC";
    const { rows: messageRows } = await pool.query(msgSql, [id]);
    conversation.messages = messageRows;

    return conversation;
};

/**
 * 会話を作成
 * - admin: 組織内ならOK
 * - user : 同一組織 + 自分と部下のリンクが無ければ自動作成（冪等）
 */
const createConversation = async (convData, user) => {
    // 組織整合
    const okOrg = await isEmployeeInOrg(convData.employeeId, user.organizationId);
    if (!okOrg) {
        throw new Error('Employee does not belong to your organization.');
    }

    // user の場合はリンクを作成しておく（未リンクなら付与）
    if (user.role !== 'admin') {
        await linkUserToEmployeeIfMissing(convData.employeeId, user);
    }

    const sql = `
    INSERT INTO conversations (theme, engagement, employee_id, organization_id, user_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
    const params = [convData.theme, convData.engagement, convData.employeeId, user.organizationId, user.id];
    const { rows } = await pool.query(sql, params);
    return rows[0].id;
};

/**
 * 会話一覧
 * - admin: 組織内全件
 * - user : 自分にリンクされた部下の会話のみ
 */
const getAllConversations = async (user) => {
    if (user.role === 'admin') {
        const sql = `
      SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.transcript,
             e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
       WHERE c.organization_id = $1
       ORDER BY c.timestamp DESC
    `;
        const { rows } = await pool.query(sql, [user.organizationId]);
        return rows;
    } else {
        const sql = `
      SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.transcript,
             e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        JOIN user_employee_links uel
          ON uel.organization_id = c.organization_id
         AND uel.employee_id = c.employee_id
         AND uel.user_id = $1
        LEFT JOIN employees e ON c.employee_id = e.id
       WHERE c.organization_id = $2
       ORDER BY c.timestamp DESC
    `;
        const { rows } = await pool.query(sql, [user.id, user.organizationId]);
        return rows;
    }
};

/**
 * 会話IDに紐づくメッセージ群
 * ※ スキーマは messages(message) を前提
 */
const getMessagesByConversationId = async (id) => {
    const sql = "SELECT m.sender, m.message FROM messages m WHERE m.conversation_id = $1 ORDER BY created_at ASC";
    const { rows } = await pool.query(sql, [id]);
    return rows;
};

/**
 * 会話削除
 * - admin: 組織内であれば削除可
 * - user :（安全側）自分が作成した会話のみ削除可
 */
const deleteConversationAndMessages = async (id, user) => {
    let sql = 'DELETE FROM conversations WHERE id = $1 ';
    const params = [id];

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

/**
 * 文字起こしから会話を新規作成
 * - user の場合は未リンクなら自動リンク
 */
const createConversationFromTranscript = async (transcript, employeeId, user) => {
    const okOrg = await isEmployeeInOrg(employeeId, user.organizationId);
    if (!okOrg) throw new Error('Employee does not belong to your organization.');

    if (user.role !== 'admin') {
        await linkUserToEmployeeIfMissing(employeeId, user);
    }

    const sql = `
    INSERT INTO conversations (transcript, user_id, organization_id, theme, employee_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
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

/**
 * キーワード集計
 * - admin: 組織内全件
 * - user : 自分リンク部下の会話のみ
 */
const getDashboardKeywords = async (user, employeeId) => {
    const params = [];
    let sql = `
    SELECT k.keyword, COUNT(k.keyword)::int as frequency
      FROM keywords k
      JOIN conversations c ON k.conversation_id = c.id
  `;

    if (user.role === 'admin') {
        sql += ` WHERE c.organization_id = $1`;
        params.push(user.organizationId);
    } else {
        sql += `
      JOIN user_employee_links uel
        ON uel.organization_id = c.organization_id
       AND uel.employee_id = c.employee_id
       AND uel.user_id = $1
     WHERE c.organization_id = $2
    `;
        params.push(user.id, user.organizationId);
    }

    if (employeeId) {
        sql += ` AND c.employee_id = $${params.length + 1}`;
        params.push(employeeId);
    }

    sql += ` GROUP BY k.keyword ORDER BY frequency DESC LIMIT 10`;

    const { rows } = await pool.query(sql, params);
    return rows;
};

/**
 * 感情時系列
 * - admin: 組織内全件
 * - user : 自分リンク部下の会話のみ
 */
const getDashboardSentiments = async (user, employeeId) => {
    const params = [];
    let sql = `
    SELECT s.overall_sentiment, s.positive_score, s.negative_score, s.neutral_score, c.timestamp AS conversation_timestamp
      FROM sentiments s
      JOIN conversations c ON s.conversation_id = c.id
  `;

    if (user.role === 'admin') {
        sql += ` WHERE c.organization_id = $1`;
        params.push(user.organizationId);
    } else {
        sql += `
      JOIN user_employee_links uel
        ON uel.organization_id = c.organization_id
       AND uel.employee_id = c.employee_id
       AND uel.user_id = $1
     WHERE c.organization_id = $2
    `;
        params.push(user.id, user.organizationId);
    }

    if (employeeId) {
        sql += ` AND c.employee_id = $${params.length + 1}`;
        params.push(employeeId);
    }

    sql += ` ORDER BY c.timestamp ASC LIMIT 20`;

    const { rows } = await pool.query(sql, params);
    return rows;
};

/**
 * 部分更新（transcript / memo / mindMapData）
 * - admin: 組織内なら更新可
 * - user : 自分リンク部下の会話のみ更新可
 */
const updateConversation = async (id, dataToUpdate, user) => {
    const transcript = dataToUpdate.transcript;
    const memo = dataToUpdate.memo;
    const mindMapData = (typeof dataToUpdate.mindMapData !== 'undefined')
        ? dataToUpdate.mindMapData
        : dataToUpdate.mind_map_data;

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
        values.push(JSON.stringify(mindMapData));
    }

    if (fields.length === 0) {
        return getConversationById(id, user);
    }

    query += fields.join(', ');

    if (user.role === 'admin') {
        query += ` WHERE id = $${values.length + 1} AND organization_id = $${values.length + 2} RETURNING *`;
        values.push(id, user.organizationId);
    } else {
        // リンク済み部下の会話かどうかで制限
        query += ` WHERE id = $${values.length + 1}
               AND organization_id = $${values.length + 2}
               AND EXISTS (
                 SELECT 1
                   FROM user_employee_links uel
                  WHERE uel.organization_id = conversations.organization_id
                    AND uel.employee_id = conversations.employee_id
                    AND uel.user_id = $${values.length + 3}
               )
               RETURNING *`;
        values.push(id, user.organizationId, user.id);
    }

    const { rows } = await pool.query(query, values);
    return rows[0];
};

/**
 * 文字起こし一覧（ダッシュボード用）
 */
const getAllConversationsWithTranscripts = async (user, employeeId) => {
    const params = [];
    let query = `
    SELECT c.id, c.transcript
      FROM conversations c
  `;

    if (user.role === 'admin') {
        query += ` WHERE c.organization_id = $1`;
        params.push(user.organizationId);
    } else {
        query += `
      JOIN user_employee_links uel
        ON uel.organization_id = c.organization_id
       AND uel.employee_id = c.employee_id
       AND uel.user_id = $1
     WHERE c.organization_id = $2
    `;
        params.push(user.id, user.organizationId);
    }

    if (employeeId) {
        query += ` AND c.employee_id = $${params.length + 1}`;
        params.push(employeeId);
    }

    const { rows } = await pool.query(query, params);
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
    saveKeywords: async (conversationId, keywords) => {
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
    },
    saveSentiment: async (conversationId, sentimentResult) => {
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
    },
    createConversationFromTranscript,
    updateConversationTranscript,
    updateConversation,
    getAllConversationsWithTranscripts,
};
