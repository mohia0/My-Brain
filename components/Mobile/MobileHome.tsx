"use client";

import React from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileCard from './MobileCard';
import styles from './MobileHome.module.css';
import { Folder, Inbox, LayoutGrid } from 'lucide-react';

interface MobileHomeProps {
    onItemClick: (id: string) => void;
    onFolderClick: (id: string) => void;
}

export default function MobileHome({ onItemClick, onFolderClick }: MobileHomeProps) {
    const { items, folders } = useItemsStore();

    const visibleItems = items.filter(i => i.status !== 'inbox' && i.status !== 'archived' && !i.folder_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const visibleFolders = folders.filter(f => f.status !== 'archived' && !f.parent_id);

    const hasContent = visibleItems.length > 0 || visibleFolders.length > 0;

    return (
        <div className={styles.container}>
            {!hasContent ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><Inbox size={48} /></div>
                    <h3>Start your digital brain</h3>
                    <p>Your library is empty. Tap the + button to capture links, notes, or images.</p>
                </div>
            ) : (
                <div className={styles.content}>
                    {visibleFolders.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Folder size={16} />
                                <span>Folders</span>
                            </div>
                            <div className={styles.list}>
                                {visibleFolders.map(folder => (
                                    <MobileCard
                                        key={folder.id}
                                        item={{ ...folder, type: 'folder' } as any}
                                        onClick={() => onFolderClick(folder.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleItems.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <LayoutGrid size={16} />
                                <span>Canvas Items</span>
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
