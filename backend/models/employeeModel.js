// backend/models/employeeModel.js (修正後)

const pool = require('../database');

/**
 * 新しい部下を登録する
 * @param {object} newEmployee - { name, email }
 * @param {object} user - 作成を実行したユーザー
 * @returns {Promise<number>}
 */
const createEmployee = async (newEmployee, user) => {
    // ★ 組織IDと、作成者であるユーザーIDの両方を記録する
    const sql = 'INSERT INTO employees (name, email, organization_id, user_id) VALUES ($1, $2, $3, $4) RETURNING id';
    try {
        const { rows } = await pool.query(sql, [newEmployee.name, newEmployee.email, user.organizationId, user.id]);
        return rows[0].id;
    } catch (err) {
        if (err.code === '23505') {
            throw new Error('Employee with this name or email already exists in this organization.');
        }
        throw err;
    }
};

/**
 * 部下一覧を取得する (役割に応じて結果が変わる)
 * @param {object} user - ログイン中のユーザー
 * @returns {Promise<Array<object>>}
 */
const getAllEmployees = async (user) => {
    let sql = "SELECT id, name, email FROM employees";
    let params = [];

    // ★ ユーザーの役割に応じて、実行するクエリを動的に変更
    if (user.role === 'admin') {
        // 管理者なら、組織全体の部下を取得
        sql += " WHERE organization_id = $1 ORDER BY name ASC";
        params.push(user.organizationId);
    } else {
        // 一般ユーザーなら、自分が登録した部下のみ取得
        sql += " WHERE user_id = $1 ORDER BY name ASC";
        params.push(user.id);
    }

    const { rows } = await pool.query(sql, params);
    return rows;
};

module.exports = {
    createEmployee,
    getAllEmployees
};