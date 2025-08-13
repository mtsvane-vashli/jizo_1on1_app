import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    getBezierPath,
    MarkerType, // ★★★ 矢印の型をインポート ★★★
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './MindMap.module.css';
import { FiPlus, FiRotateCcw, FiRotateCw, FiMaximize, FiMinimize } from 'react-icons/fi';
import EditableNode from './EditableNode';

// パフォーマンス向上のため、コンポーネントの外で定義
const nodeTypes = { editable: EditableNode };
let idCounter = 0;

// Undo/Redo（元に戻す/やり直す）のためのカスタムフック
const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((action, overwrite = false) => {
        const newState = typeof action === 'function' ? action(history[currentIndex]) : action;
        if (!overwrite && JSON.stringify(newState) === JSON.stringify(history[currentIndex])) {
            return;
        }

        const newHistory = overwrite ? history.slice(0, currentIndex) : history.slice(0, currentIndex + 1);
        setHistory([...newHistory, newState]);
        setCurrentIndex(newHistory.length);
    }, [currentIndex, history]);

    const undo = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);
    const redo = () => currentIndex < history.length - 1 && setCurrentIndex(currentIndex + 1);

    return [history[currentIndex], setState, undo, redo, currentIndex > 0, currentIndex < history.length - 1];
};

// アニメーション付きの接続線コンポーネント
const AnimatedConnectionLine = ({ fromX, fromY, toX, toY }) => {
    const [edgePath] = getBezierPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY });
    return (
        <g>
            <path
                fill="none"
                stroke="var(--color-text-primary, black)"
                strokeWidth={2}
                className={styles.animatedDash}
                d={edgePath}
                style={{ strokeDasharray: '5 5' }}
            />
        </g>
    );
};


const MindMap = ({ mindMapData, setMindMapData }) => {
    const mindMapRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 内部でUndo/Redoを含む状態管理を行う
    const [state, setState, undo, redo, canUndo, canRedo] = useHistory({ nodes: [], edges: [] });
    const { nodes, edges } = state;
    const isInitialized = useRef(false);

    // 親からのデータで初回のみ初期化する
    useEffect(() => {
        if (mindMapData && !isInitialized.current) {
            const initialNodes = (mindMapData.nodes || []).map(n => ({ ...n, type: 'editable' }));
            if (initialNodes.length === 0) {
                initialNodes.push({ id: '1', type: 'editable', position: { x: 250, y: 150 }, data: { label: '中心トピック' } });
            }
            // ★★★ 読み込んだエッジにも矢印を追加 ★★★
            const initialEdges = (mindMapData.edges || []).map(e => ({
                ...e,
                markerEnd: { type: MarkerType.ArrowClosed }
            }));
            setState({ nodes: initialNodes, edges: initialEdges }, true);
            isInitialized.current = true;
        }
    }, [mindMapData, setState]);

    // 内部状態が変更されたら親コンポーネントに通知する
    useEffect(() => {
        if (isInitialized.current) {
            setMindMapData(state);
        }
    }, [state, setMindMapData]);

    const onNodesChange = useCallback((changes) => {
        setState(current => ({ ...current, nodes: applyNodeChanges(changes, current.nodes) }), true);
    }, [setState]);

    const onEdgesChange = useCallback((changes) => {
        setState(current => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }), true);
    }, [setState]);

    // ★★★ ノード接続時に矢印の情報を追加する ★★★
    const onConnect = useCallback((connection) => {
        const edgeWithArrow = {
            ...connection,
            markerEnd: {
                type: MarkerType.ArrowClosed,
            },
        };
        setState(current => ({ ...current, edges: addEdge(edgeWithArrow, current.edges) }));
    }, [setState]);

    const updateNodeLabel = useCallback((nodeId, newLabel) => {
        setState(current => ({
            ...current,
            nodes: current.nodes.map(node => node.id === nodeId ? { ...node, data: { ...node.data, label: newLabel } } : node)
        }));
    }, [setState]);

    const onAddNode = () => {
        idCounter = nodes.reduce((maxId, node) => {
            const nodeIdNum = parseInt(String(node.id).split('_').pop(), 10);
            return isNaN(nodeIdNum) ? maxId : Math.max(maxId, nodeIdNum);
        }, 0) + 1;

        const newNode = {
            id: `node_${idCounter}`,
            type: 'editable',
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: { label: '新しいノード' },
        };
        setState(current => ({ ...current, nodes: [...current.nodes, newNode] }));
    };

    const handleFullscreen = () => {
        const elem = mindMapRef.current;
        if (!document.fullscreenElement) {
            elem?.requestFullscreen();
        } else {
            document.exitFullscreen?.();
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const nodesWithCallback = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: { ...node.data, updateNodeLabel: updateNodeLabel }
        }));
    }, [nodes, updateNodeLabel]);

    return (
        <div className={`${styles.mindMapContainer} ${isFullscreen ? styles.fullscreen : ''}`} ref={mindMapRef}>
            <ReactFlow
                nodes={nodesWithCallback}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                connectionLineComponent={AnimatedConnectionLine}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Controls showInteractive={false} />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
            <div className={styles.controls}>
                <button onClick={onAddNode}><FiPlus /></button>
                <button onClick={undo} disabled={!canUndo}><FiRotateCcw /></button>
                <button onClick={redo} disabled={!canRedo}><FiRotateCw /></button>
                <button onClick={handleFullscreen}>
                    {isFullscreen ? <FiMinimize /> : <FiMaximize />}
                </button>
            </div>
        </div>
    );
};

export default MindMap;
