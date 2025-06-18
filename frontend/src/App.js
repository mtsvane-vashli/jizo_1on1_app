// frontend/src/App.js (修正後)
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';

// 各ビューコンポーネントをインポート
import New1on1Support from './views/New1on1Support';
import SessionLog from './views/SessionLog';
import Dashboard from './views/Dashboard';
import LearningResources from './views/LearningResources';
import Settings from './views/Settings';

function App() {
  // ★ここに、以前あったstateや関数はすべて削除されていることを確認してください★

  return (
    <div className="App"> {/* クラス名変更 */}
      {/* 左側のサイドバー */}
      <Sidebar />

      {/* 右側のメインコンテンツエリア */}
      <div className="main-content-area"> {/* クラス名変更 */}
        <div className="main-content-card"> {/* クラス名変更 */}
          <Routes>
            <Route path="/" element={<New1on1Support />} />
            <Route path="/logs" element={<SessionLog />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resources" element={<LearningResources />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;