// frontend/src/services/chatService.js
import apiClient from './apiClient';

export const sendMessage = (payload) => {
    return apiClient('/api/chat', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const generateSummary = (conversationId) => {
    return apiClient('/api/summarize_and_next_action', {
        method: 'POST',
        body: JSON.stringify({ conversationId })
    });
};