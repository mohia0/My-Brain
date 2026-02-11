import React, { useState } from 'react';
import styles from './ArchiveView.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { Archive, X, RotateCcw, Trash2, Search, FileText, Link, Image as ImageIcon, Folder } from 'lucide-react';
import clsx from 'clsx';

interface ArchiveCardProps {
    id: string;
    type: string;
    title: string;
    description?: string;
    image?: string;
    color?: string;
    date: string;
    onUnarchive: () => void;
    onDelete: () => void;
}

function ArchiveCard({ id, type, title, description, image, color, date, onUnarchive, onDelete }: ArchiveCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const getIcon = () => {
        switch (type.toLowerCase()) {
            case 'folder': return <Folder size={40} className={styles.previewPlaceholder} />;
            case 'image': return <ImageIcon size={40} className={styles.previewPlaceholder} />;
            case 'link': return <Link size={40} className={styles.previewPlaceholder} />;
            default: return <FileText size={40} className={styles.previewPlaceholder} />;
        }
    };

    return (
        <div className={styles.archiveCard}>
            {color && <div className={styles.folderBadge} style={{ backgroundColor: color }}>Folder</div>}

            <div className={styles.cardPreview}>
                {image ? (
                    <img src={image} alt={title} className={styles.previewImg} />
                ) : (
                    getIcon()
                )}
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardInfo}>
                    <div className={styles.cardType}>{type}</div>
                    <div className={styles.cardTitle}>{title}</div>
                    {description && <div className={styles.cardDesc}>{description}</div>}
                </div>

                <div className={styles.cardFooter}>
                    <div className={styles.cardDate}>Archived {new Date(date).toLocaleDateString()}</div>
                    <div className={styles.cardActions}>
                        <button
                            className={clsx(styles.actionBtn, styles.restoreBtn)}
                            data-tooltip="Restore to Workspace"
                            data-tooltip-pos="left"
                            onClick={onUnarchive}
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            className={clsx(styles.actionBtn, styles.deleteBtn, isDeleting && styles.confirmDelete)}
                            data-tooltip={isDeleting ? "Confirm Permanent Delete" : "Delete Permanently"}
                            data-tooltip-pos="left"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isDeleting) onDelete();
                                else setIsDeleting(true);
                            }}
                            onMouseLeave={() => setIsDeleting(false)}
                        >
                            {isDeleting ? "Sure?" : <Trash2 size={16} />}
                        </button>
                    </div>
                </div>
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
                                    date={folder.created_at}
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
                                    description={item.metadata?.description || (item.type === 'text' ? item.content.substring(0, 100) : undefined)}
                                    image={item.type === 'image' ? item.content : item.metadata?.image}
                                    date={item.created_at}
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
