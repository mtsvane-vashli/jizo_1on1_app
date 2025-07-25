// frontend/src/views/Dashboard.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardKeywords,
  getDashboardSentiments,
  getDashboardIssues,
  getDashboardPositives,
  getEmployees,
  createEmployee,
  deleteEmployee
} from '../services';
import layoutStyles from '../App.module.css';
import styles from './Dashboard.module.css';
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement
);

function Dashboard() {
  const navigate = useNavigate();
  const [keywordsData, setKeywordsData] = useState({ labels: [], datasets: [] });
  const [sentimentChartData, setSentimentChartData] = useState({ labels: [], datasets: [] });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [issues, setIssues] = useState([]);
  const [positives, setPositives] = useState([]);

  const fetchEmployees = useCallback(async () => {
    setIsEmployeesLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(`部下データの取得に失敗しました: ${err.message}`);
    } finally {
      setIsEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchEmployees();
    }
  }, [isAuthenticated, authLoading, fetchEmployees]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsDashboardLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      setError(null);
      try {
        const [keywords, sentiments, issuesData, positivesData] = await Promise.all([
          getDashboardKeywords(selectedEmployeeId),
          getDashboardSentiments(selectedEmployeeId),
          getDashboardIssues(selectedEmployeeId),
          getDashboardPositives(selectedEmployeeId),
        ]);

        if (Array.isArray(keywords)) {
          setKeywordsData({
            labels: keywords.map(item => item.keyword),
            datasets: [{ label: 'キーワード頻度', data: keywords.map(item => item.frequency), backgroundColor: 'rgba(75, 192, 192, 0.6)' }],
          });
        }
        if (Array.isArray(sentiments)) {
          setSentimentChartData({
            labels: sentiments.map(item => new Date(item.conversation_timestamp).toLocaleDateString()),
            datasets: [
              { label: 'ポジティブ', data: sentiments.map(item => item.positive_score), borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', tension: 0.4 },
              { label: 'ネガティブ', data: sentiments.map(item => item.negative_score), borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', tension: 0.4 },
            ],
          });
        }

        setIssues(issuesData || []);
        setPositives(positivesData || []);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(`データの取得に失敗しました: ${err.message}`);
      } finally {
        setIsDashboardLoading(false);
      }
    };
    fetchDashboardData();
  }, [isAuthenticated, authLoading, selectedEmployeeId]);

  const barOptions = useMemo(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, indexAxis: 'y' }), []);
  const lineOptions = useMemo(() => ({ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1 } } }), []);

  const handleAddEmployee = useCallback(async () => { /* ... 変更なし ... */ }, [newEmployeeName, newEmployeeEmail, fetchEmployees]);
  const handleDeleteEmployee = useCallback(async (id, name) => { /* ... 変更なし ... */ }, [fetchEmployees]);

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
        <select id="employee-select" className={styles.employeeSelect} value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
          <option value="">すべての部下</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardHeader}>課題・懸念事項</h3>
          <p className={styles.cardDescription}>会話から抽出・要約されたトピック</p>
          <div className={`${styles.topicList} ${styles.scrollable}`}>
            {isDashboardLoading ? <p className={styles.loadingText}>読込中...</p> : issues.length > 0 ? (
              issues.map(item => (
                // ★★★ ここを修正 ★★★
                // リンク先を正しいURL形式 "/app/log/transcript/:id" に変更
                <Link to={`/app/log/transcript/${item.conversation_id}`} key={item.id} className={`${styles.topicItem} ${styles.issue}`}>
                  {item.text}
                </Link>
              ))
            ) : <p className={styles.loadingText}>該当データなし</p>}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardHeader}>ポジティブな変化・成長</h3>
          <p className={styles.cardDescription}>部下の成功体験や成長に関するトピック</p>
          <div className={`${styles.topicList} ${styles.scrollable}`}>
            {isDashboardLoading ? <p className={styles.loadingText}>読込中...</p> : positives.length > 0 ? (
              positives.map(item => (
                // ★★★ ここを修正 ★★★
                // リンク先を正しいURL形式 "/app/log/transcript/:id" に変更
                <Link to={`/app/log/transcript/${item.conversation_id}`} key={item.id} className={`${styles.topicItem} ${styles.positive}`}>
                  {item.text}
                </Link>
              ))
            ) : <p className={styles.loadingText}>該当データなし</p>}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardHeader}>会話トピックの傾向</h3>
          <p className={styles.cardDescription}>上位のキーワードとその頻度を表示</p>
          <div className={styles.chartContainer}>
            {isDashboardLoading ? <p className={styles.loadingText}>読込中...</p> : keywordsData.labels.length > 0 ? <Bar data={keywordsData} options={barOptions} /> : <p className={styles.loadingText}>該当データなし</p>}
          </div>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardHeader}>感情の推移</h3>
          <p className={styles.cardDescription}>ポジティブ/ネガティブの推移グラフ</p>
          <div className={styles.chartContainer}>
            {isDashboardLoading ? <p className={styles.loadingText}>読込中...</p> : sentimentChartData.labels.length > 0 ? <Line data={sentimentChartData} options={lineOptions} /> : <p className={styles.loadingText}>該当データなし</p>}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHeader}>部下管理</h3>
        <p className={styles.cardDescription}>登録済みの部下を管理します。</p>
        <div className={styles.employeeList}>
          {isEmployeesLoading ? (
            <p className={styles.loadingText}>部下データを読み込み中...</p>
          ) : employees.length > 0 ? (
            <ul>
              {employees.map((employee) => (
                <li key={employee.id} className={styles.employeeItem}>
                  <span>{employee.name} {employee.email && `(${employee.email})`}</span>
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
