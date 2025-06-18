// frontend/src/views/Dashboard.js (修正後 - Tailwindなし)
import React from 'react';

function Dashboard() {
  return (
    <div className="view-container"> {/* クラス名変更 */}
      <h2 className="screen-header">分析ダッシュボード</h2> {/* クラス名変更 */}
      <p className="screen-description mb-8">1on1全体の傾向を可視化します。</p> {/* クラス名変更 */}

      <div className="dashboard-grid"> {/* クラス名変更 */}
        <div className="dashboard-card"> {/* クラス名変更 */}
          <h3 className="text-xl font-semibold mb-2">会話トピックの傾向</h3> {/* クラス名変更 */}
          <p className="text-sm text-gray-600 mb-4">(ここにキーワードクラウドや棒グラフを表示)</p> {/* クラス名変更 */}
          <div className="dashboard-chart-placeholder"> {/* クラス名変更 */}
            Chart Placeholder
          </div>
        </div>
        <div className="dashboard-card"> {/* クラス名変更 */}
          <h3 className="text-xl font-semibold mb-2">感情の推移</h3> {/* クラス名変更 */}
          <p className="text-sm text-gray-600 mb-4">(ここにポジティブ/ネガティブの推移グラフを表示)</p> {/* クラス名変更 */}
          <div className="dashboard-chart-placeholder"> {/* クラス名変更 */}
            Chart Placeholder
          </div>
        </div>
        <div className="dashboard-card"> {/* クラス名変更 */}
          <h3 className="text-xl font-semibold mb-2">エンゲージメントスコア</h3> {/* クラス名変更 */}
          <p className="dashboard-engagement-score">82 / 100</p> {/* クラス名変更 */}
          <p className="dashboard-engagement-change">前月比:+5</p> {/* クラス名変更 */}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;