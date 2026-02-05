import React, { useState } from 'react';
import { Inbox as InboxIcon, ChevronRight, ChevronDown } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import InboxItem from './InboxItem';

interface InboxProps {
    onItemClick?: (id: string) => void;
}

export default function Inbox({ onItemClick }: InboxProps) {
    const { items } = useItemsStore();
    const inboxItems = items.filter(i => i.status === 'inbox');

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
                <button
                    className={styles.collapseBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsCollapsed(!isCollapsed);
                    }}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
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
