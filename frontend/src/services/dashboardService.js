// frontend/src/services/dashboardService.js

import apiClient from './apiClient';

/**
 * ダッシュボード用のキーワードデータを取得する
 * @returns {Promise<Array<object>>} キーワードデータの配列
 */
export const getDashboardKeywords = () => {
    return apiClient('/api/dashboard/keywords');
};

/**
 * ダッシュボード用の感情推移データを取得する
 * @returns {Promise<Array<object>>} 感情データの配列
 */
export const getDashboardSentiments = () => {
    return apiClient('/api/dashboard/sentiments');
};