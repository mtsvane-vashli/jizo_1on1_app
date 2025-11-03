// frontend/src/views/MindMap.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
    Background,
    MiniMap,
    MarkerType,
    Position,
    Handle,
    useEdgesState,
    useNodesState,
    useReactFlow,
    ReactFlowProvider,
    Controls,
} from "reactflow";
import "reactflow/dist/style.css";
import styles from "./MindMap.module.css";
import {
    FiRotateCcw,
    FiRotateCw,
    FiMaximize,
    FiMinimize,
    FiCornerRightDown,
    FiCornerDownRight,
    FiTrash2,
    FiRefreshCw,
    FiCrosshair,
} from "react-icons/fi";

/**
 * 仕様ポイント
 * - 背景ドラッグでパン（panOnDrag）、スクロールでパン（zoomOnScroll=false + panOnScroll）、ピンチでズーム
 * - Space 押下中はノード上でもパン（panActivationKeyCode="Space"）
 * - Enter で兄弟、Tab で子の追加（IME中は無効）
 * - ノード左右ハンドル + step エッジ + ArrowClosed
 * - フルスクリーン切替
 * - 自動レイアウト（COLUMN_GAP / MIN_SIBLING_V_GAP / 上下対称 / ルート縦整列）
 * - ドラッグで手動座標を保存（以後は自動より優先）
 * - ★ デフォルト名は常に「新しいノード」
 */

// -------------------- 定数 --------------------
const NODE_MIN_W = 160;
const NODE_HEIGHT_FALLBACK = 60;
const COLUMN_GAP = 250; // 列間（水平距離）
const MIN_SIBLING_V_GAP = 56;
const EXTRA_MARGIN = 12;
const ROOT_ROW_GAP = 160;
const INITIAL_ZOOM_TO_NODE = 1.2;
const ID = () => Math.random().toString(36).slice(2, 10);

// -------------------- ユーティリティ --------------------
const deepClone = (x) => JSON.parse(JSON.stringify(x));

function buildIndex(nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const children = new Map();
    for (const n of nodes) {
        if (n.parentId) {
            if (!children.has(n.parentId)) children.set(n.parentId, []);
            children.get(n.parentId).push(n);
        }
    }
    return { byId, children };
}

function isAncestor(id, targetId, childrenMap) {
    const stack = [id];
    while (stack.length) {
        const cur = stack.pop();
        const kids = childrenMap.get(cur) || [];
        for (const k of kids) {
            if (k.id === targetId) return true;
            stack.push(k.id);
        }
    }
    return false;
}

// -------------------- カスタムノード --------------------
function MindMapNode({ id, data, selected }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(data.label || "新しいノード");

    useEffect(() => setValue(data.label || "新しいノード"), [data.label]);

    const startEdit = (e) => {
        e.stopPropagation();
        setEditing(true);
    };
    const commit = () => {
        const v = (value ?? "").trim() || "新しいノード";
        data.updateNodeLabel?.(id, v);
        setEditing(false);
    };
    const cancel = () => {
        setValue(data.label || "新しいノード");
        setEditing(false);
    };
    const onKeyDown = (e) => {
        if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            e.stopPropagation();
            commit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancel();
        }
    };

    return (
        <div
            className={[
                styles.node,
                selected ? styles.nodeSelected : "",
                data.collapsed ? styles.nodeCollapsed : "",
            ].join(" ")}
        >
            {/* 折りたたみトグル（右上） */}
            {data.hasChildren ? (
                <button
                    className={`${styles.collapseBtn} ${data.collapsed ? styles.collapsed : ""}`}
                    title={data.collapsed ? "展開" : "折りたたみ"}
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onToggleCollapse?.(id);
                    }}
                >
                    {data.collapsed ? "+" : "−"}
                </button>
            ) : null}

            {/* ノードツールバー（子/兄弟/削除） */}
            <div className={styles.nodeToolbar} onMouseDown={(e) => e.stopPropagation()}>
                <button
                    className={styles.nodeToolBtn}
                    title="子ノード追加（Tab）"
                    onClick={() => data.onAddChild?.(id)}
                    aria-label="Add child"
                >
                    <FiCornerRightDown />
                </button>
                <button
                    className={styles.nodeToolBtn}
                    title="兄弟ノード追加（Enter）"
                    onClick={() => data.onAddSibling?.(id)}
                    aria-label="Add sibling"
                >
                    <FiCornerDownRight />
                </button>
                <button
                    className={styles.nodeToolBtnDanger}
                    title="サブツリー削除（Delete/Backspace）"
                    onClick={() => data.onDeleteSubtree?.(id)}
                    aria-label="Delete subtree"
                >
                    <FiTrash2 />
                </button>
            </div>

            {/* 接続ハンドル（左右） */}
            <Handle
                id="left"
                type="target"
                position={Position.Left}
                className={`${styles.handle} ${styles.handleLeft}`}
            />
            <Handle
                id="right"
                type="source"
                position={Position.Right}
                className={`${styles.handle} ${styles.handleRight}`}
            />

            {/* ラベル or 入力 */}
            {editing ? (
                <input
                    className={styles.nodeInput}
                    value={value}
                    autoFocus
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={commit}
                    onKeyDown={onKeyDown}
                    placeholder="新しいノード"
                />
            ) : (
                <div className={styles.nodeLabel} onDoubleClick={startEdit} title="ダブルクリックで編集">
                    {data.label || "新しいノード"}
                </div>
            )}
        </div>
    );
}
const nodeTypes = { editable: MindMapNode };

