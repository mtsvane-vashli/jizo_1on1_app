import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../context/AuthContext'; // ★追加
import { useNavigate } from 'react-router-dom'; // ★追加

// Chart.jsに必要なコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

function Dashboard() {
  // --- State の定義 ---
  const [keywordsData, setKeywordsData] = useState({ labels: [], datasets: [] });
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [sentimentChartData, setSentimentChartData] = useState({ labels: [], datasets: [] });
  const [loadingSentiments, setLoadingSentiments] = useState(true);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // --- useCallback でラップされた関数定義 ---
  // これらの関数は、state の定義の直後に置くことで、useEffect から確実にアクセスできるようにする

  // 各 fetch 呼び出しへの Authorization ヘッダーの追加とエラーハンドリングの強化
  const fetchDashboardKeywords = useCallback(async () => {
    // 認証情報のロードが完了していない、または認証されていない場合は処理しない
    if (authLoading || !isAuthenticated) {
      console.log('Auth loading or not authenticated, skipping dashboard keywords fetch.');
      setLoadingKeywords(false);
      setKeywordsData({ labels: [], datasets: [] });
      return;
    }

    setLoadingKeywords(true);
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
          alert('認証に失敗しました。再度ログインしてください。');
          navigate('/login', { replace: true });
          throw new Error('No authentication token found.');
      }
      const response = await fetch('http://localhost:5000/api/dashboard/keywords', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();

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
      alert(`ダッシュボードのキーワードデータの取得に失敗しました: ${error.message || '不明なエラー'}`);
      navigate('/login', { replace: true });
    } finally {
      setLoadingKeywords(false);
    }
  }, [isAuthenticated, authLoading, navigate, setKeywordsData, setLoadingKeywords]); // 依存配列に isAuthenticated, authLoading を追加

  const fetchDashboardSentiments = useCallback(async () => {
    // 認証情報のロードが完了していない、または認証されていない場合は処理しない
    if (authLoading || !isAuthenticated) {
      console.log('Auth loading or not authenticated, skipping dashboard sentiments fetch.');
      setLoadingSentiments(false);
      setSentimentChartData({ labels: [], datasets: [] });
      return;
    }

    setLoadingSentiments(true);
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
          alert('認証に失敗しました。再度ログインしてください。');
          navigate('/login', { replace: true });
          throw new Error('No authentication token found.');
      }
      const response = await fetch('http://localhost:5000/api/dashboard/sentiments', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();

      const labels = data.map(item => new Date(item.conversation_timestamp).toLocaleDateString());
      const positiveScores = data.map(item => item.positive_score);
      const negativeScores = data.map(item => item.negative_score);
      const neutralScores = data.map(item => item.neutral_score);

      setSentimentChartData({
        labels: labels,
        datasets: [
          {
            label: 'ポジティブ',
            data: positiveScores,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.4,
          },
          {
            label: 'ネガティブ',
            data: negativeScores,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.4,
          },
          {
            label: 'ニュートラル',
            data: neutralScores,
            borderColor: 'rgb(201, 203, 207)',
            backgroundColor: 'rgba(201, 203, 207, 0.5)',
            tension: 0.4,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching dashboard sentiments:', error);
      alert(`ダッシュボードの感情データの取得に失敗しました: ${error.message || '不明なエラー'}`);
      navigate('/login', { replace: true });
    } finally {
      setLoadingSentiments(false);
    }
  }, [isAuthenticated, authLoading, navigate, setSentimentChartData, setLoadingSentiments]); // 依存配列に isAuthenticated, authLoading を追加


  // --- useEffect フックの定義 ---
  // これらのフックは、useCallback 関数の定義より後に置く。

  useEffect(() => {
    fetchDashboardKeywords(); // useCallback でラップされた関数を呼び出す
    fetchDashboardSentiments(); // useCallback でラップされた関数を呼び出す
  }, [fetchDashboardKeywords, fetchDashboardSentiments]); // 依存配列に useCallback 関数の参照を含める


  // --- グラフのオプション定義 (変更なし) ---
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
                autoSkip: true, // 数値軸なので自動スキップは有効
                maxRotation: 0, // 回転は不要
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
            }
        }
    },
    indexAxis: 'y', // ★ここが最も重要: Y軸をインデックス軸にする (横向きの棒グラフになる)
  };

  const sentimentOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '感情の推移',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '日付',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        }
      },
      y: {
        title: {
          display: true,
          text: 'スコア',
        },
        min: 0,
        max: 1, // スコアは0から1の範囲
      },
    },
  };


  // --- JSX (return) 部分 ---
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
          <div style={{ height: '250px', width: '100%' }}> {/* グラフ描画用の明示的な高さを設定 */}
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
          <p className="text-gray-600 text-sm mb-4">
            {loadingSentiments ? '(感情データを読み込み中...)' : '(ポジティブ/ネガティブ/ニュートラルの推移グラフ)'}
          </p>
          <div style={{ height: '250px', width: '100%' }}>
            {loadingSentiments ? (
              <p>ローディング中...</p>
            ) : sentimentChartData.labels.length > 0 ? (
              <Line data={sentimentChartData} options={sentimentOptions} />
            ) : (
              <p>データがありません。会話を要約して感情を生成してください。</p>
            )}
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