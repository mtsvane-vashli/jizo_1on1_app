// backend/controllers/dashboardController.js

const model = require('../models/conversationModel');

const getDashboardKeywords = async (req, res) => {
    try {
        const keywords = await model.getDashboardKeywords();
        res.json(keywords);
    } catch (error) {
        console.error('Error fetching dashboard keywords:', error.message);
        res.status(500).json({ error: 'Failed to fetch dashboard keywords.' });
    }
};

const getDashboardSentiments = async (req, res) => {
    try {
        const sentiments = await model.getDashboardSentiments();
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