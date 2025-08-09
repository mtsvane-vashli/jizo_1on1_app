// frontend/src/components/MindMap.js
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './MindMap.module.css';
import { FiRotateCcw, FiRotateCw } from 'react-icons/fi';

// Custom hook for managing state history (Undo/Redo)
const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = (action, overwrite = false) => {
        const newState = typeof action === 'function' ? action(history[currentIndex]) : action;
        if (overwrite) {
            const newHistory = [...history];
            newHistory[currentIndex] = newState;
            setHistory(newHistory);
        } else {
            const newHistory = history.slice(0, currentIndex + 1);
            setHistory([...newHistory, newState]);
            setCurrentIndex(newHistory.length);
        }
    };

    const undo = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const redo = () => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    return [history[currentIndex], setState, undo, redo, currentIndex, history.length - 1];
};


const initialNodes = [
    { id: '1', type: 'default', data: { label: '中心テーマ' }, position: { x: 250, y: 150 } },
];
const initialEdges = [];
let id = 2;
const getId = () => `${id++}`;

const MindMap = ({ mindMapData, setMindMapData, isReadOnly = false }) => {
    const [history, setHistory, undo, redo, currentIndex, historyLength] = useHistory({
        nodes: mindMapData.nodes && mindMapData.nodes.length > 0 ? mindMapData.nodes : initialNodes,
        edges: mindMapData.edges || initialEdges
    });

    const [nodes, setNodes, onNodesChange] = useNodesState(history.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(history.edges);

    useEffect(() => {
        setNodes(history.nodes);
        setEdges(history.edges);
    }, [history, setNodes, setEdges]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(nodes) !== JSON.stringify(history.nodes) || JSON.stringify(edges) !== JSON.stringify(history.edges)) {
                const newState = { nodes, edges };
                setHistory(newState);
                if (!isReadOnly) {
                    setMindMapData(newState);
                }
            }
        }, 300); // Debounce updates

        return () => clearTimeout(handler);
    }, [nodes, edges, setMindMapData, setHistory, history.nodes, history.edges, isReadOnly]);


    const onConnect = useCallback(
        (params) => {
            if (isReadOnly) return;
            setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#D946EF' } }, eds))
        },
        [setEdges, isReadOnly],
    );

    const onAddNode = useCallback(() => {
        if (isReadOnly) return;
        const newNode = {
            id: getId(),
            data: { label: '新しいノード' },
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400,
            },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes, isReadOnly]);

    return (
        <div className={styles.mindMapContainer}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={isReadOnly ? undefined : onNodesChange}
                onEdgesChange={isReadOnly ? undefined : onEdgesChange}
                onConnect={onConnect}
                fitView
                className="mindmap-flow"
                nodesDraggable={!isReadOnly}
                nodesConnectable={!isReadOnly}
                elementsSelectable={!isReadOnly}
            >
                <Controls />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
            {!isReadOnly && (
                <div className={styles.controls}>
                    <button onClick={onAddNode}>ノードを追加</button>
                    <button onClick={undo} disabled={currentIndex === 0}><FiRotateCcw /> 元に戻す</button>
                    <button onClick={redo} disabled={currentIndex === historyLength}><FiRotateCw /> やり直す</button>
                </div>
            )}
        </div>
    );
};

export default MindMap;