// -------------------- Top Controls（アイコンのみ） --------------------
function TopControls({
    hasSelection,
    createChild,
    createSibling,
    deleteSubtree,
    relayout,
    undo,
    redo,
    canUndo,
    canRedo,
    centerToSelected,
    isFullscreen,
    toggleFullscreen,
}) {
    return (
        <div className={styles.controls}>
            {/* 兄弟 or ルート追加（Enter相当） */}
            <button
                onClick={createSibling}
                title={hasSelection ? "兄弟ノード追加（Enter）" : "ルート追加"}
                aria-label="Add sibling or root"
            >
                <FiCornerDownRight />
            </button>

            {/* 子追加（Tab相当） */}
            <button
                onClick={createChild}
                title="子ノード追加（Tab）"
                aria-label="Add child"
                disabled={!hasSelection}
            >
                <FiCornerRightDown />
            </button>

            {/* サブツリー削除 */}
            <button
                onClick={deleteSubtree}
                title="サブツリー削除（Delete/Backspace）"
                aria-label="Delete subtree"
                disabled={!hasSelection}
            >
                <FiTrash2 />
            </button>

            {/* レイアウト / Undo / Redo / センタリング */}
            <button onClick={relayout} title="全体を整列" aria-label="Layout">
                <FiRefreshCw />
            </button>
            <button onClick={undo} title="元に戻す" aria-label="Undo" disabled={!canUndo}>
                <FiRotateCcw />
            </button>
            <button onClick={redo} title="やり直す" aria-label="Redo" disabled={!canRedo}>
                <FiRotateCw />
            </button>
            <button onClick={centerToSelected} title="選択ノードへ移動（照準）" aria-label="Center">
                <FiCrosshair />
            </button>

            {/* フルスクリーン */}
            <button onClick={toggleFullscreen} title="フルスクリーン" aria-label="Fullscreen">
                {isFullscreen ? <FiMinimize /> : <FiMaximize />}
            </button>
        </div>
    );
}

// -------------------- ラッパ（Provider） --------------------
export default function MindMap(props) {
    return (
        <ReactFlowProvider>
            <MindMapInner {...props} />
        </ReactFlowProvider>
    );
}

