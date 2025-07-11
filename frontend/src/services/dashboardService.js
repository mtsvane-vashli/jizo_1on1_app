// frontend/src/services/dashboardService.js

import apiClient from './apiClient';

/**
 * ダッシュボード用のキーワードデータを取得する
 * @returns {Promise<Array<object>>} キーワードデータの配列
 */
export const getDashboardKeywords = (employeeId) => {
    const url = employeeId ? `/api/dashboard/keywords?employeeId=${employeeId}` : '/api/dashboard/keywords';
    return apiClient(url);
};

/**
 * ダッシュボード用の感情推移データを取得する
 * @param {string} [employeeId] - フィルタリングする部下のID (オプション)
 * @returns {Promise<Array<object>>} 感情データの配列
 */
export const getDashboardSentiments = (employeeId) => {
    const url = employeeId ? `/api/dashboard/sentiments?employeeId=${employeeId}` : '/api/dashboard/sentiments';
    return apiClient(url);
};