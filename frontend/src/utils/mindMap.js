// Utility helpers for normalizing legacy mind map payloads.

const DEFAULT_LABEL = '新しいノード';

const isFiniteNumber = (value) => Number.isFinite(value);

const normalizeFromArray = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((node) => {
            if (!node || typeof node !== 'object') return null;
            const id = node.id !== undefined && node.id !== null ? String(node.id) : null;
            if (!id) return null;
            const labelSource = typeof node.label === 'string' ? node.label.trim() : '';
            const parentIdRaw = node.parentId !== undefined ? node.parentId : null;
            const normalized = {
                id,
                label: labelSource || DEFAULT_LABEL,
                parentId: parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === '' ? null : String(parentIdRaw),
                collapsed: Boolean(node.collapsed),
            };
            if (isFiniteNumber(node.x)) normalized.x = node.x;
            if (isFiniteNumber(node.y)) normalized.y = node.y;
            return normalized;
        })
        .filter(Boolean);
};

const normalizeFromReactFlowPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return [];
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    const edges = Array.isArray(payload.edges) ? payload.edges : [];

    const parentMap = new Map();
    for (const edge of edges) {
        const source = edge && edge.source !== undefined && edge.source !== null ? String(edge.source) : null;
        const target = edge && edge.target !== undefined && edge.target !== null ? String(edge.target) : null;
        if (!source || !target) continue;
        parentMap.set(target, source);
    }

    return nodes
        .map((node) => {
            if (!node || typeof node !== 'object') return null;
            const id = node.id !== undefined && node.id !== null ? String(node.id) : null;
            if (!id) return null;
            const labelSource = typeof node.data?.label === 'string' ? node.data.label.trim() : '';
            const normalized = {
                id,
                label: labelSource || DEFAULT_LABEL,
                parentId: parentMap.get(id) ?? null,
                collapsed: Boolean(node.data?.collapsed),
            };
            const x = node.position?.x;
            const y = node.position?.y;
            if (isFiniteNumber(x)) normalized.x = x;
            if (isFiniteNumber(y)) normalized.y = y;
            return normalized;
        })
        .filter(Boolean);
};

export const normalizeMindMapModel = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return normalizeFromArray(raw);
    return normalizeFromReactFlowPayload(raw);
};
