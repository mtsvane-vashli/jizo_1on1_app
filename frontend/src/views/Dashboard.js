// frontend/src/views/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { getDashboardKeywords, getDashboardSentiments } from '../services';
import layoutStyles from '../App.module.css'; // ★共通レイアウトスタイル
import styles from './Dashboard.module.css'; // ★Dashboard専用スタイル

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement
);

function Dashboard() {
  const [keywordsData, setKeywordsData] = useState({ labels: [], datasets: [] });
  const [sentimentChartData, setSentimentChartData] = useState({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [keywords, sentiments] = await Promise.all([
          getDashboardKeywords(),
          getDashboardSentiments()
        ]);

        if (Array.isArray(keywords)) {
          setKeywordsData({
            labels: keywords.map(item => item.keyword),
            datasets: [{
              label: 'キーワード頻度',
              data: keywords.map(item => item.frequency),
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            }],
          });
        }

        if (Array.isArray(sentiments)) {
          setSentimentChartData({
            labels: sentiments.map(item => new Date(item.conversation_timestamp).toLocaleDateString()),
            datasets: [
              { label: 'ポジティブ', data: sentiments.map(item => item.positive_score), borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', tension: 0.4 },
              { label: 'ネガティブ', data: sentiments.map(item => item.negative_score), borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', tension: 0.4 },
              { label: 'ニュートラル', data: sentiments.map(item => item.neutral_score), borderColor: 'rgb(201, 203, 207)', backgroundColor: 'rgba(201, 203, 207, 0.5)', tension: 0.4 },
            ],
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(`データの取得に失敗しました: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [isAuthenticated, authLoading]);

  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { x: { title: { display: true, text: '頻度' }, beginAtZero: true }, y: { ticks: { autoSkip: false } } }, indexAxis: 'y' };
  const sentimentOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { x: { title: { display: true, text: '日付' } }, y: { title: { display: true, text: 'スコア' }, min: 0, max: 1 } } };

  if (authLoading) {
    return <div className={layoutStyles.viewContainer}><p>認証情報を確認中...</p></div>;
  }

  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>分析ダッシュボード</h2>
      <p className={layoutStyles.screenDescription}>1on1全体の傾向を可視化します。</p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardHeader}>会話トピックの傾向</h3>
          <p className={styles.cardDescription}>
            {isLoading ? 'キーワードデータを読み込み中...' : '上位のキーワードとその頻度を表示'}
          </p>
          <div className={styles.chartContainer}>
            {isLoading ? <p className={styles.loadingText}>ローディング中...</p> : keywordsData.labels.length > 0 ? <Bar data={keywordsData} options={options} /> : <p className={styles.loadingText}>表示できるデータがありません。</p>}
          </div>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardHeader}>感情の推移</h3>
          <p className={styles.cardDescription}>
            {isLoading ? '感情データを読み込み中...' : 'ポジティブ/ネガティブ/ニュートラルの推移グラフ'}
          </p>
          <div className={styles.chartContainer}>
            {isLoading ? <p className={styles.loadingText}>ローディング中...</p> : sentimentChartData.labels.length > 0 ? <Line data={sentimentChartData} options={sentimentOptions} /> : <p className={styles.loadingText}>表示できるデータがありません。</p>}
          </div>
        </div>
        <div className={styles.card}>
            <h3 className={styles.cardHeader}>エンゲージメントスコア</h3>
            <p className={styles.cardDescription}>(サンプル表示)</p>
            <p className={styles.engagementScore}>82 / 100</p>
            <p className={styles.engagementChange}>前月比:+5</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;