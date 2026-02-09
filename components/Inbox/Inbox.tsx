import React, { useState, useEffect } from 'react';
import { Inbox as InboxIcon, ChevronRight, ChevronLeft, RefreshCw, Trash2 } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import InboxItem from './InboxItem';

interface InboxProps {
    onItemClick?: (id: string) => void;
}

export default function Inbox({ onItemClick }: InboxProps) {
    const { items, fetchData, clearInbox } = useItemsStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const inboxItems = items.filter(i => i.status === 'inbox')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const { setNodeRef, isOver } = useDroppable({
        id: 'inbox-area',
        data: { type: 'inbox-drop-zone' }
    });

    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-hide confirm after delay
    useEffect(() => {
        if (showConfirmClear) {
            const timer = setTimeout(() => setShowConfirmClear(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showConfirmClear]);

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
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className={styles.refreshBtn}
                                title="Refresh Inbox"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setIsRefreshing(true);
                                    await fetchData();
                                    setTimeout(() => setIsRefreshing(false), 600);
                                }}
                            >
                                <RefreshCw size={14} className={clsx(isRefreshing && styles.spinning)} />
                            </button>
                            {inboxItems.length > 0 && (
                                <button
                                    className={clsx(styles.clearBtn, showConfirmClear && styles.confirmClear)}
                                    title="Clear All Inbox"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (showConfirmClear) {
                                            await clearInbox();
                                            setShowConfirmClear(false);
                                        } else {
                                            setShowConfirmClear(true);
                                        }
                                    }}
                                >
                                    {showConfirmClear ? (
                                        <span className={styles.sureText}>Sure?</span>
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                </button>
                            )}
                        </div>
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
                                    <h3>Your mind is clear</h3>
                                    <p>Ready for your next epiphany? Share links or ideas and they'll wait here for you.</p>
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
