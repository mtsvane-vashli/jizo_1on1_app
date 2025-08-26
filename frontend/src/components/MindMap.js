import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    MiniMap,
    Controls,
    Background,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    MarkerType,
    Position,
    Handle,
    useStore,
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './MindMap.module.css';
import { FiPlus, FiRotateCcw, FiRotateCw, FiMaximize, FiMinimize } from 'react-icons/fi';

/** =========================================================
 *  配置・間隔（固定距離）
 *  =======================================================*/
const NODE_WIDTH = 180;           // 近似の既定幅（実測がまだない瞬間のフォールバック）
const NODE_HEIGHT = 60;           // 近似の既定高（フォールバック）
const PARENT_CHILD_GAP = 36;      // 親の右端→子の左端の距離（ご要望の1/3相当）
const CHILD_VERTICAL_GAP = 40;    // 子同士の縦間隔（中心対称）
const ROOT_X = 100;               // ルート列X
const ROOT_START_Y = 100;         // ルート起点Y
const ROOT_VERTICAL_GAP = 160;    // ルート同士の縦間隔

/** =========================================================
 *  Undo/Redo（元に戻す/やり直す）
 *  =======================================================*/
const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((action, overwrite = false) => {
        const prev = history[currentIndex];
        const next = typeof action === 'function' ? action(prev) : action;
        if (!overwrite && JSON.stringify(next) === JSON.stringify(prev)) return;

        const base = overwrite ? history.slice(0, currentIndex) : history.slice(0, currentIndex + 1);
        setHistory([...base, next]);
        setCurrentIndex(base.length);
    }, [history, currentIndex]);

    const undo = useCallback(() => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); }, [currentIndex]);
    const redo = useCallback(() => { if (currentIndex < history.length - 1) setCurrentIndex(currentIndex + 1); }, [currentIndex, history.length]);

    return [history[currentIndex], setState, undo, redo, currentIndex > 0, currentIndex < history.length - 1];
};

/** =========================================================
 *  ノード矩形（実測優先）
 *  =======================================================*/
