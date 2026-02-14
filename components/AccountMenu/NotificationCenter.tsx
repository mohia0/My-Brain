"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Inbox as InboxIcon, Bell, X, Trash2, RefreshCw } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './NotificationCenter.module.css';
import clsx from 'clsx';
import InboxItem from '../Inbox/InboxItem';

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const { items, fetchData, clearInbox } = useItemsStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const inboxItems = items.filter(i => i.status === 'inbox')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={clsx(styles.trigger, isOpen && styles.active)}
                onClick={toggleOpen}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {inboxItems.length > 0 && (
                    <span className={styles.badge}>{inboxItems.length}</span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <InboxIcon size={16} />
                            <span>Inbox</span>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                className={styles.actionBtn}
                                onClick={async () => {
                                    setIsRefreshing(true);
                                    await fetchData();
                                    setTimeout(() => setIsRefreshing(false), 600);
                                }}
                            >
                                <RefreshCw size={14} className={clsx(isRefreshing && styles.spinning)} />
                            </button>
                            {inboxItems.length > 0 && (
                                <button className={styles.actionBtn} onClick={() => clearInbox()}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <button className={styles.actionBtn} onClick={() => setIsOpen(false)}>
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.content}>
                        {inboxItems.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}><InboxIcon size={32} /></div>
                                <p>No new items</p>
                            </div>
                        ) : (
                            <div className={styles.itemList}>
                                {inboxItems.map(item => (
                                    <InboxItem
                                        key={item.id}
                                        item={item}
                                        onClick={() => setIsOpen(false)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
