const { getPairsNeedingReminder, markReminderSent } = require('../models/reminderStatusModel');
const { sendOneOnOneReminderEmail, isEmailConfigured } = require('./emailService');

const REMINDER_DAYS = parseInt(process.env.ONE_ON_ONE_REMINDER_AFTER_DAYS || '14', 10);
const ENABLE_REMINDERS = process.env.ENABLE_ONE_ON_ONE_REMINDERS === 'true';
const INTERVAL_MINUTES = Math.max(parseInt(process.env.ONE_ON_ONE_REMINDER_INTERVAL_MINUTES || '1440', 10), 1);

let reminderTimer = null;
let isRunning = false;

const runReminderJob = async () => {
    if (!ENABLE_REMINDERS) {
        return;
    }
    if (isRunning) {
        console.warn('[reminder] Job already running. Skipping this cycle.');
        return;
    }
    if (!isEmailConfigured) {
        console.warn('[reminder] Skipped because SMTP settings are not configured.');
        return;
    }

    isRunning = true;
    try {
        const rows = await getPairsNeedingReminder(REMINDER_DAYS);
        if (!rows.length) {
            return;
        }

        const groupedByUser = rows.reduce((map, row) => {
            if (!map.has(row.user_id)) {
                map.set(row.user_id, {
                    organizationId: row.organization_id,
                    userId: row.user_id,
                    to: row.user_email,
                    username: row.user_name,
                    items: []
                });
            }
            map.get(row.user_id).items.push({
                employeeId: row.employee_id,
                employeeName: row.employee_name,
                lastConversationAt: row.last_conversation_at,
                conversationId: row.conversation_id
            });
            return map;
        }, new Map());

        for (const { organizationId, userId, to, username, items } of groupedByUser.values()) {
            const sortedItems = [...items].sort((a, b) =>
                new Date(a.lastConversationAt) - new Date(b.lastConversationAt)
            );
            try {
                const result = await sendOneOnOneReminderEmail({
                    to,
                    username,
                    items: sortedItems,
                    reminderDays: REMINDER_DAYS
                });
                if (!result.delivered) {
                    console.warn(`[reminder] Failed to deliver reminder email to ${to}.`);
                    continue;
                }
                for (const item of items) {
                    await markReminderSent({
                        organizationId,
                        userId,
                        employeeId: item.employeeId,
                        conversationId: item.conversationId
                    });
                }
                console.log(`[reminder] Sent 1on1 reminder to ${to} for ${items.length} employee(s).`);
            } catch (err) {
                console.error(`[reminder] Error sending reminder email to ${to}:`, err);
            }
        }
    } catch (err) {
        console.error('[reminder] Error while running reminder job:', err);
    } finally {
        isRunning = false;
    }
};

const scheduleOneOnOneReminders = () => {
    if (!ENABLE_REMINDERS) {
        console.log('[reminder] 1on1 reminder job is disabled. Set ENABLE_ONE_ON_ONE_REMINDERS=true to activate.');
        return;
    }
    if (reminderTimer) {
        clearInterval(reminderTimer);
    }
    console.log(`[reminder] Scheduling 1on1 reminder job every ${INTERVAL_MINUTES} minute(s).`);
    const intervalMs = INTERVAL_MINUTES * 60 * 1000;
    runReminderJob().catch((err) => {
        console.error('[reminder] Failed to execute initial reminder job:', err);
    });
    reminderTimer = setInterval(() => {
        runReminderJob().catch((err) => {
            console.error('[reminder] Reminder job execution failed:', err);
        });
    }, intervalMs);
};

module.exports = {
    scheduleOneOnOneReminders,
    runReminderJob
};
