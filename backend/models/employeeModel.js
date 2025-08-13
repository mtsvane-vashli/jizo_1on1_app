const pool = require('../database');

/**
 * 新しい部下を登録する
 */
const createEmployee = async (newEmployee, user) => {
    const sql = 'INSERT INTO employees (name, email, organization_id) VALUES ($1, $2, $3) RETURNING id';
    try {
        const { rows } = await pool.query(sql, [newEmployee.name, newEmployee.email, user.organizationId]);
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
 */
const getAllEmployees = async (user) => {
    let sql = `
        SELECT DISTINCT e.id, e.name, e.email 
        FROM employees e
    `;
    let params = [];

    if (user.role === 'admin') {
        // 管理者なら、組織全体の部下を取得
        sql += " WHERE e.organization_id = $1 ORDER BY e.name ASC";
        params.push(user.organizationId);
    } else {
        // ★ 修正: 自分が関わった会話に登場する部下のみを取得
        sql += `
            JOIN conversations c ON e.id = c.employee_id
            WHERE c.user_id = $1 ORDER BY e.name ASC
        `;
        params.push(user.id);
    }

    const { rows } = await pool.query(sql, params);
    return rows;
};

/**
 * 部下を削除する
 */
const deleteEmployeeById = async (employeeId, user) => {
    let sql = "DELETE FROM employees WHERE id = $1";
    let params = [employeeId];

    if (user.role === 'admin') {
        sql += " AND organization_id = $2";
        params.push(user.organizationId);
    } else {
        // ★ 修正: 自分が登録した部下、という概念がなくなったため、
        // 削除権限は管理者に限定するか、別途詳細な権限設計が必要。
        // ここでは管理者のみが削除できる仕様とします。
        // 一般ユーザーが削除しようとした場合は0件削除となり、コントローラー側で404扱いになります。
        return 0;
    }

    const { rowCount } = await pool.query(sql, params);
    return rowCount;
};

module.exports = {
    createEmployee,
    getAllEmployees,
    deleteEmployeeById
};
