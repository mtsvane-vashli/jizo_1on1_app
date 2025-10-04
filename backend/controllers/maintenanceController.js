const maintenanceModel = require('../models/maintenanceModel');

exports.getMaintenanceMessage = async (_req, res) => {
    try {
        const message = await maintenanceModel.getMaintenanceMessage();
        if (!message) {
            return res.json({ content: '', updatedAt: null });
        }
        return res.json({
            content: message.content || '',
            updatedAt: message.updated_at || null,
        });
    } catch (error) {
        console.error('Failed to fetch maintenance message:', error);
        return res.status(500).json({ error: 'Failed to load maintenance information.' });
    }
};

exports.updateMaintenanceMessage = async (req, res) => {
    const { content = '' } = req.body || {};
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to update maintenance information.' });
    }

    if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content must be a string.' });
    }

    try {
        const sanitizedContent = content.trim();
        const message = await maintenanceModel.upsertMaintenanceMessage(sanitizedContent, user.id);
        return res.json({
            content: message.content || '',
            updatedAt: message.updated_at || null,
        });
    } catch (error) {
        console.error('Failed to update maintenance message:', error);
        return res.status(500).json({ error: 'Failed to save maintenance information.' });
    }
};
