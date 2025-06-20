// backend/models/userModel.js

const db = require('../database');

/**
 * ユーザー名でユーザーを検索する
 * @param {string} username - 検索するユーザー名
 * @returns {Promise<object|null>} ユーザーオブジェクト or null
 */
const findUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

/**
 * 新しいユーザーを作成する
 * @param {string} username - 新しいユーザー名
 * @param {string} hashedPassword - ハッシュ化されたパスワード
 * @returns {Promise<number>} 作成されたユーザーのID
 */
const createUser = (username, hashedPassword) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    reject(new Error('Username already exists.'));
                } else {
                    reject(err);
                }
            } else {
                resolve(this.lastID);
            }
        });
    });
};

module.exports = {
    findUserByUsername,
    createUser
};