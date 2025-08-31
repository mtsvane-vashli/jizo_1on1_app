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
    useStoreApi,           // 内部ストアは購読しない
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './MindMap.module.css';
import {
    FiPlus,
    FiRotateCcw,
    FiRotateCw,
    FiMaximize,
    FiMinimize,
    FiCornerRightDown,
    FiCornerDownRight,
    FiTrash2,
    FiRefreshCw,
} from 'react-icons/fi';

/** ====================== 配置・間隔 定数 ====================== */
const NODE_WIDTH_FALLBACK = 180;
const NODE_HEIGHT_FALLBACK = 60;
const H_GAP_PARENT_CHILD = 36;        // 親→子の水平距離
const MIN_SIBLING_V_GAP = 56;         // 兄弟の最小縦間隔
const SIBLING_EXTRA_PADDING = 12;     // 兄弟間隔に足す余白
const GROUP_GAP_BETWEEN_BLOCKS = 24;  // 同レベルの「子ノード群」同士の最小間隔
const ROOT_X = 100;
const ROOT_START_Y = 100;
const ROOT_V_GAP = 160;

/** ====================== Undo/Redo ====================== */
const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [idx, setIdx] = useState(0);

    const setState = useCallback((updater, overwrite = false) => {
        const prev = history[idx];
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (!overwrite && JSON.stringify(next) === JSON.stringify(prev)) return;

        const base = overwrite ? history.slice(0, idx) : history.slice(0, idx + 1);
        setHistory([...base, next]);
        setIdx(base.length);
    }, [history, idx]);

    const undo = useCallback(() => { if (idx > 0) setIdx(idx - 1); }, [idx]);
    const redo = useCallback(() => { if (idx < history.length - 1) setIdx(idx + 1); }, [idx, history.length]);

    return [history[idx], setState, undo, redo, idx > 0, idx < history.length - 1];
};

/** ====================== 内部ノード実測ヘルパ ====================== */
function getRectFromInternal(internal) {
    const w = internal?.measured?.width ?? internal?.width ?? NODE_WIDTH_FALLBACK;
    const h = internal?.measured?.height ?? internal?.height ?? NODE_HEIGHT_FALLBACK;
    return { w, h };
}

/** ====================== 汎用 ====================== */
const extractNum = (id) => {
    const m = String(id).match(/\d+$/);
    return m ? parseInt(m[0], 10) : 0;
};
const nextNodeId = (nodes) => `node_${nodes.reduce((m, n) => Math.max(m, extractNum(n.id)), 0) + 1}`;
const isEditingElement = () => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

