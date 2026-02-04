"use client";

import React from 'react';
import styles from './FolderModal.module.css';
import { X, FolderOpen, LogOut } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import ItemCard from '@/components/Grid/ItemCard'; // Reuse ItemCard for consistency? 
// Actually ItemCard is Draggable, we might just want a static view or re-use logic.
// If we re-use ItemCard, they might try to drag inside the modal which is tricky.
// Let's make a simple static view for now, or allow "Unfolder" action.

export default function FolderModal({ folderId, onClose, onItemClick }: { folderId: string, onClose: () => void, onItemClick: (id: string) => void }) {
    const { items, folders, updateItemContent, removeFolder, updateFolderPosition } = useItemsStore();
    const folder = folders.find(f => f.id === folderId);
    const folderItems = items.filter(i => i.folder_id === folderId);

    if (!folder) return null;

    const handleRemoveFromFolder = (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Move back to canvas near the folder
        updateItemContent(itemId, {
            folder_id: undefined,
            position_x: folder.position_x + 50,
            position_y: folder.position_y + 50
        });
    };

    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDeleteClick = () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }

        // Confirmed Delete
        folderItems.forEach(item => {
            updateItemContent(item.id, {
                folder_id: undefined,
                position_x: folder.position_x + 50,
                position_y: folder.position_y + 50
            });
        });
        removeFolder(folderId);
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <div className={styles.titleInfo}>
                        <FolderOpen size={24} color="#6e56cf" />
                        <span className={styles.folderName}>{folder.name}</span>
                        <span className={styles.itemCount}>{folderItems.length} items</span>
                    </div>
                    <div className={styles.actions}>
                        <button
                            onClick={handleDeleteClick}
                            className={`${styles.deleteBtn} ${isDeleting ? styles.confirmDelete : ''}`}
                            title="Delete Folder"
                            onMouseLeave={() => setIsDeleting(false)}
                        >
                            {isDeleting ? "Sure?" : <LogOut size={16} />}
                        </button>
                        <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                    </div>
                </header>

                <div className={styles.content}>
                    {folderItems.length === 0 ? (
                        <div className={styles.emptyState}>Folder is empty</div>
                    ) : (
                        <div className={styles.grid}>
                            {folderItems.map(item => (
                                <div
                                    key={item.id}
                                    className={styles.itemWrapper}
                                    onClick={() => {
                                        onClose();
                                        onItemClick(item.id);
                                    }}
                                >
                                    {/* Preview Image/Icon */}
                                    <div className={styles.itemPreview}>
                                        {item.type === 'image' || item.metadata?.image ? (
                                            <img src={item.type === 'image' ? item.content : item.metadata?.image} className={styles.previewImg} />
                                        ) : (
                                            <div className={styles.genericIcon}>
                                                {item.type === 'link' ? '🔗' : '📝'}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemTitle}>{item.metadata?.title || 'Untitled'}</span>
                                        <span className={styles.itemMeta}>
                                            {item.type === 'link' ? new URL(item.content).hostname :
                                                item.type === 'text' ? 'Note' : 'Image'}
                                        </span>
                                    </div>

                                    <button
                                        className={styles.removeBtn}
                                        onClick={(e) => handleRemoveFromFolder(item.id, e)}
                                        title="Move to Canvas"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
