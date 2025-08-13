import apiClient from './apiClient';

// startConversation, postMessage, getConversations, etc. は変更なし
export const startConversation = (conversationData) => {
  return apiClient('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(conversationData),
  });
};
export const postMessage = (conversationId, messageData) => {
  return apiClient(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData),
  });
};
export const getConversations = () => {
  return apiClient('/api/conversations');
};
export const getConversationById = (id) => {
  return apiClient(`/api/conversations/${id}`);
};
export const getMessagesByConversationId = (id) => {
  return apiClient(`/api/conversations/${id}/messages`);
};
export const deleteConversationById = (id) => {
  return apiClient(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
};
export const updateConversationTranscript = (conversationId, updatedTranscriptString) => {
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ transcript: updatedTranscriptString }),
  });
};
export const updateConversation = (conversationId, dataToUpdate) => {
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify(dataToUpdate),
  });
};

/**
 * ★★★ 新規追加: 会話の要約を生成する ★★★
 * @param {number} conversationId - 会話ID
 * @param {string} transcript - 文字起こしテキスト
 * @returns {Promise<object>}
 */
export const generateSummary = (conversationId, transcript) => {
  return apiClient(`/api/conversations/${conversationId}/summarize`, {
    method: 'POST',
    body: JSON.stringify({ transcript })
  });
};
