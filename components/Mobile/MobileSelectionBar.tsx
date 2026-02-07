import React from 'react';
import { Trash2, Archive, Copy, X, FolderInput } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './MobileSelectionBar.module.css';
import { clsx } from 'clsx';

export default function MobileSelectionBar() {
    const {
        selectedIds, clearSelection, removeItem,
        archiveSelected, duplicateSelected,
        updateItemContent
    } = useItemsStore();

    if (selectedIds.length === 0) return null;

    const handleDelete = () => {
        selectedIds.forEach(id => {
            removeItem(id);
            const folder = useItemsStore.getState().folders.find(f => f.id === id);
            if (folder) useItemsStore.getState().removeFolder(id);
        });
        clearSelection();
    };

    const handleArchive = () => {
        archiveSelected();
    };

    const handleDuplicate = () => {
        duplicateSelected();
    };

    const handleMoveToBrainia = () => {
        selectedIds.forEach(id => {
            updateItemContent(id, { status: 'active' });
            const folder = useItemsStore.getState().folders.find(f => f.id === id);
            if (folder) useItemsStore.getState().updateFolderContent(id, { status: 'active' });
        });
        clearSelection();
    };

    return (
        <div className={styles.barWrapper}>
            <div className={styles.selectionBar}>
                <div className={styles.countInfo}>
                    <button className={styles.closeBtn} onClick={clearSelection}>
                        <X size={20} />
                    </button>
                    <span>{selectedIds.length} Selected</span>
                </div>

                <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={handleMoveToBrainia} title="Move to Brainia">
                        <FolderInput size={20} />
                    </button>
                    <button className={styles.actionBtn} onClick={handleDuplicate} title="Duplicate">
                        <Copy size={20} />
                    </button>
                    <button className={styles.actionBtn} onClick={handleArchive} title="Archive">
                        <Archive size={20} />
                    </button>
                    <button className={clsx(styles.actionBtn, styles.deleteBtn)} onClick={handleDelete} title="Delete">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
