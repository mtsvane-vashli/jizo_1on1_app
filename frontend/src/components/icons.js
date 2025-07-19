import React from 'react';

/**
 * SunIcon Component
 *
 * モダンなアウトラインスタイルの太陽アイコン。
 * SVGの線は親要素のテキストカラーを継承します（currentColor）。
 * @param {object} props - SVG要素に渡される追加のプロパティ。
 */
export const SunIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-label="Sun Icon"
    role="img"
    {...props}
  >
    {/* 放射状の光線 */}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.95-4.243-1.591 1.591M5.25 12H3m4.243-4.95-1.591-1.591"
    />
    {/* 中央の円 */}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
    />
  </svg>
);

/**
 * MoonIcon Component
 *
 * モダンなアウトラインスタイルの月アイコン。
 * SVGの線は親要素のテキストカラーを継承します（currentColor）。
 * @param {object} props - SVG要素に渡される追加のプロパティ。
 */
export const MoonIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-label="Moon Icon"
    role="img"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
    />
  </svg>
);
