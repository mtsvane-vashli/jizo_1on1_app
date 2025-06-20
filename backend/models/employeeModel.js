// backend/models/employeeModel.js

const db = require('../database');

/**
 * 新しい部下を登録する
 * @param {string} name - 部下の名前
 * @param {string} email - 部下のメールアドレス
 * @returns {Promise<number>} 作成された部下のID
 */
const createEmployee = (name, email) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO employees (name, email) VALUES (?, ?)', [name, email], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    reject(new Error('Employee with this name or email already exists.'));
                } else {
                    reject(err);
                }
            } else {
                resolve(this.lastID);
            }
        });
    });
};

/**
 * 全ての部下情報を取得する
 * @returns {Promise<Array<object>>} 部下情報の配列
 */
const getAllEmployees = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, name, email FROM employees ORDER BY name ASC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = {
    createEmployee,
    getAllEmployees
};