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
    // バックエンドのバリデーションを通過するために、プレースホルダーのtranscriptを追加
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
