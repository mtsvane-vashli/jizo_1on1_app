// frontend/src/components/TranscriptPopup.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './TranscriptPopup.module.css';
import { FiMove, FiX, FiMinus } from 'react-icons/fi';

const TranscriptPopup = ({
    isVisible,
    onClose,
    onMinimize,
    transcript,
    interimTranscript,
}) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 520, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const popupRef = useRef(null);
    const transcriptEndRef = useRef(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, interimTranscript]);

    const handleMouseDown = useCallback((e) => {
        const headerSelector = `.${CSS.escape(styles.popupHeader)}`;
        if (e.target.closest(headerSelector)) {
            e.preventDefault();
            setIsDragging(true);
            const popupRect = popupRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: e.clientX - popupRect.left,
                y: e.clientY - popupRect.top,
            };
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y,
            });
        }
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (!isVisible) {
        return null;
    }

    return (
        <div
            ref={popupRef}
            className={styles.popupContainer}
            style={{ top: `${position.y}px`, left: `${position.x}px` }}
        >
            <div className={styles.popupHeader} onMouseDown={handleMouseDown}>
                <FiMove className={styles.moveIcon} />
                <h3 className={styles.popupTitle}>リアルタイム文字起こし</h3>
                <div className={styles.headerButtons}>
                    <button onClick={onMinimize} className={styles.headerButton} aria-label="最小化"><FiMinus /></button>
                    <button onClick={onClose} className={styles.headerButton} aria-label="閉じる"><FiX /></button>
                </div>
            </div>
            <div className={styles.popupContent}>
                {transcript.length === 0 && !interimTranscript && (
                    <p className={styles.noTranscript}>録音を開始すると文字起こしが表示されます...</p>
                )}
                {transcript.map((item, index) => (
                    <div key={index} className={styles.transcriptItem}>
                        <p className={styles.transcriptText}>
                            {item.speakerTag && <span className={styles.speakerTag}>{`話者${item.speakerTag}: `}</span>}
                            {item.transcript}
                        </p>
                    </div>
                ))}
                {interimTranscript && (
                    <div className={`${styles.transcriptItem} ${styles.interim}`}>
                        <p className={styles.transcriptText}>{interimTranscript}</p>
                    </div>
                )}
                <div ref={transcriptEndRef} />
            </div>
        </div>
    );
};

export default TranscriptPopup;
