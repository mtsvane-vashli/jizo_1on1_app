// backend/controllers/dashboardController.js (修正後)

const model = require('../models/conversationModel');

const getDashboardKeywords = async (req, res) => {
    const user = req.user; // ★ req.user を取得
    try {
        const keywords = await model.getDashboardKeywords(user); // ★ modelに user を渡す
        res.json(keywords);
    } catch (error) {
        console.error('Error fetching dashboard keywords:', error.message);
        res.status(500).json({ error: 'Failed to fetch dashboard keywords.' });
    }
};

const getDashboardSentiments = async (req, res) => {
    const user = req.user; // ★ req.user を取得
    try {
        const sentiments = await model.getDashboardSentiments(user); // ★ modelに user を渡す
        res.json(sentiments);
    } catch (error) {
        console.error('Error fetching dashboard sentiments:', error.message);
        res.status(500).json({ error: 'Failed to fetch dashboard sentiments.' });
    }
};

module.exports = {
    getDashboardKeywords,
    getDashboardSentiments
};