"use client";

import { useEffect, useRef } from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';

export function useReminders() {
    const { items, updateItemContent } = useItemsStore();
    const notifiedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Request Notification permission if we don't have it
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkReminders = () => {
            const now = new Date().getTime();

            items.forEach(item => {
                if (item.type === 'reminder' && item.metadata?.reminder) {
                    const rData = item.metadata.reminder;
                    
                    if (rData.notified) return;

                    const dueTime = new Date(rData.date).getTime();
                    
                    // If due, and we haven't notified in this session yet
                    if (now >= dueTime && !notifiedIds.current.has(item.id)) {
                        notifiedIds.current.add(item.id);

                        // Fire browser notification as "super minimal" push
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Reminder Due', {
                                body: item.metadata.title || 'Your reminder is due now!',
                                icon: '/favicon.ico'
                            });
                        }

                        // Mark as notified in DB
                        updateItemContent(item.id, {
                            metadata: {
                                ...item.metadata,
                                reminder: {
                                    ...rData,
                                    notified: true
                                }
                            }
                        });
                    }
                }
            });
        };

        // Run immediately and then every minute
        checkReminders();
        const interval = setInterval(checkReminders, 60000);

        return () => clearInterval(interval);
    }, [items, updateItemContent]);
}
