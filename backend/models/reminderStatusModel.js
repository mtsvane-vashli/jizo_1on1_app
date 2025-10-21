const pool = require('../database');

/**
 * 直近の1on1から一定日数が経過し、まだリマインドを送っていないユーザー×部下の組み合わせを取得
 * @param {number} thresholdDays - 何日経過で対象とするか
 * @returns {Promise<Array<Object>>}
 */
const getPairsNeedingReminder = async (thresholdDays) => {
    const sql = `
        WITH latest_conversations AS (
            SELECT
                c.organization_id,
                c.user_id,
                c.employee_id,
                c.id AS conversation_id,
                c.created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY c.organization_id, c.user_id, c.employee_id
                    ORDER BY c.created_at DESC
                ) AS rn
            FROM conversations c
            WHERE c.user_id IS NOT NULL
        )
        SELECT
            lc.organization_id,
            lc.user_id,
            lc.employee_id,
            lc.conversation_id,
            lc.created_at AS last_conversation_at,
            u.email AS user_email,
            u.username AS user_name,
            e.name AS employee_name,
            rs.last_notified_conversation_id,
            rs.last_notified_at
        FROM latest_conversations lc
        JOIN users u
          ON u.id = lc.user_id
         AND u.organization_id = lc.organization_id
        JOIN employees e
          ON e.id = lc.employee_id
         AND e.organization_id = lc.organization_id
        LEFT JOIN one_on_one_reminder_statuses rs
          ON rs.organization_id = lc.organization_id
         AND rs.user_id = lc.user_id
         AND rs.employee_id = lc.employee_id
        WHERE lc.rn = 1
          AND u.email IS NOT NULL
          AND lc.created_at <= NOW() - (INTERVAL '1 day' * $1)
          AND (rs.last_notified_conversation_id IS NULL OR rs.last_notified_conversation_id <> lc.conversation_id)
    `;

    const { rows } = await pool.query(sql, [thresholdDays]);
    return rows;
};

/**
 * リマインダー送信済みとして記録する
 * @param {Object} params
 * @param {number} params.organizationId
 * @param {number} params.userId
 * @param {number} params.employeeId
 * @param {number} params.conversationId
 * @returns {Promise<void>}
 */
const markReminderSent = async ({ organizationId, userId, employeeId, conversationId }) => {
    const sql = `
        INSERT INTO one_on_one_reminder_statuses (
            organization_id,
            user_id,
            employee_id,
            last_notified_conversation_id,
            last_notified_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (organization_id, user_id, employee_id)
        DO UPDATE SET
            last_notified_conversation_id = EXCLUDED.last_notified_conversation_id,
            last_notified_at = NOW()
    `;
    await pool.query(sql, [organizationId, userId, employeeId, conversationId]);
};

module.exports = {
    getPairsNeedingReminder,
    markReminderSent
};
