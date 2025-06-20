// backend/models/conversationModel.js

const db = require('../database');

const getAllConversations = () => {
    const sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions,
               e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        ORDER BY c.timestamp DESC`;
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getConversationById = (id) => {
    const sql = `
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.employee_id,
               e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const getMessagesByConversationId = (id) => {
    const sql = "SELECT sender, text FROM messages WHERE conversation_id = ? ORDER BY id ASC";
    return new Promise((resolve, reject) => {
        db.all(sql, [id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const deleteConversationAndMessages = (id) => {
    return new Promise((resolve, reject) => {
        // .serialize を使うことで、このブロック内の処理が順番に実行されることを保証
        db.serialize(() => {
            db.run('BEGIN TRANSACTION;', (err) => {
                if (err) return reject(err);
            });

            // 外部キー制約 (ON DELETE CASCADE) があるため、conversations を削除すれば
            // 関連する messages, keywords, sentiments も自動的に削除されます。
            db.run('DELETE FROM conversations WHERE id = ?', [id], function(err) {
                if (err) {
                    db.run('ROLLBACK;', () => reject(err));
                    return;
                }
                
                const changes = this.changes;
                db.run('COMMIT;', (commitErr) => {
                    if (commitErr) {
                        reject(commitErr);
                    } else {
                        resolve(changes); // 削除された行数を返す
                    }
                });
            });
        });
    });
};


const createConversation = (theme, engagement, employeeId) => {
    const sql = 'INSERT INTO conversations (theme, engagement, employee_id) VALUES (?, ?, ?)';
    return new Promise((resolve, reject) => {
        db.run(sql, [theme, engagement, employeeId], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

const addMessage = (conversationId, sender, text) => {
    const sql = 'INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)';
    return new Promise((resolve, reject) => {
        db.run(sql, [conversationId, sender, text], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

const updateConversationEngagement = (engagement, conversationId) => {
    const sql = 'UPDATE conversations SET engagement = ? WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.run(sql, [engagement, conversationId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
};

const updateConversationSummary = (summary, nextActions, conversationId) => {
    const sql = 'UPDATE conversations SET summary = ?, next_actions = ? WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.run(sql, [summary, nextActions, conversationId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
};

const saveKeywords = (conversationId, keywords) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('DELETE FROM keywords WHERE conversation_id = ?', [conversationId], (err) => {
                if (err) return reject(err);
            });
            const stmt = db.prepare('INSERT INTO keywords (conversation_id, keyword) VALUES (?, ?)');
            keywords.forEach(keyword => {
                stmt.run(conversationId, keyword);
            });
            stmt.finalize(err => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
};

const saveSentiment = (conversationId, sentimentResult) => {
    const { overall_sentiment, positive_score, negative_score, neutral_score } = sentimentResult;
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('DELETE FROM sentiments WHERE conversation_id = ?', [conversationId], (err) => {
                if (err) return reject(err);
            });
            const sql = 'INSERT INTO sentiments (conversation_id, overall_sentiment, positive_score, negative_score, neutral_score) VALUES (?, ?, ?, ?, ?)';
            db.run(sql, [conversationId, overall_sentiment, positive_score, negative_score, neutral_score], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    });
};

const getDashboardKeywords = () => {
    const sql = `
        SELECT keyword, COUNT(keyword) as frequency
        FROM keywords
        GROUP BY keyword
        ORDER BY frequency DESC
        LIMIT 10`;
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getDashboardSentiments = () => {
    const sql = `
        SELECT
            s.overall_sentiment, s.positive_score, s.negative_score, s.neutral_score, c.timestamp AS conversation_timestamp
        FROM sentiments s
        JOIN conversations c ON s.conversation_id = c.id
        ORDER BY c.timestamp ASC
        LIMIT 20`;
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = {
    getAllConversations,
    getConversationById,
    getMessagesByConversationId,
    deleteConversationAndMessages,
    getAllConversations,
    getConversationById,
    getMessagesByConversationId,
    deleteConversationAndMessages,
    createConversation, // 追加
    addMessage, // 追加
    updateConversationEngagement, // 追加
    updateConversationSummary, // 追加
    saveKeywords, // 追加
    saveSentiment, // 追加
    getDashboardKeywords, // 追加
    getDashboardSentiments, // 追加
};