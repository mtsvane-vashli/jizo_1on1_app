import React from 'react';
import { SunIcon, MoonIcon } from './icons';

const styles = `
.themeToggleButton {
  padding: 0; /* パディングをなくす */
  border: none; /* ボーダーをなくす */
  background-color: transparent; /* 背景色を透明に */
  color: var(--color-text-sidebar); /* サイドバーのテキスト色に合わせる */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}
.themeToggleButton:hover {
  color: var(--color-text-sidebar-hover); /* ホバー時の色 */
  background-color: var(--color-bg-sidebar-hover); /* ホバー時の背景色 */
}
.themeToggleIcon {
    width: 1.4rem;
    height: 1.4rem;
    color: inherit; /* 親要素のcolorを継承 */
}
`;

function ThemeToggleButton({ theme, toggleTheme }) {
    return (
        <>
            <style>{styles}</style>
            <button onClick={toggleTheme} className="themeToggleButton" aria-label="Toggle theme">
                {theme === 'light' ? <MoonIcon className="themeToggleIcon" /> : <SunIcon className="themeToggleIcon" />}
            </button>
        </>
    );
}

export default ThemeToggleButton;
