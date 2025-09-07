// frontend/src/services/deepDiveService.js
import apiClient from './apiClient';

/**
 * 要約/ネクストアクション中の語句に関する深掘り説明を生成
 * @param {number|string} conversationId
 * @param {string} queryText - クリック/選択されたテキスト（文）
 * @returns {Promise<{ explanation: string }>}
 */
export const deepDive = (conversationId, queryText) => {
  return apiClient(`/api/conversations/${conversationId}/deep-dive`, {
    method: 'POST',
    body: JSON.stringify({ queryText }),
  });
};

