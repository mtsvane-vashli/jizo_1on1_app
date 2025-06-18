// frontend/src/components/Sidebar.js (修正後 - Tailwindなし)
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarIcon, BookOpenIcon, ChartBarIcon, AcademicCapIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'; // 例


function Sidebar() {
  const location = useLocation();

  // ナビゲーションアイテムの定義
  const navItems = [
    { name: '新規1on1サポート', path: '/', icon: <CalendarIcon className="h-1 w-1" /> }, // h-5 w-5 はサイズ指定
    { name: '過去のセッションログ', path: '/logs', icon: <BookOpenIcon className="h-1 w-1" /> },
    { name: '分析ダッシュボード', path: '/dashboard', icon: <ChartBarIcon className="h-1 w-1" /> },
    { name: '学習リソース', path: '/resources', icon: <AcademicCapIcon className="h-1 w-1" /> },
    { name: '設定', path: '/settings', icon: <Cog6ToothIcon className="h-1 w-1" /> },
];

  return (
    <div className="sidebar-container"> {/* クラス名変更 */}
      {/* ヘッダー/ロゴ */}
      <div className="sidebar-header"> {/* クラス名変更 */}
        <h1>おたすけ地蔵くん</h1>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`sidebar-nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {/* ★ここを修正します★ */}
                {/* item.icon が絵文字 ('🗓️') または SVG コンポーネント (<CalendarIcon />) の両方に対応する */}
                {/* SVGコンポーネントであれば、propsとしてclassNameを渡す */}
                {typeof item.icon === 'string' ? ( // 絵文字の場合
                    <span className="sidebar-icon">{item.icon}</span> // 新しいクラス名 'sidebar-icon' を使用
                ) : ( // Reactコンポーネント（SVG）の場合
                    React.cloneElement(item.icon, { className: 'sidebar-icon' }) // SVGコンポーネントに直接クラスを渡す
                )}
                {/* 元の絵文字の場合
                <span className="icon">{item.icon}</span>
                これだとSVGコンポーネントにクラスが直接渡せないので、上記のように分岐させるか、
                アイコン定義時に className を持たせるか、どちらかに統一する。
                今回は、sidebar-icon という新しいクラスを定義し、それを絵文字のspanまたはSVGに適用する形にします。
                */}
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ユーザー情報とログアウト */}
      <div className="sidebar-user-info"> {/* クラス名変更 */}
        <div className="sidebar-user-info-flex"> {/* クラス名変更 */}
          <div className="sidebar-user-avatar">
            {/* img タグに rounded-full は不要、親で丸めています */}
            <img src="https://via.placeholder.com/32/cccccc?text=U" alt="User" /> 
          </div>
          <div>
            <p className="sidebar-user-name">テストユーザー</p> {/* クラス名変更 */}
            <p className="sidebar-user-id">test-user-01</p> {/* クラス名変更 */}
          </div>
        </div>
        <button className="sidebar-logout-button"> {/* クラス名変更 */}
          ログアウト
        </button>
      </div>
    </div>
  );
}

export default Sidebar;