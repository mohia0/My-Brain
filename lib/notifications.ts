import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Item } from '@/types';

export const scheduleReminderNotification = async (item: Item) => {
    if (!Capacitor.isNativePlatform()) return;
    if (item.type !== 'reminder' || !item.metadata?.reminder?.date) return;

    try {
        const reminderDate = new Date(item.metadata.reminder.date);
        const now = new Date();

        // Don't schedule if date is in the past
        if (reminderDate <= now) {
            console.log('[Notifications] Reminder date is in the past, skipping:', item.id);
            return;
        }

        // Request permissions first
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
            const request = await LocalNotifications.requestPermissions();
            if (request.display !== 'granted') {
                console.warn('[Notifications] Permission not granted for local notifications');
                return;
            }
        }

        // Cancel any existing notification for this item (to handle updates)
        await LocalNotifications.cancel({
            notifications: [{ id: hashStringToInt(item.id) }]
        });

        const emoji = item.metadata.emoji || '🔔';
        const title = item.metadata.reminder.name || 'Brainia Reminder';
        
        console.log(`[Notifications] Scheduling reminder for ${reminderDate.toLocaleString()}: ${title}`);

        await LocalNotifications.schedule({
            notifications: [
                {
                    title: `${emoji} ${title}`,
                    body: "It's time for your scheduled reminder!",
                    id: hashStringToInt(item.id),
                    schedule: { at: reminderDate },
                    sound: 'default',
                    attachments: [],
                    actionTypeId: '',
                    extra: {
                        itemId: item.id
                    }
                }
            ]
        });
    } catch (error) {
        console.error('[Notifications] Failed to schedule notification:', error);
    }
};

export const cancelReminderNotification = async (itemId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await LocalNotifications.cancel({
            notifications: [{ id: hashStringToInt(itemId) }]
        });
    } catch (error) {
        console.error('[Notifications] Failed to cancel notification:', error);
    }
};

// Helper to convert UUID string to a 32-bit integer for Capacitor notification IDs
function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
