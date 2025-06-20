// frontend/src/views/Dashboard.js (修正後)

import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
// ★修正: servicesのindex.jsからまとめてインポート
import { getDashboardKeywords, getDashboardSentiments } from '../services';

// Chart.jsの登録 (変更なし)
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement
);

function Dashboard() {
  const [keywordsData, setKeywordsData] = useState({ labels: [], datasets: [] });
  const [sentimentChartData, setSentimentChartData] = useState({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState(true); // ★ローディングstateを1つに統合
  const [error, setError] = useState(null); // ★エラーstateを追加

  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // 認証情報のロードが完了し、かつ認証されている場合のみデータをフェッチ
    if (authLoading || !isAuthenticated) {
        setIsLoading(false); // 認証されていない場合はローディング終了
        return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // ★ Promise.allでキーワードと感情データを同時に取得
        const [keywords, sentiments] = await Promise.all([
          getDashboardKeywords(),
          getDashboardSentiments()
        ]);

        // キーワードデータの整形
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

        // 感情データの整形
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
  }, [isAuthenticated, authLoading]); // 依存配列をシンプルに

  // --- グラフのオプション定義 (変更なし) ---
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: '会話トピックの傾向' } }, scales: { x: { title: { display: true, text: '頻度' }, beginAtZero: true }, y: { ticks: { autoSkip: false } } }, indexAxis: 'y' };
  const sentimentOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: '感情の推移' } }, scales: { x: { title: { display: true, text: '日付' } }, y: { title: { display: true, text: 'スコア' }, min: 0, max: 1 } } };

  if (authLoading) {
    return <div className="view-container"><p>認証情報を確認中...</p></div>;
  }

  // --- JSX (return) 部分 ---
  return (
    <div className="view-container">
      <h2 className="screen-header">分析ダッシュボード</h2>
      <p className="screen-description mb-8">1on1全体の傾向を可視化します。</p>

      {/* ★エラー表示を追加 */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>会話トピックの傾向</h3>
          <p className="screen-description">
            {isLoading ? '(キーワードデータを読み込み中...)' : '(上位のキーワードとその頻度を表示)'}
          </p>
          <div style={{ height: '250px', width: '100%' }}>
            {isLoading ? <p>ローディング中...</p> : keywordsData.labels.length > 0 ? <Bar data={keywordsData} options={options} /> : <p>表示できるデータがありません。</p>}
          </div>
        </div>
        <div className="card">
          <h3>感情の推移</h3>
          <p className="screen-description">
             {isLoading ? '(感情データを読み込み中...)' : '(ポジティブ/ネガティブ/ニュートラルの推移グラフ)'}
          </p>
          <div style={{ height: '250px', width: '100%' }}>
             {isLoading ? <p>ローディング中...</p> : sentimentChartData.labels.length > 0 ? <Line data={sentimentChartData} options={sentimentOptions} /> : <p>表示できるデータがありません。</p>}
          </div>
        </div>
        <div className="card">
          <h3>エンゲージメントスコア</h3>
          <p className="dashboard-engagement-score">82 / 100</p>
          <p className="dashboard-engagement-change">前月比:+5</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;