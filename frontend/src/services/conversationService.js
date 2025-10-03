// frontend/src/services/conversationService.js
import apiClient from './apiClient';

/**
 * 会話開始
 */
export const startConversation = (conversationData) => {
  return apiClient('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(conversationData),
  });
};

/**
 * メッセージ投稿（AIフォローアップも返る）
 */
export const postMessage = (conversationId, messageData) => {
  return apiClient(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData),
  });
};

/**
 * 会話一覧取得（SessionLog 用）
 */
export const getConversations = () => {
  return apiClient('/api/conversations');
};

/**
 * 会話詳細取得
 */
export const getConversationById = (id) => {
  return apiClient(`/api/conversations/${id}`);
};

/**
 * 会話の全メッセージ取得（必要なら）
 */
export const getMessagesByConversationId = (id) => {
  return apiClient(`/api/conversations/${id}/messages`);
};

/**
 * 会話削除
 */
export const deleteConversationById = (id) => {
  return apiClient(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
};

/**
 * 文字起こし（transcript）だけを部分更新
 */
export const updateConversationTranscript = (conversationId, updatedTranscriptString) => {
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ transcript: updatedTranscriptString }),
  });
};

/**
 * 任意フィールドを部分更新（PATCH）
 * 例）updateConversation(id, { memo: '.', mindMapData: {.} })
 */
export const updateConversation = (conversationId, dataToUpdate) => {
  return apiClient(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify(dataToUpdate),
  });
};

/**
 * ユースケース別ヘルパー
 * - MindMap は DB 側が JSONB カラム mind_map_data だが、
 *   API は camelCase の `mindMapData` を受ける実装に統一。
 */
export const updateMindMapData = (conversationId, mindMapData) => {
  return updateConversation(conversationId, { mindMapData });
};

export const updateMemo = (conversationId, memo) => {
  return updateConversation(conversationId, { memo });
};

export const generateSummary = (conversationId, transcript) => {
  return apiClient(`/api/conversations/${conversationId}/summarize`, {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  });
};

/**
 * ★ Deep Dive（要約内クリック時の詳細説明）
 */
export const deepDive = (conversationId, queryText) => {
  return apiClient(`/api/conversations/${conversationId}/deep-dive`, {
    method: 'POST',
    body: JSON.stringify({ queryText }),
  });
};

/**
 * ★ 質問例の更新（4件。バックエンド側で「その他」を除外しなくてもOK、フロントで除外）
 */
export const refreshQuestions = (conversationId) => {
  return apiClient(`/api/conversations/${conversationId}/refresh-questions`, {
    method: 'POST',
  });
};

/**
 * ★ ワンポイントアドバイス（Markdown を返す）
 */
export const onePointAdvice = (conversationId) => {
  return apiClient(`/api/conversations/${conversationId}/one-point-advice`, {
    method: 'POST',
  });
};
