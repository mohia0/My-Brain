import React, { useState } from 'react';
import styles from './ArchiveView.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { Archive, X, RotateCcw, Trash2, Search } from 'lucide-react';
import clsx from 'clsx';

interface ArchiveCardProps {
    id: string;
    type: string;
    title: string;
    color?: string;
    onUnarchive: () => void;
    onDelete: () => void;
}

function ArchiveCard({ id, type, title, color, onUnarchive, onDelete }: ArchiveCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    return (
        <div
            className={styles.archiveCard}
            style={color ? { borderLeft: `4px solid ${color}` } : undefined}
        >
            <div className={styles.cardInfo}>
                <div className={styles.cardType}>{type}</div>
                <div className={styles.cardTitle}>{title}</div>
            </div>
            <div className={styles.cardActions}>
                <button
                    className={styles.actionBtn}
                    title="Unarchive"
                    onClick={onUnarchive}
                >
                    <RotateCcw size={18} />
                </button>
                <button
                    className={clsx(styles.actionBtn, styles.deleteBtn, isDeleting && styles.confirmDelete)}
                    title="Delete Permanently"
                    onClick={() => {
                        if (isDeleting) onDelete();
                        else setIsDeleting(true);
                    }}
                    onMouseLeave={() => setIsDeleting(false)}
                >
                    {isDeleting ? "Sure?" : <Trash2 size={18} />}
                </button>
            </div>
        </div>
    );
}

export default function ArchiveView() {
    const {
        items,
        folders,
        unarchiveItem,
        unarchiveFolder,
        removeItem,
        removeFolder,
        isArchiveOpen,
        setArchiveOpen
    } = useItemsStore();

    const [searchQuery, setSearchQuery] = useState('');

    const archivedItems = items.filter(i => i.status === 'archived');
    const archivedFolders = folders.filter(f => f.status === 'archived');

    const filteredItems = archivedItems.filter(i =>
        (i.metadata?.title || i.content).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredFolders = archivedFolders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isArchiveOpen) return null;

    return (
        <div className={styles.overlay} onClick={() => setArchiveOpen(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleRow}>
                        <Archive size={24} className={styles.titleIcon} />
                        <h2>Archive Repository</h2>
                        <span className={styles.badge}>{archivedItems.length + archivedFolders.length}</span>
                    </div>
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            className={styles.searchInput}
                            placeholder="Search archived contents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className={styles.closeBtn} onClick={() => setArchiveOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {(filteredItems.length === 0 && filteredFolders.length === 0) ? (
                        <div className={styles.emptyState}>
                            <Archive size={64} opacity={0.2} />
                            <p>No archived contents found</p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredFolders.map(folder => (
                                <ArchiveCard
                                    key={folder.id}
                                    id={folder.id}
                                    type="Folder"
                                    title={folder.name}
                                    color={folder.color}
                                    onUnarchive={() => unarchiveFolder(folder.id)}
                                    onDelete={() => removeFolder(folder.id)}
                                />
                            ))}

                            {filteredItems.map(item => (
                                <ArchiveCard
                                    key={item.id}
                                    id={item.id}
                                    type={item.type.toUpperCase()}
                                    title={item.metadata?.title || (item.type === 'text' ? item.content.substring(0, 50) : item.type)}
                                    onUnarchive={() => unarchiveItem(item.id)}
                                    onDelete={() => removeItem(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