const nodeInternalsSelector = (s) => s.nodeInternals;
function getNodeRect(node) {
    const x = node?.positionAbsolute?.x ?? node?.position?.x ?? 0;
    const y = node?.positionAbsolute?.y ?? node?.position?.y ?? 0;
    const w = node?.measured?.width ?? node?.width ?? NODE_WIDTH;
    const h = node?.measured?.height ?? node?.height ?? NODE_HEIGHT;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

/** =========================================================
 *  ユーティリティ
 *  =======================================================*/
const extractNum = (id) => {
    const m = String(id).match(/\d+$/);
    return m ? parseInt(m[0], 10) : 0;
};
const nextNodeId = (nodes) => `node_${nodes.reduce((maxId, n) => Math.max(maxId, extractNum(n.id)), 0) + 1}`;
const isEditingElement = () => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

/** =========================================================
 *  カスタムノード（ダブルクリック編集 / 右上± / 左右ハンドル）
 *  =======================================================*/
const MindMapNode = ({ id, data, selected }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(data.label || '');

    useEffect(() => setValue(data.label || ''), [data.label]);

    const startEdit = (e) => { e.stopPropagation(); setEditing(true); };
    const commit = () => { data.updateNodeLabel?.(id, value?.trim() || ''); setEditing(false); };
    const cancel = () => { setValue(data.label || ''); setEditing(false); };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
        else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); commit(); }
    };

    return (
        <div className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${data.collapsed ? styles.nodeCollapsed : ''}`}>
            {data.hasChildren ? (
                <button
                    className={`${styles.collapseBtn} ${data.collapsed ? styles.collapsed : ''}`}
                    title={data.collapsed ? '展開' : '折りたたみ'}
                    onClick={(e) => { e.stopPropagation(); data.onToggleCollapse?.(id); }}
                >
                    {data.collapsed ? '+' : '−'}
                </button>
            ) : null}

            {/* 左右のみハンドル（接続点） */}
            <Handle id="l" type="target" position={Position.Left} className={`${styles.handle} ${styles.handleLeft}`} />
            <Handle id="r" type="source" position={Position.Right} className={`${styles.handle} ${styles.handleRight}`} />

            {editing ? (
                <input
                    className={styles.nodeInput}
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={commit}
                    onKeyDown={onKeyDown}
                    placeholder="ノード名"
                />
            ) : (
                <div className={styles.nodeLabel} onDoubleClick={startEdit} title="ダブルクリックで名称編集">
                    {data.label || 'ノード'}
                </div>
            )}
        </div>
    );
};

const nodeTypes = { editable: MindMapNode };

/** =========================================================
 *  Provider 配下で動作する内側コンポーネント
 *  =======================================================*/
const MindMapInner = ({ mindMapData, setMindMapData, mindMapRef, isFullscreen, setIsFullscreen }) => {
    const [state, setState, undo, redo, canUndo, canRedo] = useHistory({ nodes: [], edges: [] });
    const { nodes, edges } = state;
    const isInitialized = useRef(false);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    const nodeInternals = useStore(nodeInternalsSelector);

    /** ---------- 初期化 ---------- */
    useEffect(() => {
        if (mindMapData && !isInitialized.current) {
            const initialNodes = (mindMapData.nodes || []).map((n) => ({
                ...n,
                type: 'editable',
                parentId: typeof n.parentId === 'undefined' ? null : n.parentId,
                collapsed: !!n.collapsed,
            }));
            if (initialNodes.length === 0) {
                initialNodes.push({
                    id: 'node_1',
                    type: 'editable',
                    position: { x: ROOT_X, y: ROOT_START_Y },
                    data: { label: '中心トピック' },
                    parentId: null,
                    collapsed: false,
                });
            }
            const initialEdges = (mindMapData.edges || []).map((e) => ({
                ...e,
                id: e.id || `e_${e.source}_${e.target}`,
                // 標準エッジ（ベジェ）+ 矢印
                type: undefined,
                markerEnd: { type: MarkerType.ArrowClosed },
            }));
            const laid = reflowRoots(initialNodes);
            setState({ nodes: laid, edges: initialEdges }, true);
            isInitialized.current = true;
        }
    }, [mindMapData, setState]);

    // 親へ同期
    useEffect(() => { if (isInitialized.current) setMindMapData(state); }, [state, setMindMapData]);

    /** ---------- 変更ハンドラ ---------- */
    const onNodesChange = useCallback(
        (changes) => setState((cur) => ({ ...cur, nodes: applyNodeChanges(changes, cur.nodes) }), true),
        [setState]
    );
    const onEdgesChange = useCallback(
        (changes) => setState((cur) => ({ ...cur, edges: applyEdgeChanges(changes, cur.edges) }), true),
        [setState]
    );

    /** ---------- 接続（ドラッグで手動接続）→ 階層にも反映 ---------- */
    const onConnect = useCallback(
        (connection) => {
            const { source, target } = connection;
            if (!source || !target) return;

            setState((cur) => {
                const isAncestor = (startId, maybeAncestorId) => {
                    let n = cur.nodes.find((x) => x.id === startId);
                    const visited = new Set();
                    while (n && n.parentId && !visited.has(n.parentId)) {
                        if (n.parentId === maybeAncestorId) return true;
                        visited.add(n.parentId);
                        n = cur.nodes.find((x) => x.id === n.parentId);
                    }
                    return false;
                };
                const allowParentSet = !isAncestor(source, target);

                let edges = cur.edges.filter((e) => !(e.target === target && e.source !== source));

                const edgeWithArrow = {
                    ...connection,
                    id: connection.id || `e_${source}_${target}`,
                    type: undefined,
                    markerEnd: { type: MarkerType.ArrowClosed },
                };
                edges = addEdge(edgeWithArrow, edges);

                let oldParent = null;
                let nodes = cur.nodes.map((n) => {
                    if (n.id === target && allowParentSet) {
                        oldParent = n.parentId ?? null;
                        return { ...n, parentId: source };
                    }
                    return n;
                });

                if (allowParentSet) {
                    nodes = reflowChildren(nodes, source, nodeInternals);
                    if (oldParent) nodes = reflowChildren(nodes, oldParent, nodeInternals);
                }

                return { ...cur, nodes, edges };
            });
        },
        [setState, nodeInternals]
    );

    const updateNodeLabel = useCallback(
        (nodeId, newLabel) => {
            setState((cur) => ({
                ...cur,
                nodes: cur.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n)),
            }));
        },
        [setState]
    );

    const onSelectionChange = useCallback(({ nodes: sel }) => {
        setSelectedNodeId(sel && sel.length ? sel[0].id : null);
    }, []);

    /** ---------- レイアウト：真右・中心対称で固定距離 ---------- */
    function getRectById(id) {
        const internal = nodeInternals.get(id);
        if (!internal) return { w: NODE_WIDTH, h: NODE_HEIGHT };
        const w = internal?.measured?.width ?? internal?.width ?? NODE_WIDTH;
        const h = internal?.measured?.height ?? internal?.height ?? NODE_HEIGHT;
        return { w, h };
    }

    function reflowChildren(nodesArr, parentId, internals = nodeInternals) {
        const arr = [...nodesArr];
        const parent = arr.find((n) => n.id === parentId);
        if (!parent) return arr;

        const pRect = (() => {
            const ni = internals.get?.(parentId);
            const w = ni?.measured?.width ?? ni?.width ?? NODE_WIDTH;
            const h = ni?.measured?.height ?? ni?.height ?? NODE_HEIGHT;
            return { w, h };
        })();

        const pTop = parent.position?.y || 0;
        const pLeft = parent.position?.x || 0;
        const pCenterY = pTop + pRect.h / 2;
        const pRightX = pLeft + pRect.w;

        const kids = arr
            .filter((n) => n.parentId === parentId)
            .sort((a, b) => extractNum(a.id) - extractNum(b.id));

        const n = kids.length;
        if (n === 0) return arr;

        for (let i = 0; i < n; i++) {
            const cRect = getRectById(kids[i].id);
            const offsetY = (i - (n - 1) / 2) * CHILD_VERTICAL_GAP;
            const topY = pCenterY - cRect.h / 2 + offsetY;
            const leftX = pRightX + PARENT_CHILD_GAP;
            kids[i].position = { x: leftX, y: topY };
        }
        return arr;
    }

    function reflowRoots(nodesArr) {
        const arr = [...nodesArr];
        const roots = arr.filter((n) => n.parentId === null).sort((a, b) => extractNum(a.id) - extractNum(b.id));
        roots.forEach((r, i) => {
            r.position = { x: ROOT_X, y: ROOT_START_Y + i * ROOT_VERTICAL_GAP };
        });
        return arr;
    }

    /** ---------- 生成/削除 ---------- */
    const createChild = useCallback((parentId) => {
        setState((cur) => {
            const parent = cur.nodes.find((n) => n.id === parentId);
            if (!parent) return cur;

            const newId = nextNodeId(cur.nodes);
            const pRect = getRectById(parentId);
            const newNode = {
                id: newId,
                type: 'editable',
                position: {
                    x: (parent.position?.x || 0) + pRect.w + PARENT_CHILD_GAP,
                    y: (parent.position?.y || 0),
                },
                data: { label: '新しいノード' },
                parentId,
                collapsed: false,
                selected: true,
            };

            const deselected = cur.nodes.map((n) => ({ ...n, selected: false, ...(n.id === parentId ? { collapsed: false } : {}) }));
            let nodes = [...deselected, newNode];
            let edges = [
                ...cur.edges,
                { id: `e_${parentId}_${newId}`, source: parentId, target: newId, type: undefined, markerEnd: { type: MarkerType.ArrowClosed } },
            ];

            nodes = reflowChildren(nodes, parentId);
            requestAnimationFrame(() => {
                setState((cur2) => ({ ...cur2, nodes: reflowChildren(cur2.nodes, parentId) }), true);
            });

            return { ...cur, nodes, edges };
        });
    }, [setState, nodeInternals]);

    const createSibling = useCallback((baseId) => {
        setState((cur) => {
            const base = cur.nodes.find((n) => n.id === baseId);
            if (!base) return cur;

            const parentId = base.parentId ?? null;
            const newId = nextNodeId(cur.nodes);

            const newNode = {
                id: newId,
                type: 'editable',
                position: { x: base.position?.x || 0, y: base.position?.y || 0 },
                data: { label: '新しいノード' },
                parentId,
                collapsed: false,
                selected: true,
            };

            const deselected = cur.nodes.map((n) => ({ ...n, selected: false }));
            let nodes = [...deselected, newNode];
            let edges = [...cur.edges];

            if (parentId) {
                edges.push({
                    id: `e_${parentId}_${newId}`,
                    source: parentId,
                    target: newId,
                    type: undefined,
                    markerEnd: { type: MarkerType.ArrowClosed },
                });
                nodes = reflowChildren(nodes, parentId);
                requestAnimationFrame(() => {
                    setState((cur2) => ({ ...cur2, nodes: reflowChildren(cur2.nodes, parentId) }), true);
                });
            } else {
                nodes = reflowRoots(nodes);
            }

            return { ...cur, nodes, edges };
        });
    }, [setState, nodeInternals]);

    const deleteSubtree = useCallback((rootId) => {
        setState((cur) => {
            if (!rootId) return cur;
            const target = cur.nodes.find((n) => n.id === rootId);
            const parentId = target?.parentId ?? null;

            const ids = [rootId, ...collectSubtreeIds(cur.nodes, rootId)];
            let nodes = cur.nodes.filter((n) => !ids.includes(n.id));
            const edges = cur.edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target));

            nodes = parentId ? reflowChildren(nodes, parentId) : reflowRoots(nodes);
            return { ...cur, nodes, edges };
        });
        setSelectedNodeId(null);
    }, [setState]);

    function collectSubtreeIds(allNodes, rootId) {
        const out = [];
        const walk = (pid) => {
            const kids = allNodes.filter((n) => n.parentId === pid);
            for (const k of kids) { out.push(k.id); walk(k.id); }
        };
        walk(rootId);
        return out;
    }

    /** ---------- 折りたたみ/展開（±ボタン） ---------- */
    const onToggleCollapse = useCallback((nodeId) => {
        setState((cur) => {
            const node = cur.nodes.find((n) => n.id === nodeId);
            if (!node) return cur;
            const willCollapse = !node.collapsed;

            const targetIds = collectSubtreeIds(cur.nodes, nodeId);
            const nodes = cur.nodes.map((n) => {
                if (n.id === nodeId) return { ...n, collapsed: willCollapse };
                if (targetIds.includes(n.id)) return { ...n, hidden: willCollapse };
                return n;
            });
            const edges = cur.edges.map((e) =>
                (targetIds.includes(e.target) || targetIds.includes(e.source))
                    ? { ...e, hidden: willCollapse }
                    : e
            );

            return { ...cur, nodes, edges };
        });
    }, [setState]);

    /** ---------- フルスクリーン ---------- */
    const handleFullscreen = () => {
        const elem = mindMapRef.current;
        if (!document.fullscreenElement) { elem?.requestFullscreen(); }
        else { document.exitFullscreen?.(); }
    };
    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, [setIsFullscreen]);

    /** ---------- ショートカット ---------- */
    useEffect(() => {
        const handler = (e) => {
            if (isEditingElement()) return;

            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodeId) {
                e.preventDefault();
                deleteSubtree(selectedNodeId);
                return;
            }
            if (!selectedNodeId) return;

            if (e.key === 'Tab') {
                e.preventDefault();
                createChild(selectedNodeId);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                createSibling(selectedNodeId);
                return;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedNodeId, createChild, createSibling, deleteSubtree]);

    /** ---------- ノード data を拡張 ---------- */
    const nodesWithData = useMemo(() => {
        const hasChildrenMap = Object.fromEntries(nodes.map((n) => [n.id, nodes.some((m) => m.parentId === n.id)]));
        return nodes.map((n) => ({
            ...n,
            data: {
                ...(n.data || {}),
                updateNodeLabel,
                onToggleCollapse,
                collapsed: !!n.collapsed,
                hasChildren: !!hasChildrenMap[n.id],
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        }));
    }, [nodes, updateNodeLabel, onToggleCollapse]);

    return (
        <>
            <ReactFlow
                nodes={nodesWithData}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                /* edgeTypes prop は削除（警告#002対策：新しいオブジェクトを毎回渡さない） */
                fitView
                proOptions={{ hideAttribution: true }}
                nodesConnectable={true}
                edgesUpdatable={false}
                elevateEdgesOnSelect
            >
                <Controls showInteractive={false} />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>

            <div className={styles.controls}>
                <button
                    onClick={() => {
                        if (selectedNodeId) {
                            createSibling(selectedNodeId);
                        } else {
                            const newRootId = nextNodeId(nodes);
                            setState((cur) => {
                                const deselected = cur.nodes.map((n) => ({ ...n, selected: false }));
                                const nodes = [
                                    ...deselected,
                                    {
                                        id: newRootId,
                                        type: 'editable',
                                        position: { x: ROOT_X, y: ROOT_START_Y },
                                        data: { label: '新しいノード' },
                                        parentId: null,
                                        collapsed: false,
                                        selected: true,
                                    },
                                ];
                                return { ...cur, nodes: reflowRoots(nodes) };
                            });
                        }
                    }}
                    title="同階層ノードを追加（選択中） / ルート追加（未選択）"
                >
                    <FiPlus />
                </button>
                <button onClick={undo} disabled={!canUndo} title="元に戻す"><FiRotateCcw /></button>
                <button onClick={redo} disabled={!canRedo} title="やり直す"><FiRotateCw /></button>
                <button onClick={handleFullscreen} title="フルスクリーン">{isFullscreen ? <FiMinimize /> : <FiMaximize />}</button>
            </div>

            <div className={styles.hint}>
                <div>Enter：同階層ノード（編集Enterは確定のみ）</div>
                <div>Tab：子ノード（編集Tabは確定のみ）</div>
                <div>Delete/Backspace：選択ノード以下を削除</div>
                <div>ノード右上の±：折りたたみ/展開（折り畳み中も＋表示）</div>
                <div>左右の●からドラッグで任意ノードに接続（矢印つき・階層にも反映）</div>
            </div>
        </>
    );
};

/** =========================================================
 *  外側（Providerでラップ）
 *  =======================================================*/
const MindMap = ({ mindMapData, setMindMapData }) => {
    const mindMapRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    return (
        <div className={`${styles.mindMapContainer} ${isFullscreen ? styles.fullscreen : ''}`} ref={mindMapRef}>
            <ReactFlowProvider>
                <MindMapInner
                    mindMapData={mindMapData}
                    setMindMapData={setMindMapData}
                    mindMapRef={mindMapRef}
                    isFullscreen={isFullscreen}
                    setIsFullscreen={setIsFullscreen}
                />
            </ReactFlowProvider>
        </div>
    );
};

export default MindMap;

/** =========================================================
 *  純関数ヘルパ（Provider不要）
 *  =======================================================*/
function reflowRoots(nodesArr) {
    const arr = [...nodesArr];
    const roots = arr.filter((n) => n.parentId === null).sort((a, b) => extractNum(a.id) - extractNum(b.id));
    roots.forEach((r, i) => {
        r.position = { x: ROOT_X, y: ROOT_START_Y + i * ROOT_VERTICAL_GAP };
    });
    return arr;
}

function reflowChildren(nodesArr, parentId, nodeInternals) {
    const arr = [...nodesArr];
    const parent = arr.find((n) => n.id === parentId);
    if (!parent) return arr;

    const w = NODE_WIDTH, h = NODE_HEIGHT;
    const pTop = parent.position?.y || 0;
    const pLeft = parent.position?.x || 0;
    const pCenterY = pTop + h / 2;
    const pRightX = pLeft + w;

    const kids = arr
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => extractNum(a.id) - extractNum(b.id));

    const n = kids.length;
    if (n === 0) return arr;

    for (let i = 0; i < n; i++) {
        const offsetY = (i - (n - 1) / 2) * CHILD_VERTICAL_GAP;
        const topY = pCenterY - NODE_HEIGHT / 2 + offsetY;
        const leftX = pRightX + PARENT_CHILD_GAP;
        kids[i].position = { x: leftX, y: topY };
    }
    return arr;
}
