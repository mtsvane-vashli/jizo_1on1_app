import apiClient from './apiClient';

/**
 * 新しい会話を開始、または既存の会話にメッセージを送信します。
 * この関数は、バックエンドの startConversation と postMessage の役割を統合的に扱います。
 * @param {object} payload - APIに送信するデータ。
 * @param {number} [payload.conversationId] - 既存の会話ID（メッセージ追加の場合）。
 * @param {string} payload.sender - 送信者 ('user' または 'employee')。
 * @param {string} payload.message - メッセージ内容。
 * @param {number} [payload.employeeId] - 新規会話の場合の部下ID。
 * @param {string} [payload.employeeName] - 新規会話の場合の部下名。
 * @param {string} [payload.theme] - 新規会話の場合のテーマ。
 * @param {string} [payload.stance] - 新規会話の場合のスタンス。
 * @returns {Promise<object>} APIからのレスポンス。
 */
export const sendMessage = (payload) => {
    // conversationId が存在する場合、既存の会話へのメッセージ投稿
    if (payload.conversationId) {
        return apiClient(`/api/conversations/${payload.conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                sender: payload.sender,
                message: payload.message,
            }),
        });
    }
    // conversationId がない場合、新しい会話の開始
    else {
        return apiClient('/api/conversations', {
            method: 'POST',
            body: JSON.stringify({
                employeeId: payload.employeeId,
                employeeName: payload.employeeName,
                theme: payload.theme,
                stance: payload.stance,
            }),
        });
    }
};

// conversationService.js と重複していた generateSummary 関数はここから削除されました。
// 要約生成機能は conversationService.js の generateSummary を使用してください。

