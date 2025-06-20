// frontend/src/services/conversationService.js (修正後)

import apiClient from './apiClient';

/**
 * 過去の会話履歴をすべて取得する
 * @returns {Promise<Array<object>>} 会話履歴の配列
 */
export const getConversations = () => {
    return apiClient('/api/conversations');
};

/**
 * ★追加: 指定されたIDの会話の詳細を取得する
 * @param {number} id - 会話のID
 * @returns {Promise<object>} 会話詳細オブジェクト
 */
export const getConversationById = (id) => {
    return apiClient(`/api/conversations/${id}`);
};

/**
 * ★追加: 指定されたIDの会話のメッセージ履歴を取得する
 * @param {number} id - 会話のID
 * @returns {Promise<Array<object>>} メッセージの配列
 */
export const getMessagesByConversationId = (id) => {
    return apiClient(`/api/conversations/${id}/messages`);
};

/**
 * 指定されたIDの会話履歴を削除する
 * @param {number} id - 削除する会話のID
 * @returns {Promise<object>} 成功メッセージ
 */
export const deleteConversationById = (id) => {
    return apiClient(`/api/conversations/${id}`, {
        method: 'DELETE',
    });
};