// backend/controllers/conversationController.js (修正後)

const conversationModel = require('../models/conversationModel');

const listConversations = async (req, res) => {
    try {
        const conversations = await conversationModel.getAllConversations(req.user); // ★
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getConversationDetails = async (req, res) => {
    try {
        const conversation = await conversationModel.getConversationById(req.params.id, req.user); // ★
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found or you don't have permission to access it." });
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
        const changes = await conversationModel.deleteConversationAndMessages(req.params.id, req.user); // ★
        if (changes === 0) {
            return res.status(404).json({ error: 'Conversation not found or you don\'t have permission to delete it.' });
        }
        res.status(200).json({ message: 'Conversation and related data deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
};

/**
 * 文字起こし結果を保存する
 */
const saveTranscript = async (req, res) => {
    const { transcript, employeeId } = req.body;
    const user = req.user;

    // バリデーション
    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
        return res.status(400).json({ error: 'Transcript is required and must be a non-empty string.' });
    }

    try {
        const newConversation = await conversationModel.createConversationFromTranscript(transcript, employeeId, user);
        res.status(201).json({ message: 'Transcript saved successfully.', conversation: newConversation });
    } catch (error) {
        console.error('Failed to save transcript:', error);
        res.status(500).json({ error: 'Failed to save transcript.' });
    }
};

module.exports = {
    listConversations,
    getConversationDetails,
    getConversationMessages,
    deleteConversation,
    saveTranscript,
};