/** ====================== カスタムノード ====================== */
const MindMapNode = ({ id, data, selected }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(data.label || '');

    useEffect(() => setValue(data.label || ''), [data.label]);

    const startEdit = (e) => { e.stopPropagation(); setEditing(true); };
    const commit = () => { data.updateNodeLabel?.(id, value?.trim() || ''); setEditing(false); };
    const cancel = () => { setValue(data.label || ''); setEditing(false); };

    const onKeyDown = (e) => {
        if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return; // IME確定中は流す
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

            <div className={styles.nodeToolbar}>
                <button className={styles.nodeToolBtn} title="子ノードを追加（Tab）" onClick={(e) => { e.stopPropagation(); data.onAddChild?.(id); }}>
                    <FiCornerRightDown />
                </button>
                <button className={styles.nodeToolBtn} title="兄弟ノードを追加（Enter）" onClick={(e) => { e.stopPropagation(); data.onAddSibling?.(id); }}>
                    <FiCornerDownRight />
                </button>
                <button className={styles.nodeToolBtnDanger} title="このノード以下を削除（Delete/Backspace）" onClick={(e) => { e.stopPropagation(); data.onDeleteSubtree?.(id); }}>
                    <FiTrash2 />
                </button>
            </div>

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

/** ====================== Provider配下 ====================== */
const MindMapInner = ({ mindMapData, setMindMapData, mindMapRef, isFullscreen, setIsFullscreen }) => {
    const [state, setState, undo, redo, canUndo, canRedo] = useHistory({ nodes: [], edges: [] });
    const { nodes, edges } = state;
    const isInitialized = useRef(false);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    // ReactFlow の store を購読せず、必要時のみ読む
    const storeApi = useStoreApi();

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
                type: undefined,
                markerEnd: { type: MarkerType.ArrowClosed },
            }));
            const laid = reflowRoots(initialNodes);
            setState({ nodes: laid, edges: initialEdges }, true);
            isInitialized.current = true;
        }
    }, [mindMapData, setState]);

    /** ---------- 親へ同期（保存用） ---------- */
    useEffect(() => {
        if (isInitialized.current) setMindMapData(state);
    }, [state, setMindMapData]);

    /** ---------- 変更ハンドラ（空配列なら何もしない） ---------- */
    const onNodesChange = useCallback(
        (changes) => {
            if (!changes || changes.length === 0) return;
            setState((cur) => ({ ...cur, nodes: applyNodeChanges(changes, cur.nodes) }), true);
        },
        [setState]
    );
    const onEdgesChange = useCallback(
        (changes) => {
            if (!changes || changes.length === 0) return;
            setState((cur) => ({ ...cur, edges: applyEdgeChanges(changes, cur.edges) }), true);
        },
        [setState]
    );

    /** ---------- 接続（ドラッグ）→ 階層にも反映（レベルごと再パック） ---------- */
    const onConnect = useCallback((connection) => {
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
            const edgeWithArrow = { ...connection, id: connection.id || `e_${source}_${target}`, type: undefined, markerEnd: { type: MarkerType.ArrowClosed } };
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
                const internals = storeApi.getState().nodeInternals;
                // 新しい親のレベル、古い親のレベルの両方を再パック
                nodes = reflowLevelForParent(nodes, source, internals);
                if (oldParent) nodes = reflowLevelForParent(nodes, oldParent, internals);
            }
            return { ...cur, nodes, edges };
        });
    }, [setState, storeApi]);

    /** ---------- ラベル編集（子群は変化しないが、念のため親/自分配下を整える） ---------- */
    const updateNodeLabel = useCallback((nodeId, newLabel) => {
        setState((cur) => {
            let nodes = cur.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n));
            const me = nodes.find((n) => n.id === nodeId);
            if (!me) return { ...cur, nodes };

            const internals = storeApi.getState().nodeInternals;
            // 自分が親なら配下、さらに同レベル全体を再パック
            if (nodes.some((n) => n.parentId === nodeId)) {
                nodes = reflowLevelForParent(nodes, nodeId, internals);
            }
            // 自分に親がいればそのレベルも再パック
            if (me.parentId) nodes = reflowLevelForParent(nodes, me.parentId, internals);
            else nodes = reflowRoots(nodes);

            return { ...cur, nodes };
        });
    }, [setState, storeApi]);

    const onSelectionChange = useCallback(({ nodes: sel }) => {
        setSelectedNodeId(sel && sel.length ? sel[0].id : null);
    }, []);

    /** ---------- 手動 全体整列（各レベルを順にパック） ---------- */
    const reflowAll = useCallback(() => {
        setState((cur) => {
            let nArr = reflowRoots(cur.nodes);
            const internals = storeApi.getState().nodeInternals;
            const levels = computeLevels(nArr);
            for (const depth of levels.order) {
                const parentIds = levels.parentsByDepth.get(depth) || [];
                nArr = reflowLevelForParentList(nArr, parentIds, internals);
            }
            return { ...cur, nodes: nArr };
        }, true);
    }, [setState, storeApi]);

    /** ---------- 生成/削除（レベルごと再パック） ---------- */
    const createChild = useCallback((parentId) => {
        setState((cur) => {
            const parent = cur.nodes.find((n) => n.id === parentId);
            if (!parent) return cur;

            const newId = nextNodeId(cur.nodes);
            const internals = storeApi.getState().nodeInternals;
            const { w: pW } = getRectFromInternal(internals.get?.(parentId));

            const newNode = {
                id: newId,
                type: 'editable',
                position: { x: (parent.position?.x || 0) + pW + H_GAP_PARENT_CHILD, y: (parent.position?.y || 0) },
                data: { label: '新しいノード' },
                parentId,
                collapsed: false,
                selected: true,
            };

            const deselected = cur.nodes.map((n) => ({ ...n, selected: false, ...(n.id === parentId ? { collapsed: false } : {}) }));
            let nodes = [...deselected, newNode];
            let edges = [...cur.edges, { id: `e_${parentId}_${newId}`, source: parentId, target: newId, type: undefined, markerEnd: { type: MarkerType.ArrowClosed } }];

            nodes = reflowLevelForParent(nodes, parentId, internals);
            return { ...cur, nodes, edges };
        });
    }, [setState, storeApi]);

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

            const internals = storeApi.getState().nodeInternals;

            if (parentId) {
                edges.push({ id: `e_${parentId}_${newId}`, source: parentId, target: newId, type: undefined, markerEnd: { type: MarkerType.ArrowClosed } });
                nodes = reflowLevelForParent(nodes, parentId, internals);
            } else {
                nodes = reflowRoots(nodes);
            }
            return { ...cur, nodes, edges };
        });
    }, [setState, storeApi]);

    const deleteSubtree = useCallback((rootId) => {
        setState((cur) => {
            if (!rootId) return cur;
            const target = cur.nodes.find((n) => n.id === rootId);
            const parentId = target?.parentId ?? null;

            const ids = [rootId, ...collectSubtreeIds(cur.nodes, rootId)];
            let nodes = cur.nodes.filter((n) => !ids.includes(n.id));
            const edges = cur.edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target));

            const internals = storeApi.getState().nodeInternals;
            nodes = parentId ? reflowLevelForParent(nodes, parentId, internals) : reflowRoots(nodes);
            return { ...cur, nodes, edges };
        });
        setSelectedNodeId(null);
    }, [setState, storeApi]);

    function collectSubtreeIds(allNodes, rootId) {
        const out = [];
        const walk = (pid) => {
            const kids = allNodes.filter((n) => n.parentId === pid);
            for (const k of kids) { out.push(k.id); walk(k.id); }
        };
        walk(rootId);
        return out;
    }

    /** ---------- 折りたたみ/展開（レベルごと再パック） ---------- */
    const onToggleCollapse = useCallback((nodeId) => {
        setState((cur) => {
            const node = cur.nodes.find((n) => n.id === nodeId);
            if (!node) return cur;
            const willCollapse = !node.collapsed;

            const targetIds = collectSubtreeIds(cur.nodes, nodeId);
            let nodes = cur.nodes.map((n) => {
                if (n.id === nodeId) return { ...n, collapsed: willCollapse };
                if (targetIds.includes(n.id)) return { ...n, hidden: willCollapse };
                return n;
            });
            const edges = cur.edges.map((e) =>
                (targetIds.includes(e.target) || targetIds.includes(e.source)) ? { ...e, hidden: willCollapse } : e
            );

            const internals = storeApi.getState().nodeInternals;
            // 自分のレベル（=自分が親のレベル）を再パック
            nodes = reflowLevelForParent(nodes, nodeId, internals);

            return { ...cur, nodes, edges };
        });
    }, [setState, storeApi]);

    /** ---------- フルスクリーン ---------- */
    const handleFullscreen = () => {
        const elem = mindMapRef.current;
        if (!document.fullscreenElement) { elem?.requestFullscreen?.(); }
        else { document.exitFullscreen?.(); }
    };
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, [setIsFullscreen]);

    /** ---------- キー操作（MacのTab問題を回避） ---------- */
    useEffect(() => {
        const handler = (e) => {
            if (isEditingElement()) return;

            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodeId) {
                e.preventDefault();
                deleteSubtree(selectedNodeId);
                return;
            }
            if (!selectedNodeId) return;

            if (e.nativeEvent?.isComposing || e.keyCode === 229) return; // IME確定中は無視

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
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [selectedNodeId, createChild, createSibling, deleteSubtree]);

    /** ---------- data拡張（メモ化） ---------- */
    const nodesWithData = useMemo(() => {
        const hasKids = Object.fromEntries(nodes.map((n) => [n.id, nodes.some((m) => m.parentId === n.id)]));
        return nodes.map((n) => ({
            ...n,
            data: {
                ...(n.data || {}),
                updateNodeLabel,
                onToggleCollapse,
                onAddChild: createChild,
                onAddSibling: createSibling,
                onDeleteSubtree: deleteSubtree,
                collapsed: !!n.collapsed,
                hasChildren: !!hasKids[n.id],
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        }));
    }, [nodes, updateNodeLabel, onToggleCollapse, createChild, createSibling, deleteSubtree]);

    return (
        <>
            <div className={styles.keyCapture} tabIndex={0} onKeyDown={() => { }}>
                <ReactFlow
                    nodes={nodesWithData}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onSelectionChange={onSelectionChange}
                    nodeTypes={nodeTypes}
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
            </div>

            <div className={styles.controls}>
                <button
                    onClick={() =>
                        selectedNodeId
                            ? createSibling(selectedNodeId)
                            : (() => {
                                const newRootId = nextNodeId(nodes);
                                setState((cur) => {
                                    const deselected = cur.nodes.map((n) => ({ ...n, selected: false }));
                                    const nodes = [...deselected, {
                                        id: newRootId,
                                        type: 'editable',
                                        position: { x: ROOT_X, y: ROOT_START_Y },
                                        data: { label: '新しいノード' },
                                        parentId: null,
                                        collapsed: false,
                                        selected: true,
                                    }];
                                    return { ...cur, nodes: reflowRoots(nodes) };
                                });
                            })()
                    }
                    title={selectedNodeId ? '兄弟ノードを追加（Enter）' : 'ルートを追加'}
                >
                    <FiPlus /><span style={{ fontSize: 12 }}>兄弟/ルート</span>
                </button>

                <button onClick={() => selectedNodeId && createChild(selectedNodeId)} disabled={!selectedNodeId} title="子ノードを追加（Tab）">
                    <FiCornerRightDown /><span style={{ fontSize: 12 }}>子</span>
                </button>

                <button onClick={() => selectedNodeId && deleteSubtree(selectedNodeId)} disabled={!selectedNodeId} title="このノード以下を削除（Delete/Backspace）">
                    <FiTrash2 /><span style={{ fontSize: 12 }}>削除</span>
                </button>

                <button onClick={reflowAll} title="全体を整列">
                    <FiRefreshCw /><span style={{ fontSize: 12 }}>整列</span>
                </button>

                <button onClick={undo} disabled={!canUndo} title="元に戻す"><FiRotateCcw /></button>
                <button onClick={redo} disabled={!canRedo} title="やり直す"><FiRotateCw /></button>
                <button onClick={handleFullscreen} title="フルスクリーン">{isFullscreen ? <FiMinimize /> : <FiMaximize />}</button>
            </div>

            <div className={styles.hint}>
                <div>Enter：同階層（兄弟）追加 / Tab：子ノード追加</div>
                <div>Delete/Backspace：選択ノード以下を削除</div>
                <div>ノード右上「±」：折りたたみ/展開</div>
                <div>ノード内のボタンでも「子/兄弟/削除」を操作可</div>
                <div>左右の●ドラッグで任意ノードに接続（階層も更新）</div>
            </div>
        </>
    );
};

/** ====================== 外側（Provider） ====================== */
const MindMap = ({ mindMapData, setMindMapData }) => {
    const mindMapRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const el = mindMapRef.current?.querySelector(`.${styles.keyCapture}`);
        el?.focus?.();
    }, []);

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

