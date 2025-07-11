// frontend/src/views/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { getDashboardKeywords, getDashboardSentiments } from '../services';
import { getEmployees, createEmployee, deleteEmployee } from '../services/employeeService';
import layoutStyles from '../App.module.css'; // ★共通レイアウトスタイル
import styles from './Dashboard.module.css'; // ★Dashboard専用スタイル

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement
);

function Dashboard() {
  const [keywordsData, setKeywordsData] = useState({ labels: [], datasets: [] });
  const [sentimentChartData, setSentimentChartData] = useState({ labels: [], datasets: [] });
  const [employees, setEmployees] = useState([]); // 部下リストの状態
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(''); // 選択された部下のID
  const [newEmployeeName, setNewEmployeeName] = useState(''); // 新しい部下の名前
  const [newEmployeeEmail, setNewEmployeeEmail] = useState(''); // 新しい部下のメールアドレス
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // 部下リストの取得
  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(`部下データの取得に失敗しました: ${err.message}`);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    fetchEmployees(); // 部下リストは認証後に一度取得

    const fetchDashboardData = async (employeeId) => {
      setIsLoading(true);
      setError(null);
      try {
        const [keywords, sentiments] = await Promise.all([
          getDashboardKeywords(employeeId),
          getDashboardSentiments(employeeId),
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
    fetchDashboardData(selectedEmployeeId);
  }, [isAuthenticated, authLoading, selectedEmployeeId]);

  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { x: { title: { display: true, text: '頻度' }, beginAtZero: true }, y: { ticks: { autoSkip: false } } }, indexAxis: 'y' };
  const sentimentOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { x: { title: { display: true, text: '日付' } }, y: { title: { display: true, text: 'スコア' }, min: 0, max: 1 } } };

  // 新しい部下を追加するハンドラ
  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      alert('部下の名前は必須です。');
      return;
    }
    try {
      await createEmployee({ name: newEmployeeName, email: newEmployeeEmail });
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      fetchEmployees(); // リストを更新
      alert('部下を追加しました。');
    } catch (err) {
      console.error('Error adding employee:', err);
      setError(`部下の追加に失敗しました: ${err.message}`);
      alert(`部下の追加に失敗しました: ${err.message}`);
    }
  };

  // 部下を削除するハンドラ
  const handleDeleteEmployee = async (id, name) => {
    if (window.confirm(`${name} を削除してもよろしいですか？`)) {
      try {
        await deleteEmployee(id);
        fetchEmployees(); // リストを更新
        alert('部下を削除しました。');
      } catch (err) {
        console.error('Error deleting employee:', err);
        setError(`部下の削除に失敗しました: ${err.message}`);
        alert(`部下の削除に失敗しました: ${err.message}`);
      }
    }
  };

  if (authLoading) {
    return <div className={layoutStyles.viewContainer}><p>認証情報を確認中...</p></div>;
  }

  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>分析ダッシュボード</h2>
      <p className={layoutStyles.screenDescription}>1on1全体の傾向を可視化します。</p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.employeeSelectContainer}>
        <label htmlFor="employee-select" className={styles.selectLabel}>部下を選択:</label>
        <select
          id="employee-select"
          className={styles.employeeSelect}
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
        >
          <option value="">すべての部下</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>

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

      <div className={styles.card}>
        <h3 className={styles.cardHeader}>部下管理</h3>
        <p className={styles.cardDescription}>登録済みの部下を管理します。</p>
        <div className={styles.employeeList}>
          {isLoading ? (
            <p className={styles.loadingText}>部下データを読み込み中...</p>
          ) : employees.length > 0 ? (
            <ul>
              {employees.map((employee) => (
                <li key={employee.id} className={styles.employeeItem}>
                  {employee.name} ({employee.email})
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.loadingText}>登録済みの部下がいません。</p>
          )}
        </div>
        <div className={styles.addEmployeeForm}>
          <h4>新しい部下を追加</h4>
          <input
            type="text"
            placeholder="名前"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            className={styles.inputField}
          />
          <input
            type="email"
            placeholder="メールアドレス (任意)"
            value={newEmployeeEmail}
            onChange={(e) => setNewEmployeeEmail(e.target.value)}
            className={styles.inputField}
          />
          <button onClick={handleAddEmployee} className={styles.addButton}>
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;