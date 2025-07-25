// frontend/src/components/ThemeToggleButton.js
import React from 'react';
// アイコンのインポートパスはプロジェクトに合わせてください
// import { SunIcon, MoonIcon } from './icons'; 
import { FiSun, FiMoon } from 'react-icons/fi';


/**
 * アプリケーションのテーマ（ライト/ダーク）を切り替えるボタンコンポーネント
 * @param {object} props - コンポーネントのプロパティ
 * @param {string} props.theme - 現在のテーマ ('light' or 'dark')
 * @param {function} props.toggleTheme - テーマを切り替える関数
 * @param {string} [props.className] - ★★★ 外部からCSSクラスを受け取るためのプロパティ ★★★
 */
function ThemeToggleButton({ theme, toggleTheme, className = '' }) {
    // ボタンの基本スタイル
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

    // ホバーエフェクト用のスタイルを動的に生成
    // ボタンにユニークなクラス名を付与することで、他のボタンとの競合を防ぎます
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
                // ★★★ 外部からのclassNameと内部のクラス名を結合 ★★★
                className={`${uniqueClassName} ${className}`}
                style={buttonStyle}
                aria-label={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
            >
                {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>
        </>
    );
}

export default ThemeToggleButton;
