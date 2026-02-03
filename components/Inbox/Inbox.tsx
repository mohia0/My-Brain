"use client";

import React from 'react';
import styles from './Inbox.module.css';
import { Inbox as InboxIcon } from 'lucide-react';

export default function Inbox() {
    return (
        <div className={styles.inboxWrapper}>
            <div className={styles.header}>
                <InboxIcon size={20} />
                <span>Inbox</span>
            </div>
            <div className={styles.content}>
                <div className={styles.emptyState}>
                    No items in inbox
                </div>
            </div>
        </div>
    );
}
