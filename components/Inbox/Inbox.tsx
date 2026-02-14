import React, { useState, useEffect } from 'react';
import { Inbox as InboxIcon, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import InboxItem from './InboxItem';

interface InboxProps {
    onItemClick?: (id: string) => void;
}

export default function Inbox({ onItemClick }: InboxProps) {
    const { items, clearInbox } = useItemsStore();
    const inboxItems = items.filter(i => i.status === 'inbox')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const [isClearing, setIsClearing] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: 'inbox-area',
        data: { type: 'inbox-drop-zone' }
    });

    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('inbox-collapsed') === 'true';
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('inbox-collapsed', isCollapsed.toString());
    }, [isCollapsed]);

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
                    {!isCollapsed && inboxItems.length > 0 && (
                        <button
                            className={clsx(styles.clearBtn, isClearing && styles.confirmClear)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isClearing) {
                                    clearInbox();
                                    setIsClearing(false);
                                } else {
                                    setIsClearing(true);
                                }
                            }}
                            onMouseLeave={() => setIsClearing(false)}
                            title="Clear Inbox"
                        >
                            {isClearing ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={16} />}
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
                            {isOver ? (
                                <div className={styles.emptyDropZone}>
                                    <InboxIcon size={48} />
                                    <h3>Drop to move to Inbox</h3>
                                    <p>Release items here to process them later.</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.emptyIcon}><InboxIcon size={48} /></div>
                                    <h3>Mind cleared.</h3>
                                    <p>Space for your next big idea.</p>
                                </>
                            )}
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
