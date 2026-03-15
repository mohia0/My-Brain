import React, { useState, useEffect } from 'react';
import { Inbox as InboxIcon, ChevronRight, ChevronLeft, Trash2, RotateCw } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import InboxItem from './InboxItem';
import { motion, AnimatePresence } from 'framer-motion';

interface InboxProps {
    onItemClick?: (id: string) => void;
}

export default function Inbox({ onItemClick }: InboxProps) {
    const { items, clearInbox, fetchData } = useItemsStore();
    const inboxItems = items.filter(i => i.status === 'inbox' && i.type !== 'project' && i.type !== 'room')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const [isClearing, setIsClearing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRefreshing) return;
        setIsRefreshing(true);
        
        // 1. Normal sync with DB
        await fetchData();
        
        // 2. Also try enriching captured links that missed their metadata
        const linksToEnrich = useItemsStore.getState().items.filter(i => 
            i.status === 'inbox' && 
            i.type === 'link' && 
            (!i.metadata?.title || i.metadata.title.includes('Capturing') || !i.metadata?.image)
        );
        for (const link of linksToEnrich) {
            useItemsStore.getState().enrichItem(link.id, true).catch(console.error);
        }

        setTimeout(() => setIsRefreshing(false), 1000); // give it a bit longer to show the spin
    };

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
                        data-tooltip={isCollapsed ? "Expand Captures" : "Collapse Captures"}
                        data-tooltip-pos="top"
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    {!isCollapsed && (
                        <button
                            className={styles.refreshBtn}
                            onClick={handleRefresh}
                            data-tooltip="Refresh"
                            data-tooltip-pos="top"
                        >
                            <RotateCw
                                size={14}
                                className={isRefreshing ? styles.spinning : ''}
                            />
                        </button>
                    )}
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
                            data-tooltip="Clear Captures"
                            data-tooltip-pos="top"
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
                    <span>Captures ({inboxItems.length})</span>
                </div>
            </div>
            {!isCollapsed && (
                <>
                    <div className={styles.content}>
                        <AnimatePresence mode="popLayout">
                            {inboxItems.length === 0 ? (
                                <motion.div
                                    key="empty-state"
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.3 }}
                                    className={styles.emptyStateContainer}
                                >
                                    <div className={styles.emptyState}>
                                        {isOver ? (
                                            <div className={styles.emptyDropZone}>
                                                <InboxIcon size={48} />
                                                <h3>Drop to move to Captures</h3>
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
                                    <div className={styles.footerNote}>
                                        Captures from the browser extension and mobile app appear here. Drag items to the canvas to organize them.
                                    </div>
                                </motion.div>
                            ) : (
                                inboxItems.map(item => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: -20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 25,
                                            mass: 0.8
                                        }}
                                        style={{ width: '100%', originY: 0 }}
                                    >
                                        <InboxItem
                                            item={item}
                                            onClick={() => onItemClick?.(item.id)}
                                        />
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </div>
    );
}
