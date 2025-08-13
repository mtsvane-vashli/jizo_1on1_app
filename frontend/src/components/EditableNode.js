import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import styles from './EditableNode.module.css';

function EditableNode({ data, id }) {
    const { label: initialLabel, updateNodeLabel } = data;

    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(initialLabel);

    useEffect(() => {
        setLabel(initialLabel);
    }, [initialLabel]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleInputChange = (e) => {
        setLabel(e.target.value);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (updateNodeLabel && initialLabel !== label) {
            updateNodeLabel(id, label);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    return (
        <div
            className={styles.editableNode}
            onDoubleClick={handleDoubleClick}
        >
            {/* ★★★ 各ハンドルにユニークなIDを設定して接続を正常化 ★★★ */}
            <Handle type="target" position={Position.Top} id="top" className={styles.handle} />
            <Handle type="source" position={Position.Top} id="top" className={styles.handle} />
            <Handle type="target" position={Position.Right} id="right" className={styles.handle} />
            <Handle type="source" position={Position.Right} id="right" className={styles.handle} />
            <Handle type="target" position={Position.Bottom} id="bottom" className={styles.handle} />
            <Handle type="source" position={Position.Bottom} id="bottom" className={styles.handle} />
            <Handle type="target" position={Position.Left} id="left" className={styles.handle} />
            <Handle type="source" position={Position.Left} id="left" className={styles.handle} />

            {isEditing ? (
                <textarea
                    value={label}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={styles.nodeInput}
                    autoFocus
                />
            ) : (
                <div className={styles.nodeLabel}>{label || '...'}</div>
            )}
        </div>
    );
}

export default React.memo(EditableNode);
