// backend/controllers/conversationController.js

const conversationModel = require('../models/conversationModel');

const listConversations = async (req, res) => {
    try {
        const conversations = await conversationModel.getAllConversations();
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getConversationDetails = async (req, res) => {
    try {
        const conversation = await conversationModel.getConversationById(req.params.id);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found." });
        }
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getConversationMessages = async (req, res) => {
    try {
        const messages = await conversationModel.getMessagesByConversationId(req.params.id);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteConversation = async (req, res) => {
    try {
        const changes = await conversationModel.deleteConversationAndMessages(req.params.id);
        if (changes === 0) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }
        res.status(200).json({ message: 'Conversation and related data deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
};

module.exports = {
    listConversations,
    getConversationDetails,
    getConversationMessages,
    deleteConversation
};