const conversationModel = require('../models/conversationModel');
const aiService = require('../services/aiService');

// startConversation, postMessage, listConversations, getConversationDetails, updateConversation, deleteConversation の各関数は変更ありません

exports.startConversation = async (req, res) => {
    const { employeeId, employeeName, theme, stance } = req.body;
    const user = req.user;

    if (!employeeId || !theme || !stance) {
        return res.status(400).json({ message: 'Employee ID, theme, and stance are required' });
    }

    try {
        const convData = { employeeId, theme, engagement: stance };
        const conversationId = await conversationModel.createConversation(convData, user);
        const initialAiData = await aiService.generateInitialMessage(employeeName || '部下', theme, stance);

        await conversationModel.addMessage(
            conversationId, 'ai', initialAiData.response_text, initialAiData.suggested_questions
        );

        res.status(201).json({
            message: 'Conversation started successfully',
            conversationId,
            initialMessage: {
                sender: 'ai',
                message: initialAiData.response_text,
                suggested_questions: initialAiData.suggested_questions,
            }
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({ message: 'Failed to start conversation' });
    }
};
exports.postMessage = async (req, res) => {
    const { id: conversationId } = req.params;
    const { sender, message } = req.body;
    const user = req.user;

    if (!sender || !message) {
        return res.status(400).json({ message: 'Sender and message are required.' });
    }

    try {
        const conversation = await conversationModel.getConversationById(conversationId, user);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found or access denied.' });
        }

        await conversationModel.addMessage(conversationId, sender, message);

        const updatedHistory = [...conversation.messages, { sender, message }];
        const aiData = await aiService.generateFollowUp(updatedHistory, conversation.theme, conversation.engagement);

        const aiMessageId = await conversationModel.addMessage(
            conversationId, 'ai', aiData.response_text, aiData.suggested_questions
        );

        res.status(201).json({
            id: aiMessageId,
            sender: 'ai',
            message: aiData.response_text,
            suggested_questions: aiData.suggested_questions,
        });
    } catch (error) {
        console.error(`Error posting message to conversation ${conversationId}:`, error);
        res.status(500).json({ message: 'Failed to process message.' });
    }
};
exports.listConversations = async (req, res) => {
    try {
        const conversations = await conversationModel.getAllConversations(req.user);
        res.json(conversations);
    } catch (error) {
        console.error('Error listing conversations:', error);
        res.status(500).json({ error: 'Failed to retrieve conversations.' });
    }
};
exports.getConversationDetails = async (req, res) => {
    try {
        const conversation = await conversationModel.getConversationById(req.params.id, req.user);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        res.json(conversation);
    } catch (error) {
        console.error('Error getting conversation details:', error);
        res.status(500).json({ error: 'Failed to retrieve conversation details.' });
    }
};
exports.updateConversation = async (req, res) => {
    try {
        const updatedConversation = await conversationModel.updateConversation(req.params.id, req.body, req.user);
        if (!updatedConversation) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        res.json(updatedConversation);
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Failed to update conversation.' });
    }
};
exports.deleteConversation = async (req, res) => {
    try {
        const deletedCount = await conversationModel.deleteConversationAndMessages(req.params.id, req.user);
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        res.status(204).send(); // 成功時はボディなし
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
};


/**
 * ★★★ 新規追加: 会話を要約し、各種分析を実行する ★★★
 */
exports.summarizeConversation = async (req, res) => {
    const { id: conversationId } = req.params;
    const { transcript } = req.body;
    const user = req.user;

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required.' });
    }

    try {
        const conversation = await conversationModel.getConversationById(conversationId, user);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }

        const messages = await conversationModel.getMessagesByConversationId(conversationId);
        const formattedMessages = messages.map(msg => `${msg.sender === 'user' ? '上司' : 'AI'}: ${msg.message}`).join('\n');
        const fullTranscript = transcript || conversation.transcript || '';

        // AIサービスを呼び出して要約、キーワード、感情を並行して生成
        const [summaryContent, keywordsText, sentimentJsonText] = await Promise.all([
            aiService.generateContent(aiService.getSummaryPrompt(formattedMessages, fullTranscript)),
            aiService.generateContent(aiService.getKeywordsPrompt(formattedMessages, fullTranscript)),
            aiService.generateContent(aiService.getSentimentPrompt(formattedMessages, fullTranscript))
        ]);

        // AIの応答をパース
        const summaryMatch = summaryContent.match(/\*\*要約:\*\*\n([\s\S]*?)(?=\*\*ネクストアクション:\*\*|$)/);
        const nextActionsMatch = summaryContent.match(/\*\*ネクストアクション:\*\*\n([\s\S]*)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        const nextActions = nextActionsMatch ? nextActionsMatch[1].trim() : '';
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const sentimentResult = JSON.parse(sentimentJsonText.replace(/```json\n|```/g, '').trim());

        // 結果をデータベースに保存
        await Promise.all([
            conversationModel.updateConversationSummary(summary, nextActions, conversationId),
            conversationModel.saveKeywords(conversationId, keywords),
            conversationModel.saveSentiment(conversationId, sentimentResult),
            conversationModel.updateConversationTranscript(fullTranscript, conversationId)
        ]);

        res.json({ summary, nextActions, keywords, sentiment: sentimentResult });
    } catch (error) {
        console.error('Error in summarizeConversation:', error);
        res.status(500).json({ error: 'Failed to generate summary or next actions.' });
    }
};
