"use client";

import React, { useEffect } from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileCard from './MobileCard';
import styles from './MobileHome.module.css'; // Reusing Home styles for consistency
import { Inbox as InboxIcon } from 'lucide-react';

interface MobileInboxProps {
    onItemClick: (id: string) => void;
}

export default function MobileInbox({ onItemClick }: MobileInboxProps) {
    const { items, fetchData } = useItemsStore();
    const inboxItems = items.filter(i => i.status === 'inbox')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className={styles.container}>
            {inboxItems.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><InboxIcon size={48} /></div>
                    <h3>Inbox is clear</h3>
                    <p>When you share links or captures to Brainia, they&apos;ll appear here for organization.</p>
                </div>
            ) : (
                <div className={styles.content}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <InboxIcon size={16} />
                            <span>Unsorted Captures</span>
                        </div>
                        <div className={styles.list}>
                            {inboxItems.map(item => (
                                <MobileCard
                                    key={item.id}
                                    item={item}
                                    onClick={() => onItemClick(item.id)}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
