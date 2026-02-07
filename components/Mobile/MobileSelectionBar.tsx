import React from 'react';
import { Trash2, Archive, Copy, X, FolderInput } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './MobileSelectionBar.module.css';
import { clsx } from 'clsx';
import MobileFolderPicker from './MobileFolderPicker';

export default function MobileSelectionBar() {
    const {
        selectedIds, clearSelection, removeItem,
        archiveSelected, duplicateSelected,
        updateItemContent, moveSelectedToFolder
    } = useItemsStore();

    const [isPickerOpen, setIsPickerOpen] = React.useState(false);

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

    const handleMoveClick = () => {
        setIsPickerOpen(true);
    };

    const handleSelectFolder = (folderId: string | null) => {
        moveSelectedToFolder(folderId);
        setIsPickerOpen(false);
    };

    React.useEffect(() => {
        const onSystemBack = (e: Event) => {
            if (isPickerOpen) {
                e.preventDefault();
                setIsPickerOpen(false);
            } else if (selectedIds.length > 0) {
                // If selection exists, let's clear it but only if there are no modals above us
                // Actually MobilePageContent already handles this, but we can do it here for extra safety
                // and to prevent event propagation.
                e.preventDefault();
                clearSelection();
            }
        };
        window.addEventListener('systemBack', onSystemBack);
        return () => window.removeEventListener('systemBack', onSystemBack);
    }, [isPickerOpen, selectedIds.length]);

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
                    <button className={styles.actionBtn} onClick={handleMoveClick} title="Move to Folder">
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

            {isPickerOpen && (
                <MobileFolderPicker
                    onClose={() => setIsPickerOpen(false)}
                    onSelect={handleSelectFolder}
                />
            )}
        </div>
    );
}
