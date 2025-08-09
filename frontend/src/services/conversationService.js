// frontend/src/services/conversationService.js

import apiClient from './apiClient';

/**
 * 過去の会話履歴をすべて取得する
 */
export const getConversations = () => {
  return apiClient('/api/conversations');
};

/**
 * 指定されたIDの会話の詳細を取得する
 */
export const getConversationById = (id) => {
  return apiClient(`/api/conversations/${id}`);
};

/**
 * 指定されたIDの会話のメッセージ履歴を取得する
 */
export const getMessagesByConversationId = (id) => {
  return apiClient(`/api/conversations/${id}/messages`);
};

/**
 * 新しい会話セッションを作成する関数
 * @param {{ employeeId: number }} conversationData - 会話の初期データ
 * @returns {Promise<any>} 作成された会話のデータ (idを含む)
 */
export const createConversation = (conversationData) => {
  const bodyToSend = {
    employeeId: conversationData.employeeId,
    transcript: `(新規セッション開始: ${new Date().toLocaleString()})`
  };
  return apiClient('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(bodyToSend),
  });
};

/**
 * 指定されたIDの会話履歴を削除する
 */
export const deleteConversationById = (id) => {
  return apiClient(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
};


export const updateConversationTranscript = (conversationId, updatedTranscriptString) => {
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify({ transcript: updatedTranscriptString }),
  });
};

// ★★★ ここから追記 ★★★
/**
 * 会話のデータを更新する (メモ、マインドマップなど)
 * @param {string} conversationId 会話のID
 * @param {object} dataToUpdate 更新するデータ { memo, mindMapData, transcript }
 * @returns {Promise<any>} 更新結果
 */
export const updateConversation = (conversationId, dataToUpdate) => {
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify(dataToUpdate),
  });
};
// ★★★ ここまで追記 ★★★
