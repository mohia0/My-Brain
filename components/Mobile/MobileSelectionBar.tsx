import React from 'react';
import { Trash2, Archive, Copy, X, FolderInput, CircleArrowOutUpRight, Inbox } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './MobileSelectionBar.module.css';
import { clsx } from 'clsx';
import MobileFolderPicker from './MobileFolderPicker';

export default function MobileSelectionBar() {
    const {
        selectedIds, clearSelection, removeItem,
        archiveSelected, duplicateSelected,
        updateItemContent, moveSelectedToFolder, items
    } = useItemsStore();

    const [isPickerOpen, setIsPickerOpen] = React.useState(false);



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

    if (selectedIds.length === 0) return null;

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
                    {/* Move to Canvas / Move to Inbox Logic */}
                    {(() => {
                        const selectedItems = items.filter(i => selectedIds.includes(i.id));
                        if (selectedItems.length > 0) {
                            const isInbox = selectedItems[0].status === 'inbox';
                            return isInbox ? (
                                <button
                                    className={styles.actionBtn}
                                    onClick={() => {
                                        selectedIds.forEach(id => updateItemContent(id, { status: 'active', folder_id: null }));
                                        clearSelection();
                                    }}
                                    data-tooltip="Move to Canvas"
                                    data-tooltip-pos="top"
                                >
                                    <CircleArrowOutUpRight size={20} />
                                </button>
                            ) : (
                                <button
                                    className={styles.actionBtn}
                                    onClick={() => {
                                        selectedIds.forEach(id => updateItemContent(id, { status: 'inbox', folder_id: null }));
                                        clearSelection();
                                    }}
                                    data-tooltip="Move to Inbox"
                                    data-tooltip-pos="top"
                                >
                                    <Inbox size={20} />
                                </button>
                            );
                        }
                        return null;
                    })()}

                    <button className={styles.actionBtn} onClick={handleMoveClick} data-tooltip="Move to Folder" data-tooltip-pos="top">
                        <FolderInput size={20} />
                    </button>
                    <button className={styles.actionBtn} onClick={handleDuplicate} data-tooltip="Duplicate" data-tooltip-pos="top">
                        <Copy size={20} />
                    </button>
                    <button className={styles.actionBtn} onClick={handleArchive} data-tooltip="Archive" data-tooltip-pos="top">
                        <Archive size={20} />
                    </button>
                    <button className={clsx(styles.actionBtn, styles.deleteBtn)} onClick={handleDelete} data-tooltip="Delete" data-tooltip-pos="top">
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
