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

// ★★★ ここから追記 ★★★
/**
 * 会話の文字起こしを更新する
 * @param {string} conversationId 会話のID
 * @param {string} updatedTranscriptString 更新後の文字起こしテキスト全体
 * @returns {Promise<any>} 更新結果
 */
export const updateConversationTranscript = (conversationId, updatedTranscriptString) => {
  // バックエンドのAPIが `/api/conversations/:id` で会話全体を更新する場合
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PUT', // または PATCH
    body: JSON.stringify({ transcript: updatedTranscriptString }),
  });
};
// ★★★ ここまで追記 ★★★
