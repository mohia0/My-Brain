"use client";

import React from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileCard from './MobileCard';
import styles from './MobileHome.module.css';
import { Folder, Inbox, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { Reorder } from 'framer-motion';

interface MobileHomeProps {
    onItemClick: (id: string) => void;
    onFolderClick: (id: string) => void;
}

export default function MobileHome({ onItemClick, onFolderClick }: MobileHomeProps) {
    const { items, folders, selectedIds } = useItemsStore();
    const [isFoldersCollapsed, setIsFoldersCollapsed] = React.useState(false);

    const visibleItems = items.filter(i => i.status !== 'inbox' && i.status !== 'archived' && !i.folder_id && (i as any).type !== 'room' && (i as any).type !== 'project')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const visibleFolders = React.useMemo(() => {
        return folders.filter(f => f.status !== 'archived' && !f.parent_id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [folders]);

    const [orderedFolders, setOrderedFolders] = React.useState(visibleFolders);

    React.useEffect(() => {
        const savedString = localStorage.getItem('mobile_folder_order');
        if (savedString) {
            try {
                const savedOrder = JSON.parse(savedString) as string[];
                const newOrdered = [...visibleFolders].sort((a, b) => {
                    const aIndex = savedOrder.indexOf(a.id);
                    const bIndex = savedOrder.indexOf(b.id);
                    if (aIndex === -1 && bIndex === -1) return 0;
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                });
                setOrderedFolders(newOrdered);
            } catch (e) {
                setOrderedFolders(visibleFolders);
            }
        } else {
            setOrderedFolders(visibleFolders);
        }
    }, [visibleFolders]);

    const handleReorder = (newOrder: typeof visibleFolders) => {
        setOrderedFolders(newOrder);
        localStorage.setItem('mobile_folder_order', JSON.stringify(newOrder.map(f => f.id)));
    };

    const hasContent = visibleItems.length > 0 || orderedFolders.length > 0;

    return (
        <div className={styles.container}>
            {!hasContent ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><Inbox size={48} /></div>
                    <h3>Start your digital library</h3>
                    <p>Your library is empty. Tap the + button to capture links, ideas, or images.</p>
                </div>
            ) : (
                <div className={styles.content}>
                    {visibleFolders.length > 0 && (
                        <section className={styles.section}>
                            <div
                                className={styles.sectionHeader}
                                onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
                                style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: '4px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Folder size={16} />
                                    <span>Folders</span>
                                </div>
                                <div style={{ color: 'var(--text-muted)' }}>
                                    {isFoldersCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                </div>
                            </div>
                            {!isFoldersCollapsed && (
                                <Reorder.Group
                                    layoutScroll
                                    className={styles.folderGrid}
                                    values={orderedFolders}
                                    onReorder={handleReorder}
                                    as="div"
                                    style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', width: '100%' }}
                                >
                                    {orderedFolders.map(folder => {
                                        const itemCount = items.filter(i => i.folder_id === folder.id && i.status !== 'archived').length;
                                        return (
                                            <Reorder.Item
                                                key={folder.id}
                                                value={folder}
                                                as="div"
                                                dragListener={selectedIds.includes(folder.id)}
                                            >
                                                <MobileCard
                                                    item={{ ...folder, type: 'folder', itemCount } as any}
                                                    onClick={() => onFolderClick(folder.id)}
                                                />
                                            </Reorder.Item>
                                        );
                                    })}
                                </Reorder.Group>
                            )}
                        </section>
                    )}

                    {visibleItems.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <LayoutGrid size={16} />
                                <span>Canvas Ideas</span>
                            </div>
                            <div className={styles.list}>
                                {visibleItems.map(item => (
                                    <MobileCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => onItemClick(item.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
