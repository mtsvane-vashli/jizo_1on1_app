import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext'; // ★ useAuthフックをインポート

/**
 * アプリケーションのテーマ（ライト/ダーク）を切り替えるボタンコンポーネント
 * @param {object} props - コンポーネントのプロパティ
 * @param {string} [props.className] - 外部からCSSクラスを受け取るためのプロパティ
 */
function ThemeToggleButton({ className = '' }) {
    // ★★★ propsの代わりにuseAuthフックからテーマと関数を取得 ★★★
    const { theme, toggleTheme } = useAuth();

    const buttonStyle = {
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease-in-out',
    };

    // インラインスタイルは元のままで動作するため変更なし
    const uniqueClassName = `theme-toggle-button-${Math.random().toString(36).substr(2, 9)}`;
    const hoverStyle = `
        .${uniqueClassName}:hover {
            background-color: var(--color-bg-hover);
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }
    `;

    return (
        <>
            <style>{hoverStyle}</style>
            <button
                onClick={toggleTheme}
                className={`${uniqueClassName} ${className}`}
                style={buttonStyle}
                aria-label="テーマを切り替える"
            >
                {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>
        </>
    );
}

export default ThemeToggleButton;