// -------------------- メイン --------------------
function MindMapInner({
    mindMapData,
    onChange, // (modelArray) => void
    fullscreenDefault = false,
}) {
    // 初期モデル（★ すべて「新しいノード」）
    const initialModel = useMemo(() => {
        if (mindMapData && Array.isArray(mindMapData) && mindMapData.length > 0) {
            // 受け取ったデータ中の空ラベルも「新しいノード」に補正
            return deepClone(mindMapData).map((n) => ({
                ...n,
                label: (n.label ?? "").trim() ? n.label : "新しいノード",
            }));
        }
        const root = { id: "root", label: "新しいノード", parentId: null, collapsed: false };
        const c1 = { id: ID(), label: "新しいノード", parentId: "root", collapsed: false };
        return [root, c1];
    }, [mindMapData]);

    // 履歴
    const historyRef = useRef({ past: [], present: initialModel, future: [] });

    // 実測サイズ（レイアウト用）
    const measuredRef = useRef(new Map()); // id -> {w,h}

    // UI 状態
    const [selectedId, _setSelectedId] = useState(initialModel[0]?.id ?? null);
    // ★ ReactFlow に渡し直すときにも使えるように ref でも持つ
    const selectedIdRef = useRef(initialModel[0]?.id ?? null);
    const setSelectedId = (nextId) => {
        selectedIdRef.current = nextId;
        _setSelectedId(nextId);
    };

    const [fullscreen, setFullscreen] = useState(fullscreenDefault);

    // Flow
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const rf = useReactFlow();

    // ResizeObserver の警告抑止（開発時のノイズ対策）
    useEffect(() => {
        const swallow = (e) => {
            const msg = e?.message || e?.reason?.message || "";
            if (msg.includes("ResizeObserver loop")) e.stopImmediatePropagation?.();
        };
        window.addEventListener("error", swallow);
        window.addEventListener("unhandledrejection", swallow);
        return () => {
            window.removeEventListener("error", swallow);
            window.removeEventListener("unhandledrejection", swallow);
        };
    }, []);

    // ---- レイアウト関数 ----
    const layout = useCallback((model) => {
        const { byId, children } = buildIndex(model);

        // 深さマップ
        const depth = new Map();
        const roots = model.filter((n) => !n.parentId);
        const dfsDepth = (id, d) => {
            depth.set(id, d);
            for (const c of children.get(id) || []) dfsDepth(c.id, d + 1);
        };
        for (const r of roots) dfsDepth(r.id, 0);

        // ルートのYセンタ等間隔
        let curY = 0;
        const rootY = new Map();
        roots.forEach((r, i) => {
            rootY.set(r.id, i === 0 ? 0 : (curY += ROOT_ROW_GAP));
        });

        const getMeasuredH = (id) => measuredRef.current.get(id)?.h ?? 40;

        const pos = new Map();

        const subtreeHeight = (id) => {
            if (byId.get(id).collapsed) {
                return Math.max(getMeasuredH(id), MIN_SIBLING_V_GAP);
            }
            const kids = children.get(id) || [];
            if (!kids.length) return Math.max(getMeasuredH(id), MIN_SIBLING_V_GAP);
            const needs = kids.map((k) => {
                const h = subtreeHeight(k.id);
                return Math.max(h, getMeasuredH(k.id) + EXTRA_MARGIN, MIN_SIBLING_V_GAP);
            });
            const total = needs.reduce((a, b) => a + b, 0);
            return Math.max(total, getMeasuredH(id));
        };

        const place = (id, baseX, centerY) => {
            const d = depth.get(id) || 0;
            const x = baseX + d * COLUMN_GAP;
            const hSelf = getMeasuredH(id);
            const yTop = centerY - Math.round(hSelf / 2);
            pos.set(id, { x, y: yTop });

            if (byId.get(id).collapsed) return;

            const kids = children.get(id) || [];
            if (!kids.length) return;

            const heights = kids.map((k) => subtreeHeight(k.id));
            const minGaps = kids.map((k) =>
                Math.max(getMeasuredH(k.id) + EXTRA_MARGIN, MIN_SIBLING_V_GAP)
            );
            const totalH = Math.max(
                heights.reduce((a, b) => a + b, 0),
                minGaps.reduce((a, b) => a + b, 0)
            );

            let cursor = centerY - Math.round(totalH / 2);
            for (let i = 0; i < kids.length; i++) {
                const kid = kids[i];
                const need = Math.max(heights[i], minGaps[i]);
                const kidCenter = cursor + Math.round(need / 2);
                place(kid.id, baseX, kidCenter);
                cursor += need;
            }
        };

        for (const r of roots) {
            place(r.id, 0, rootY.get(r.id) ?? 0);
        }

        return pos;
    }, []);

    // ---- Flow 投影 ----
    const projectToFlow = useCallback(
        (model, fit = false) => {
            const { children } = buildIndex(model);
            const autoPos = layout(model);
            const currentSelectedId = selectedIdRef.current;

            // 折りたたみ子孫を非表示
            const hiddenSet = new Set();
            const hideDesc = (id) => {
                for (const c of children.get(id) || []) {
                    hiddenSet.add(c.id);
                    hideDesc(c.id);
                }
            };
            for (const n of model) if (n.collapsed) hideDesc(n.id);

            // ノード（手動座標 x,y があればそれを優先）
            const rfNodes = model.map((m) => {
                const kids = children.get(m.id) || [];
                const manual = Number.isFinite(m.x) && Number.isFinite(m.y);
                const pos = manual ? { x: m.x, y: m.y } : (autoPos.get(m.id) || { x: 0, y: 0 });
                return {
                    id: m.id,
                    type: "editable",
                    data: {
                        label: m.label || "新しいノード",
                        collapsed: m.collapsed,
                        hasChildren: kids.length > 0,
                        onAddChild: (pid) => addChild(pid),
                        onAddSibling: (id) => addSibling(id),
                        onDeleteSubtree: (id) => deleteSubtree(id),
                        onToggleCollapse: (id) => toggleCollapse(id),
                        updateNodeLabel: (id, v) => renameNode(id, v),
                    },
                    position: pos,
                    draggable: true,
                    selectable: true,
                    hidden: hiddenSet.has(m.id) && m.parentId !== null,
                    style: { minWidth: NODE_MIN_W },
                    // ★ ここで React Flow にも選択状態を渡す
                    selected: m.id === currentSelectedId,
                };
            });

            // エッジ（直角step + 矢印）
            const rfEdges = [];
            for (const m of model) {
                if (!m.parentId) continue;
                if (hiddenSet.has(m.id)) continue;
                rfEdges.push({
                    id: `${m.parentId}-${m.id}`,
                    source: m.parentId,
                    target: m.id,
                    sourceHandle: "right",
                    targetHandle: "left",
                    type: "step",
                    markerEnd: { type: MarkerType.ArrowClosed },
                    selectable: false,
                    updatable: false,
                });
            }

            setNodes(rfNodes);
            setEdges(rfEdges);

            if (fit) {
                requestAnimationFrame(() => rf.fitView({ padding: 0.2, minZoom: 0.25, maxZoom: 2 }));
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [layout]
    );

    useEffect(() => {
        const currentSerialized = JSON.stringify(historyRef.current.present);

        if (!Array.isArray(mindMapData) || mindMapData.length === 0) {
            const defaultSerialized = JSON.stringify(initialModel);
            if (currentSerialized !== defaultSerialized) {
                const fallbackId = initialModel.length > 0 && typeof initialModel[0].id !== "undefined"
                    ? initialModel[0].id
                    : null;
                historyRef.current = { past: [], present: initialModel, future: [] };
                setSelectedId(fallbackId);
                projectToFlow(initialModel, true);
            }
            return;
        }

        const sanitized = deepClone(mindMapData).map((n) => {
            const label = typeof n.label === "string" ? n.label.trim() : "";
            const normalized = {
                ...n,
                label: label ? label : "新しいノード",
            };
            return normalized;
        });

        const nextSerialized = JSON.stringify(sanitized);
        if (currentSerialized === nextSerialized) return;

        const fallbackId = sanitized.length > 0 && typeof sanitized[0].id !== "undefined"
            ? sanitized[0].id
            : null;

        historyRef.current = { past: [], present: sanitized, future: [] };
        const resolvedId = (prev) => {
            if (prev && sanitized.some((node) => node.id === prev)) {
                return prev;
            }
            return fallbackId !== undefined && fallbackId !== null ? fallbackId : null;
        };
        const nextId = resolvedId(selectedIdRef.current);
        selectedIdRef.current = nextId;
        _setSelectedId(nextId);

        projectToFlow(sanitized, true);
    }, [mindMapData, initialModel, projectToFlow]);

    // ---- 履歴操作 ----
    const commitModel = useCallback(
        (next, { replace = false } = {}) => {
            const hist = historyRef.current;
            historyRef.current = replace
                ? { past: hist.past, present: next, future: [] }
                : { past: [...hist.past, hist.present], present: next, future: [] };

            onChange?.(next);
            const nextSel = (prev) =>
                prev && next.some((n) => n.id === prev) ? prev : next[0]?.id ?? null;

            const resolved = nextSel(selectedIdRef.current);
            selectedIdRef.current = resolved;
            _setSelectedId(resolved);

            projectToFlow(next, true);
        },
        [onChange, projectToFlow]
    );

    const undo = useCallback(() => {
        const hist = historyRef.current;
        if (!hist.past.length) return;
        const previous = hist.past[hist.past.length - 1];
        historyRef.current = {
            past: hist.past.slice(0, -1),
            present: previous,
            future: [hist.present, ...hist.future],
        };
        onChange?.(previous);

        // 選択を維持する
        const nextId =
            selectedIdRef.current && previous.some((n) => n.id === selectedIdRef.current)
                ? selectedIdRef.current
                : previous[0]?.id ?? null;
        selectedIdRef.current = nextId;
        _setSelectedId(nextId);

        projectToFlow(previous, true);
    }, [onChange, projectToFlow]);

    const redo = useCallback(() => {
        const hist = historyRef.current;
        if (!hist.future.length) return;
        const next = hist.future[0];
        historyRef.current = {
            past: [...hist.past, hist.present],
            present: next,
            future: hist.future.slice(1),
        };
        onChange?.(next);

        const nextId =
            selectedIdRef.current && next.some((n) => n.id === selectedIdRef.current)
                ? selectedIdRef.current
                : next[0]?.id ?? null;
        selectedIdRef.current = nextId;
        _setSelectedId(nextId);

        projectToFlow(next, true);
    }, [onChange, projectToFlow]);

    // ---- 編集操作群（★ ラベルは常に「新しいノード」初期化） ----
    const addChild = useCallback(
        (parentId) => {
            const current = historyRef.current.present;
            const newNode = { id: ID(), label: "新しいノード", parentId, collapsed: false };
            commitModel([...current, newNode]);
            setSelectedId(newNode.id);
        },
        [commitModel]
    );

    const addSibling = useCallback(
        (id) => {
            const current = historyRef.current.present;
            const me = current.find((n) => n.id === id);
            if (!me || !me.parentId) {
                // ルート追加
                const newRoot = { id: ID(), label: "新しいノード", parentId: null, collapsed: false };
                commitModel([...current, newRoot]);
                setSelectedId(newRoot.id);
                return;
            }
            const newNode = { id: ID(), label: "新しいノード", parentId: me.parentId, collapsed: false };
            commitModel([...current, newNode]);
            setSelectedId(newNode.id);
        },
        [commitModel]
    );

    const deleteSubtree = useCallback(
        (id) => {
            if (!id) return;
            const current = historyRef.current.present;
            const { children } = buildIndex(current);
            const del = new Set();
            const dfs = (nid) => {
                del.add(nid);
                for (const c of children.get(nid) || []) dfs(c.id);
            };
            dfs(id);
            const next = current.filter((n) => !del.has(n.id));
            commitModel(next);
            setSelectedId(next[0]?.id ?? null);
        },
        [commitModel]
    );

    const toggleCollapse = useCallback(
        (id) => {
            const current = historyRef.current.present;
            const next = current.map((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n));
            commitModel(next);
            setSelectedId(id);
        },
        [commitModel]
    );

    const renameNode = useCallback(
        (id, label) => {
            const newLabel = (label ?? "").trim() || "新しいノード";
            const current = historyRef.current.present;
            const next = current.map((n) => (n.id === id ? { ...n, label: newLabel } : n));
            commitModel(next);
            setSelectedId(id);
        },
        [commitModel]
    );

    const relayoutAll = useCallback(() => {
        // 手動座標をクリアしてからレイアウト
        const current = historyRef.current.present;
        const cleared = current.map((n) => {
            const { x, y, ...rest } = n;
            return rest;
        });
        commitModel(cleared);
    }, [commitModel]);

    // ---- Flow イベント ----
    const onConnect = useCallback(
        (conn) => {
            const { source, target } = conn;
            if (!source || !target || source === target) return;
            const model = historyRef.current.present;
            const { children } = buildIndex(model);
            // 循環防止
            if (isAncestor(target, source, children)) return;
            const next = model.map((n) => (n.id === target ? { ...n, parentId: source } : n));
            commitModel(next);
            setSelectedId(target);
        },
        [commitModel]
    );

    const onSelectionChange = useCallback(({ nodes }) => {
        if (nodes?.length) {
            const newId = nodes[0].id;
            selectedIdRef.current = newId;
            _setSelectedId(newId);
        }
    }, []);

    const getNodeRect = (n) => {
        const nodeWidth = n && typeof n.width === "number" ? n.width : NODE_MIN_W;
        const nodeHeight = n && typeof n.height === "number" ? n.height : NODE_HEIGHT_FALLBACK;
        return { w: nodeWidth, h: nodeHeight };
    };

    const centerOnSelected = useCallback(() => {
        const n = nodes.find((x) => x.id === selectedIdRef.current);
        if (!n) return;
        const { w, h } = getNodeRect(n);
        const cx = n.position.x + w / 2;
        const cy = n.position.y + h / 2;
        rf.setCenter(cx, cy, { zoom: INITIAL_ZOOM_TO_NODE, duration: 400 });
    }, [nodes, rf]);

    // ---- ドラッグで自由配置（ドラッグ終了時に手動座標を保存） ----
    const onNodeDragStop = useCallback((_evt, node) => {
        const current = historyRef.current.present;
        const next = current.map((n) =>
            n.id === node.id ? { ...n, x: node.position.x, y: node.position.y } : n
        );
        commitModel(next);
        setSelectedId(node.id);
    }, [commitModel]);

    // ---- キーボード（Enter=兄弟 / Tab=子 / Delete=削除） ----
    const keyCaptureRef = useRef(null);
    useEffect(() => {
        const onKey = (e) => {
            // IME中は無効
            if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;

            // 編集中の input には干渉しない
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea") return;

            const currentSelected = selectedIdRef.current;
            if (!currentSelected) return;

            if (e.key === "Enter") {
                e.preventDefault();
                addSibling(currentSelected);
            } else if (e.key === "Tab") {
                e.preventDefault();
                addChild(currentSelected);
            } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                deleteSubtree(currentSelected);
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                redo();
            }
        };

        const el = keyCaptureRef.current;
        window.addEventListener("keydown", onKey);
        el?.focus?.();

        return () => window.removeEventListener("keydown", onKey);
    }, [addChild, addSibling, deleteSubtree, redo, undo]);

    // ---- 初期投影 ----
    useEffect(() => {
        projectToFlow(historyRef.current.present, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- フルスクリーン ----
    const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

    return (
        <div
            className={`${styles.mindMapContainer} ${fullscreen ? styles.fullscreen : ""}`}
        >
            <div className={styles.keyCapture} tabIndex={0} ref={keyCaptureRef}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onSelectionChange={onSelectionChange}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    /* ====== ビューポート操作（ここが重要） ====== */
                    panOnDrag
                    selectionOnDrag={false}
                    zoomOnScroll={false}
                    panOnScroll
                    panOnScrollMode="free"
                    panOnScrollSpeed={0.9}
                    zoomOnPinch
                    zoomOnDoubleClick
                    panActivationKeyCode="Space"
                    /* ======================================== */
                    nodesConnectable
                    elementsSelectable
                    deleteKeyCode={null}
                >
                    <MiniMap />
                    <Controls showInteractive={true} />
                    <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
            </div>

            <TopControls
                hasSelection={!!selectedIdRef.current}
                createChild={() => selectedIdRef.current && addChild(selectedIdRef.current)}
                createSibling={() => selectedIdRef.current ? addSibling(selectedIdRef.current) : addSibling(null)}
                deleteSubtree={() => selectedIdRef.current && deleteSubtree(selectedIdRef.current)}
                relayout={relayoutAll}
                undo={undo}
                redo={redo}
                canUndo={historyRef.current.past.length > 0}
                canRedo={historyRef.current.future.length > 0}
                centerToSelected={centerOnSelected}
                isFullscreen={fullscreen}
                toggleFullscreen={toggleFullscreen}
            />
        </div>
    );
}
