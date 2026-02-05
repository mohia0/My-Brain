"use client";

import React, { useEffect } from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileInboxItem from './MobileInboxItem';
import styles from './MobileInbox.module.css';

export default function MobileInbox() {
    const { items, fetchItems } = useItemsStore();
    const inboxItems = items.filter(i => i.status === 'inbox');

    useEffect(() => {
        fetchItems();
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Inbox</h1>
            </div>

            <div className={styles.list}>
                {inboxItems.length === 0 ? (
                    <div className={styles.empty}>
                        Inbox is empty
                    </div>
                ) : (
                    inboxItems.map(item => (
                        <MobileInboxItem
                            key={item.id}
                            item={item}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
