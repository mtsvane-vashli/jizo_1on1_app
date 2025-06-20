// backend/controllers/employeeController.js

const employeeModel = require('../models/employeeModel');

/**
 * 部下を追加する処理
 */
const addEmployee = async (req, res) => {
    const { name, email } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Employee name is required.' });
    }

    try {
        const employeeId = await employeeModel.createEmployee(name, email);
        res.status(201).json({ id: employeeId, name, email });
    } catch (error) {
        console.error('Error adding new employee:', error.message);
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message }); // 409 Conflict
        }
        res.status(500).json({ error: 'Failed to add new employee.' });
    }
};

/**
 * 部下一覧を取得する処理
 */
const getEmployees = async (req, res) => {
    try {
        const employees = await employeeModel.getAllEmployees();
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error.message);
        res.status(500).json({ error: 'Failed to fetch employees.' });
    }
};

module.exports = {
    addEmployee,
    getEmployees
};