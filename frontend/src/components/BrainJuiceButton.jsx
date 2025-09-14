import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './BrainJuiceButton.module.css';
import { ReactComponent as BrainSvg } from '../assets/icons/brain.svg';
import brainUrl from '../assets/icons/brain.svg';

/**
 * 脳汁ボタン（高コントラスト強化版）
 * - 背景が黒でも視認できるよう「ハロー」「明色ストローク」「枠線」を追加
 * - マスク塗りのグラデを明るめに調整
 * - 既存の props は互換
 */
const DURATION_MS = 15000;
const WRAPPER_W = 64;
const WRAPPER_H = 84;
const DRAG_THRESHOLD = 4; // px

export default function BrainJuiceButton({
    className = '',
    onStartSilence,
    onEndSilence,
    movable = true,
    storageKey = 'brainjuice_pos_v3',
    theme = 'neon',     // 'soft' | 'neon' | 'glass' | 'mono'
    shape = 'pill',     // 'rounded' | 'pill'
}) {
    const [toast, setToast] = useState(false);
    const [active, setActive] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [progress, setProgress] = useState(0);

    const rafRef = useRef(null);
    const startRef = useRef(null);

    // 位置
    const [pos, setPos] = useState({ left: 16, top: 0 });
    const [dragging, setDragging] = useState(false);
    const dragOrigin = useRef({ x: 0, y: 0, left: 0, top: 0, moved: false });

    // 初期位置（左下寄せ）
    useEffect(() => {
        if (!movable) return;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const p = JSON.parse(saved);
                setPos({ left: p.left ?? 16, top: p.top ?? 16 });
            } else {
                const vh = window.innerHeight || 800;
                setPos({ left: 16, top: Math.max(16, vh - WRAPPER_H - 24) });
            }
        } catch {
            const vh = window.innerHeight || 800;
            setPos({ left: 16, top: Math.max(16, vh - WRAPPER_H - 24) });
        }
    }, [movable, storageKey]);

    const secondsLeft = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));

    const stop = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        startRef.current = null;
        setActive(false);
        setElapsed(0);
        setProgress(0);
        onEndSilence && onEndSilence();
    }, [onEndSilence]);

    const tick = useCallback((now) => {
        if (!startRef.current) startRef.current = now;
        const e = now - startRef.current;
        const p = Math.min(1, e / DURATION_MS);
        setElapsed(e);
        setProgress(p);
        if (p >= 1) {
            stop();
            return;
        }
        rafRef.current = requestAnimationFrame(tick);
    }, [stop]);

    const start = useCallback(() => {
        if (active) return;
        setActive(true);
        onStartSilence && onStartSilence();
        startRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
        try { navigator.vibrate?.(10); } catch { }
    }, [active, onStartSilence, tick]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    /** ========= クリック（ドラッグと誤判定しない） ========= */
    const handleIconClick = () => {
        if (dragOrigin.current.moved) return;
        setToast(true);
        const t = setTimeout(() => setToast(false), 1200);
        return () => clearTimeout(t);
    };

    const handleTimerClick = () => {
        if (dragOrigin.current.moved) return;
        if (!active) start();
    };

    /** ========= ドラッグ移動 ========= */
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const onWindowPointerMove = useCallback((e) => {
        if (!movable || !dragging) return;
        const dx = e.clientX - dragOrigin.current.x;
        const dy = e.clientY - dragOrigin.current.y;

        if (!dragOrigin.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            dragOrigin.current.moved = true;
        }

        const vw = window.innerWidth || 1200;
        const vh = window.innerHeight || 800;
        const nextLeft = clamp(dragOrigin.current.left + dx, 8, vw - WRAPPER_W - 8);
        const nextTop = clamp(dragOrigin.current.top + dy, 8, vh - WRAPPER_H - 8);
        setPos({ left: nextLeft, top: nextTop });
    }, [movable, dragging]);

    const endDrag = useCallback(() => {
        if (!movable) return;
        if (!dragging) return;
        setDragging(false);
        try { localStorage.setItem(storageKey, JSON.stringify(pos)); } catch { }
        requestAnimationFrame(() => { dragOrigin.current.moved = false; });
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
    }, [movable, dragging, pos, storageKey, onWindowPointerMove]);

    const onPointerDown = (e) => {
        if (!movable) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        setDragging(true);
        dragOrigin.current = {
            x: e.clientX,
            y: e.clientY,
            left: pos.left,
            top: pos.top,
            moved: false,
        };
        window.addEventListener('pointermove', onWindowPointerMove, { passive: true });
        window.addEventListener('pointerup', endDrag, { passive: true });
        window.addEventListener('pointercancel', endDrag, { passive: true });
    };

    const wrapperClass = [
        styles.wrapper,
        className,
        movable ? styles.movable : '',
        dragging ? styles.dragging : '',
        styles[`theme_${theme}`],
        styles[`shape_${shape}`],
    ].join(' ');

    return (
        <div
            className={wrapperClass}
            style={movable ? { left: pos.left, top: pos.top, position: 'fixed' } : undefined}
            onPointerDown={onPointerDown}
        >
            {/* トースト */}
            <div className={`${styles.toast} ${toast ? styles.toastShow : ''}`} role="status" aria-live="polite">
                脳汁出てるよ～
            </div>

            {/* 「沈黙中」バッジ */}
            {active && (
                <div className={styles.silenceBadge} aria-live="polite">
                    沈黙中
                </div>
            )}

            {/* ボタン本体 */}
            <div className={styles.btn} aria-label="脳汁ボタン">
                {/* 充填レイヤー */}
                <div className={styles.fill} style={{ '--fill': `${Math.round(progress * 100)}%` }} />

                {/* 泡アニメ（計測中のみ） */}
                {active && (
                    <div className={styles.bubbles} aria-hidden="true">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <span key={i} style={{ '--d': `${i * 0.12}s`, '--x': `${(i % 4) * 25 + 5}%` }} />
                        ))}
                    </div>
                )}

                {/* 上部：脳アイコン（ハロー＋マスク塗り＋線画） */}
                <button
                    type="button"
                    className={styles.iconSlot}
                    title="脳汁発散！"
                    onClick={handleIconClick}
                    aria-label="脳汁アイコン"
                >
                    {/* 背面ハロー（暗背景での視認性向上） */}
                    <div className={styles.halo} aria-hidden="true" />

                    {/* 明色グラデの塗り（SVGをマスクとして使用） */}
                    <div
                        className={styles.brainFill}
                        style={{
                            WebkitMaskImage: `url(${brainUrl})`,
                            maskImage: `url(${brainUrl})`,
                        }}
                        aria-hidden="true"
                    />

                    {/* 線画（強制ハイコントラストのストローク色） */}
                    <BrainSvg className={styles.brainIcon} />
                </button>

                {/* 下部：15秒タイマー */}
                <button
                    type="button"
                    className={styles.timerStrip}
                    onClick={handleTimerClick}
                    disabled={active}
                    aria-label={active ? '沈黙タイマー動作中' : '沈黙タイマー開始（15秒）'}
                    title="沈黙タイマー（15秒）"
                >
                    <div className={styles.timerInner}>
                        <span className={styles.count}>{active ? secondsLeft : 15}</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
