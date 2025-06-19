// frontend/src/views/Dashboard.js (修正後)
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2'; // ★追加: Barチャートコンポーネントをインポート
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'; // ★追加: Chart.jsの必須コンポーネントをインポート

// Chart.jsに必要なコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [keywordsData, setKeywordsData] = useState({ labels: [], datasets: [] });
  const [loadingKeywords, setLoadingKeywords] = useState(true);

  useEffect(() => {
    fetchDashboardKeywords();
  }, []);

  const fetchDashboardKeywords = async () => {
    setLoadingKeywords(true);
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/keywords');
      const data = await response.json();

      // データをChart.jsの形式に変換
      const labels = data.map(item => item.keyword);
      const frequencies = data.map(item => item.frequency);

      setKeywordsData({
        labels: labels,
        datasets: [
          {
            label: 'キーワード頻度',
            data: frequencies,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching dashboard keywords:', error);
      alert('ダッシュボードのキーワードデータの取得に失敗しました。');
    } finally {
      setLoadingKeywords(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '会話トピックの傾向',
      },
    },
    scales: {
        x: { // ★修正: x軸が横軸ではなくなり、キーワードの頻度（横方向の棒の長さ）を表す
            title: {
                display: true,
                text: '頻度' // x軸は頻度になる
            },
            beginAtZero: true,
            ticks: {
                autoSkip: true, // 横軸が数値になるので、自動スキップを有効に戻してもよい
                maxRotation: 0, // 数値軸なので回転は不要
                minRotation: 0,
            }
        },
        y: { // ★修正: y軸が縦軸ではなく、キーワード（カテゴリー）を表す
            title: {
                display: true,
            },
            ticks: {
                autoSkip: false, // キーワードが並ぶので、自動スキップは無効のまま
                maxRotation: 0, // キーワードは水平に表示されるので回転は不要
                minRotation: 0,
                // padding: 10, // ラベルと軸の間の余白 (必要であれば追加)
            }
        }
    },
    indexAxis: 'y', // ★ここが最も重要: Y軸をインデックス軸にする (横向きの棒グラフになる)
  };

  return (
    <div className="view-container">
      <h2 className="screen-header">分析ダッシュボード</h2>
      <p className="screen-description mb-8">1on1全体の傾向を可視化します。</p>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="text-xl font-semibold mb-2">会話トピックの傾向</h3>
          <p className="text-gray-600 text-sm mb-4">
            {loadingKeywords ? '(キーワードデータを読み込み中...)' : '(上位のキーワードとその頻度を表示)'}
          </p>
          <div className="dashboard-chart-placeholder" style={{ backgroundColor: 'transparent', height: 'auto', display: 'block' }}>
            {loadingKeywords ? (
              <p>ローディング中...</p>
            ) : keywordsData.labels.length > 0 ? (
              <Bar data={keywordsData} options={options} />
            ) : (
              <p>データがありません。会話を要約してキーワードを生成してください。</p>
            )}
          </div>
        </div>
        <div className="dashboard-card">
          <h3 className="text-xl font-semibold mb-2">感情の推移</h3>
          <p className="text-gray-600 text-sm mb-4">(ここにポジティブ/ネガティブの推移グラフを表示)</p>
          <div className="dashboard-chart-placeholder">
            Chart Placeholder
          </div>
        </div>
        <div className="dashboard-card">
          <h3 className="text-xl font-semibold mb-2">エンゲージメントスコア</h3>
          <p className="dashboard-engagement-score">82 / 100</p>
          <p className="dashboard-engagement-change">前月比:+5</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;