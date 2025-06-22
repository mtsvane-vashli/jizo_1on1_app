// backend/controllers/employeeController.js (修正後)

const employeeModel = require('../models/employeeModel');

const addEmployee = async (req, res) => {
    const { name, email } = req.body;
    const user = req.user; // ★ req.user を取得

    if (!name) {
        return res.status(400).json({ error: 'Employee name is required.' });
    }

    try {
        // ★ modelに {name, email} と user オブジェクトを渡す
        const employeeId = await employeeModel.createEmployee({ name, email }, user);
        res.status(201).json({ id: employeeId, name, email });
    } catch (error) {
        console.error('Error adding new employee:', error.message);
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to add new employee.' });
    }
};

const getEmployees = async (req, res) => {
    const user = req.user; // ★ req.user を取得
    try {
        // ★ modelに user オブジェクトを渡す
        const employees = await employeeModel.getAllEmployees(user);
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