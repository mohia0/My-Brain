import React, { useState } from 'react';
import { Inbox as InboxIcon, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import InboxItem from './InboxItem';

interface InboxProps {
    onItemClick?: (id: string) => void;
}

export default function Inbox({ onItemClick }: InboxProps) {
    const { items, fetchData } = useItemsStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const inboxItems = items.filter(i => i.status === 'inbox')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const { setNodeRef, isOver } = useDroppable({
        id: 'inbox-area',
        data: { type: 'inbox-drop-zone' }
    });

    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                styles.inboxWrapper,
                isOver && styles.isOver,
                isCollapsed && styles.collapsed
            )}
        >
            <div className={styles.header} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className={styles.collapseBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCollapsed(!isCollapsed);
                        }}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    {!isCollapsed && (
                        <button
                            className={styles.refreshBtn}
                            onClick={async (e) => {
                                e.stopPropagation();
                                setIsRefreshing(true);
                                await fetchData();
                                setTimeout(() => setIsRefreshing(false), 600);
                            }}
                        >
                            <RefreshCw size={14} className={clsx(isRefreshing && styles.spinning)} />
                        </button>
                    )}
                </div>
                <div className={styles.headerTitle}>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <InboxIcon size={20} />
                        {isCollapsed && inboxItems.length > 0 && (
                            <div className={styles.collapsedCounter}>
                                {inboxItems.length}
                            </div>
                        )}
                    </div>
                    <span>Inbox ({inboxItems.length})</span>
                </div>
            </div>
            {!isCollapsed && (
                <div className={styles.content}>
                    {inboxItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            {isOver ? "Drop to Move to Inbox" : "No items"}
                        </div>
                    ) : (
                        inboxItems.map(item => (
                            <InboxItem
                                key={item.id}
                                item={item}
                                onClick={() => onItemClick?.(item.id)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
