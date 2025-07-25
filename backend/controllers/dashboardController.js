// backend/controllers/dashboardController.js (会話比率のロジックを削除)

const model = require('../models/conversationModel');
const aiService = require('../services/aiService');

// --- 既存の関数 (変更なし) ---
const getDashboardKeywords = async (req, res) => {
    const user = req.user;
    const employeeId = req.query.employeeId;
    try {
        const keywords = await model.getDashboardKeywords(user, employeeId);
        res.json(keywords);
    } catch (error) {
        console.error('Error fetching dashboard keywords:', error.message);
        res.status(500).json({ error: 'Failed to fetch dashboard keywords.' });
    }
};

const getDashboardSentiments = async (req, res) => {
    const user = req.user;
    const employeeId = req.query.employeeId;
    try {
        const sentiments = await model.getDashboardSentiments(user, employeeId);
        res.json(sentiments);
    } catch (error) {
        console.error('Error fetching dashboard sentiments:', error.message);
        res.status(500).json({ error: 'Failed to fetch dashboard sentiments.' });
    }
};

// --- ★★★ ここからが修正箇所 ★★★ ---

// 課題・懸念事項をAIで抽出し要約するコントローラー関数
const getIssues = async (req, res) => {
    try {
        const user = req.user;
        const employeeId = req.query.employeeId;

        const conversations = await model.getAllConversationsWithTranscripts(user, employeeId);
        if (!conversations || conversations.length === 0) {
            return res.status(200).json([]);
        }

        let allIssues = [];
        const analysisPromises = conversations.map(async (conv) => {
            if (conv.transcript && conv.transcript.trim().length > 10) {
                const prompt = aiService.getIssuesSummaryPrompt(conv.transcript, conv.id);
                const aiResponse = await aiService.generateContent(prompt);
                try {
                    const issues = JSON.parse(aiResponse);
                    if (Array.isArray(issues)) {
                        return issues.map((issue, index) => ({ ...issue, id: `issue-${conv.id}-${index}` }));
                    }
                } catch (e) {
                    console.error(`AIレスポンス(Issues)のJSONパースに失敗 (Conv ID: ${conv.id}):`, aiResponse);
                    return [];
                }
            }
            return [];
        });

        const results = await Promise.all(analysisPromises);
        allIssues = results.flat();

        res.status(200).json(allIssues);
    } catch (error) {
        console.error('Error fetching issues:', error.message);
        res.status(500).json({ message: "Error fetching issues", error: error.message });
    }
};

// ポジティブな変化をAIで抽出し要約するコントローラー関数
const getPositives = async (req, res) => {
    try {
        const user = req.user;
        const employeeId = req.query.employeeId;

        const conversations = await model.getAllConversationsWithTranscripts(user, employeeId);
        if (!conversations || conversations.length === 0) {
            return res.status(200).json([]);
        }

        let allPositives = [];
        const analysisPromises = conversations.map(async (conv) => {
            if (conv.transcript && conv.transcript.trim().length > 10) {
                const prompt = aiService.getPositivesSummaryPrompt(conv.transcript, conv.id);
                const aiResponse = await aiService.generateContent(prompt);
                try {
                    const positives = JSON.parse(aiResponse);
                    if (Array.isArray(positives)) {
                        return positives.map((p, index) => ({ ...p, id: `positive-${conv.id}-${index}` }));
                    }
                } catch (e) {
                    console.error(`AIレスポンス(Positives)のJSONパースに失敗 (Conv ID: ${conv.id}):`, aiResponse);
                    return [];
                }
            }
            return [];
        });

        const results = await Promise.all(analysisPromises);
        allPositives = results.flat();

        res.status(200).json(allPositives);
    } catch (error) {
        console.error('Error fetching positives:', error.message);
        res.status(500).json({ message: "Error fetching positives", error: error.message });
    }
};

// ★★★ getTalkRatio 関数をここから削除 ★★★


module.exports = {
    getDashboardKeywords,
    getDashboardSentiments,
    getIssues,
    getPositives,
    // ★★★ getTalkRatio を exports から削除 ★★★
};