/** ====================== レイアウト純関数群 ====================== */

// ルート整列（従来どおり固定）
function reflowRoots(nodesArr) {
    const arr = [...nodesArr];
    const roots = arr.filter((n) => n.parentId === null).sort((a, b) => extractNum(a.id) - extractNum(b.id));
    roots.forEach((r, i) => { r.position = { x: ROOT_X, y: ROOT_START_Y + i * ROOT_V_GAP }; });
    return arr;
}

// 深さ（レベル）計算と親一覧
function computeLevels(nodesArr) {
    const arr = [...nodesArr];
    const roots = arr.filter((n) => n.parentId === null);
    const parentsByDepth = new Map(); // depth -> parentIds[]
    const depthMap = new Map();       // nodeId -> depth

    const q = [...roots];
    roots.forEach(r => depthMap.set(r.id, 0));

    while (q.length) {
        const p = q.shift();
        const d = depthMap.get(p.id) ?? 0;
        if (!parentsByDepth.has(d)) parentsByDepth.set(d, []);
        if (!parentsByDepth.get(d).includes(p.id)) parentsByDepth.get(d).push(p.id);

        const kids = arr.filter((n) => n.parentId === p.id);
        for (const k of kids) {
            if (!depthMap.has(k.id)) {
                depthMap.set(k.id, d + 1);
                q.push(k);
            }
        }
    }

    // 孤立ノード（親が見つからない）の救済
    for (const n of arr) if (!depthMap.has(n.id)) depthMap.set(n.id, 0);

    const order = Array.from(parentsByDepth.keys()).sort((a, b) => a - b);
    return { depthMap, parentsByDepth, order };
}

