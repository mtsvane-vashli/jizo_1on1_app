const pool = require('../database');

/**
 * 新しい部下を登録する
 * - 登録後、作成者ユーザーとのリンクを自動作成（冪等）
 */
const createEmployee = async (newEmployee, user) => {
    const sql = 'INSERT INTO employees (name, email, organization_id) VALUES ($1, $2, $3) RETURNING id';
    try {
        const { rows } = await pool.query(sql, [newEmployee.name, newEmployee.email, user.organizationId]);
        const employeeId = rows[0].id;

        // 作成者 ⇄ 部下 のリンクを自動付与（admin でも問題なし、冪等）
        await pool.query(
            `INSERT INTO user_employee_links (organization_id, user_id, employee_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_id, employee_id) DO NOTHING`,
            [user.organizationId, user.id, employeeId]
        );

        return employeeId;
    } catch (err) {
        if (err.code === '23505') {
            // 現在の一意制約は email のみ（NULL は許容）
            throw new Error('Employee with this email already exists in this organization.');
        }
        throw err;
    }
};

/**
 * 部下一覧を取得する
 * - admin: 組織内の全ての部下
 * - user : 自分にリンクされた部下のみ
 */
const getAllEmployees = async (user) => {
    if (user.role === 'admin') {
        const sql = `SELECT DISTINCT e.id, e.name, e.email
                   FROM employees e
                  WHERE e.organization_id = $1
                  ORDER BY e.name ASC`;
        const { rows } = await pool.query(sql, [user.organizationId]);
        return rows;
    } else {
        const sql = `
      SELECT DISTINCT e.id, e.name, e.email
        FROM user_employee_links uel
        JOIN employees e
          ON e.id = uel.employee_id
         AND e.organization_id = uel.organization_id
       WHERE uel.user_id = $1
         AND uel.organization_id = $2
       ORDER BY e.name ASC
    `;
        const { rows } = await pool.query(sql, [user.id, user.organizationId]);
        return rows;
    }
};

/**
 * 部下を削除する
 * - 仕様: 管理者のみ削除可能（安全側）
 */
const deleteEmployeeById = async (employeeId, user) => {
    if (user.role !== 'admin') {
        // 一般ユーザーは削除不可（0件削除として返す）
        return 0;
    }
    const sql = "DELETE FROM employees WHERE id = $1 AND organization_id = $2";
    const { rowCount } = await pool.query(sql, [employeeId, user.organizationId]);
    return rowCount;
};

module.exports = {
    createEmployee,
    getAllEmployees,
    deleteEmployeeById
};
    
