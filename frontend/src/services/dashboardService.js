// frontend/src/services/dashboardService.js

import apiClient from './apiClient';

// --- 既存の関数 ---
export const getDashboardKeywords = (employeeId) => {
    const url = employeeId ? `/api/dashboard/keywords?employeeId=${employeeId}` : '/api/dashboard/keywords';
    return apiClient(url);
};

export const getDashboardSentiments = (employeeId) => {
    const url = employeeId ? `/api/dashboard/sentiments?employeeId=${employeeId}` : '/api/dashboard/sentiments';
    return apiClient(url);
};

// --- ★★★ ここから新規追加 ★★★ ---

/**
 * 課題・懸念事項を取得
 * @param {string} [employeeId] - フィルタリングする部下のID (オプション)
 */
export const getDashboardIssues = (employeeId = '') => {
    const endpoint = `/api/dashboard/issues${employeeId ? `?employeeId=${employeeId}` : ''}`;
    return apiClient(endpoint);
};

/**
 * ポジティブな変化を取得
 * @param {string} [employeeId] - フィルタリングする部下のID (オプション)
 */
export const getDashboardPositives = (employeeId = '') => {
    const endpoint = `/api/dashboard/positives${employeeId ? `?employeeId=${employeeId}` : ''}`;
    return apiClient(endpoint);
};

/**
 * 会話比率を取得
 * @param {string} [employeeId] - フィルタリングする部下のID (オプション)
 */
export const getDashboardTalkRatio = (employeeId = '') => {
    const endpoint = `/api/dashboard/talk-ratio${employeeId ? `?employeeId=${employeeId}` : ''}`;
    return apiClient(endpoint);
};
