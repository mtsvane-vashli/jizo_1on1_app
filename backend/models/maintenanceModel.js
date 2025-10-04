const pool = require('../database');

const getMaintenanceMessage = async () => {
    const { rows } = await pool.query(
        'SELECT id, content, updated_by, updated_at FROM maintenance_messages WHERE id = 1'
    );
    return rows[0] || null;
};

const upsertMaintenanceMessage = async (content, userId) => {
    const { rows } = await pool.query(
        `INSERT INTO maintenance_messages (id, content, updated_by, updated_at)
         VALUES (1, $1, $2, NOW())
         ON CONFLICT (id)
         DO UPDATE SET content = EXCLUDED.content,
                       updated_by = EXCLUDED.updated_by,
                       updated_at = EXCLUDED.updated_at
         RETURNING id, content, updated_by, updated_at`,
        [content, userId]
    );
    return rows[0];
};

module.exports = {
    getMaintenanceMessage,
    upsertMaintenanceMessage,
};
