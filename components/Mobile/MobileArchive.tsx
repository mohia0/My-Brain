"use client";

import React from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileCard from './MobileCard';
import styles from './MobileHome.module.css';
import { Folder, Archive, LayoutGrid, ArrowLeft } from 'lucide-react';

interface MobileArchiveProps {
    onItemClick: (id: string) => void;
    onFolderClick: (id: string) => void;
    onBack?: () => void;
}

export default function MobileArchive({ onItemClick, onFolderClick, onBack }: MobileArchiveProps) {
    const { items, folders } = useItemsStore();

    const archivedItems = items.filter(i => i.status === 'archived' && (i as any).type !== 'project')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const archivedFolders = folders.filter(f => f.status === 'archived')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const hasContent = archivedItems.length > 0 || archivedFolders.length > 0;

    return (
        <div className={styles.container}>
            <div style={{
                padding: '8px 4px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Archive</h2>
            </div>

            {!hasContent ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><Archive size={48} /></div>
                    <h3>Archive is empty</h3>
                    <p>Items you archive will appear here. They are hidden from your main canvas.</p>
                </div>
            ) : (
                <div className={styles.content}>
                    {archivedFolders.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Folder size={16} />
                                <span>Archived Folders</span>
                            </div>
                            <div className={styles.folderGrid}>
                                {archivedFolders.map(folder => {
                                    const itemCount = items.filter(i => i.folder_id === folder.id).length;
                                    return (
                                        <MobileCard
                                            key={folder.id}
                                            item={{ ...folder, type: 'folder', itemCount } as any}
                                            onClick={() => onFolderClick(folder.id)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {archivedItems.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <LayoutGrid size={16} />
                                <span>Archived Ideas</span>
                            </div>
                            <div className={styles.list}>
                                {archivedItems.map(item => (
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
