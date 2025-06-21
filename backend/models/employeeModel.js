// backend/models/employeeModel.js (PostgreSQL版)

const db = require('../database');

/**
 * 新しい部下を登録する
 * @param {string} name - 部下の名前
 * @param {string} email - 部下のメールアドレス
 * @returns {Promise<number>} 作成された部下のID
 */
const createEmployee = async (name, email) => {
    const sql = 'INSERT INTO employees (name, email) VALUES ($1, $2) RETURNING id';
    try {
        const { rows } = await db.query(sql, [name, email]);
        return rows[0].id;
    } catch (err) {
        // 23505 は UNIQUE 制約違反のエラーコード
        if (err.code === '23505') {
            throw new Error('Employee with this name or email already exists.');
        }
        throw err;
    }
};

/**
 * 全ての部下情報を取得する
 * @returns {Promise<Array<object>>} 部下情報の配列
 */
const getAllEmployees = async () => {
    const sql = "SELECT id, name, email FROM employees ORDER BY name ASC";
    try {
        const { rows } = await db.query(sql);
        return rows;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    createEmployee,
    getAllEmployees
};