// ある親と同じ深さにいる「親たち」全員の子群をまとめて再配置
function reflowLevelForParent(nodesArr, parentId, internals) {
    const { depthMap, parentsByDepth } = computeLevels(nodesArr);
    const depth = depthMap.get(parentId) ?? 0;
    const parentIds = parentsByDepth.get(depth) || [];
    return reflowLevelForParentList(nodesArr, parentIds, internals);
}

// 親IDリスト（同じ深さの親群）に対して、子ノード群を縦パック
function reflowLevelForParentList(nodesArr, parentIds, internals) {
    const arr = [...nodesArr];

    // レベル内のすべての子ノードの高さから、統一スロット高を決める
    let maxChildH = 0;
    for (const pid of parentIds) {
        const kids = arr.filter((n) => n.parentId === pid && !n.hidden);
        for (const k of kids) {
            const ki = internals?.get?.(k.id);
            const ch = ki?.measured?.height ?? ki?.height ?? NODE_HEIGHT_FALLBACK;
            if (ch > maxChildH) maxChildH = ch;
        }
    }
    const SLOT = Math.max(MIN_SIBLING_V_GAP, maxChildH + SIBLING_EXTRA_PADDING);
    const REF_H = maxChildH || NODE_HEIGHT_FALLBACK; // 子が一つでもいれば maxChildH、いなければ使われない

    // 親を画面上の位置（y座標）で昇順に並べ、上から順に詰めていく
    const sortedParents = parentIds
        .map((pid) => arr.find((n) => n.id === pid))
        .filter(Boolean)
        .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));

    let prevBottom = -Infinity;

    for (const parent of sortedParents) {
        const pid = parent.id;
        const kids = arr
            .filter((n) => n.parentId === pid && !n.hidden)
            .sort((a, b) => extractNum(a.id) - extractNum(b.id));

        if (kids.length === 0) continue;

        // 親の実測
        const pI = internals?.get?.(pid);
        const { w: pW, h: pH } = getRectFromInternal(pI);
        const pTop = parent.position?.y || 0;
        const pLeft = parent.position?.x || 0;
        const pCenterY = pTop + pH / 2;
        const pRightX = pLeft + pW;

        // 子群の高さ（REF_H を基準に算出）
        const groupH = (kids.length - 1) * SLOT + REF_H;

        // 親中心に置きたい top 候補
        const desiredTop = pCenterY - groupH / 2;

        // 直前の群の bottom から最小間隔を空けるように押し下げる
        const top = Math.max(desiredTop, prevBottom + GROUP_GAP_BETWEEN_BLOCKS);

        // 配置：各スロット中心は top + i*SLOT + REF_H/2
        for (let i = 0; i < kids.length; i++) {
            const ki = internals?.get?.(kids[i].id);
            const ch = ki?.measured?.height ?? ki?.height ?? NODE_HEIGHT_FALLBACK;
            const centerY = top + i * SLOT + REF_H / 2;
            const childTop = centerY - ch / 2;
            const leftX = pRightX + H_GAP_PARENT_CHILD;
            kids[i].position = { x: leftX, y: childTop };
        }

        prevBottom = top + groupH;
    }

    return arr;
}
