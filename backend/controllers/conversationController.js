// backend/controllers/conversationController.js

const model = require('../models/conversationModel');

// ... (listConversations から saveTranscript までの関数は変更ありません) ...
exports.listConversations = async (req, res) => {
    try {
        const conversations = await model.getAllConversations(req.user);
        res.json(conversations);
    } catch (error) {
        console.error('Error listing conversations:', error);
        res.status(500).json({ error: 'Failed to retrieve conversations.' });
    }
};
exports.getConversationDetails = async (req, res) => {
    try {
        const conversation = await model.getConversationById(req.params.id, req.user);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        res.json(conversation);
    } catch (error) {
        console.error('Error getting conversation details:', error);
        res.status(500).json({ error: 'Failed to retrieve conversation details.' });
    }
};
exports.getConversationMessages = async (req, res) => {
    try {
        const conversation = await model.getConversationById(req.params.id, req.user);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        const messages = await model.getMessagesByConversationId(req.params.id);
        res.json(messages);
    } catch (error) {
        console.error('Error getting conversation messages:', error);
        res.status(500).json({ error: 'Failed to retrieve messages.' });
    }
};
exports.deleteConversation = async (req, res) => {
    try {
        const deletedCount = await model.deleteConversationAndMessages(req.params.id, req.user);
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        res.status(200).json({ message: 'Conversation deleted successfully.' });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
};
exports.saveTranscript = async (req, res) => {
    const { employeeId, transcript, theme, summary, next_actions } = req.body;
    try {
        const conversationId = await model.createConversation({ employeeId, transcript, theme, summary, next_actions }, req.user);
        res.status(201).json({ id: conversationId, message: 'Transcript saved successfully.' });
    } catch (error) {
        console.error('Error saving transcript:', error);
        res.status(500).json({ error: 'Failed to save transcript.' });
    }
};

// ★★★ ここからが修正箇所 ★★★
exports.updateConversation = async (req, res) => {
    const { id } = req.params;
    const { transcript } = req.body;
    const user = req.user;

    if (typeof transcript === 'undefined') {
        return res.status(400).json({ error: 'transcript is required.' });
    }

    try {
        // ★ 修正: modelの `updateConversation` 関数を呼び出す
        const updatedConversation = await model.updateConversation(id, { transcript }, user);

        if (!updatedConversation) {
            return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        }
        res.json(updatedConversation);
    } catch (error) {
        // エラーログはmodel側で出力済み
        res.status(500).json({ error: 'Internal server error while updating conversation.' });
    }
};
// ★★★ 修正ここまで ★★★
