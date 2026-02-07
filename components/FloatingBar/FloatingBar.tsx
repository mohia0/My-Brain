"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './FloatingBar.module.css';
import { Trash2, FolderPlus, Sparkles, X, ChevronUp, Folder, Archive, CircleArrowOutUpRight, Inbox } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { generateId } from '@/lib/utils';
import InputModal from '@/components/InputModal/InputModal';
import clsx from 'clsx';

export default function FloatingBar() {
    const {
        selectedIds,
        clearSelection,
        removeItem,
        removeFolder,
        addFolder,
        items,
        folders, /**/
        updateItemContent,/* */
        layoutSelectedItems,/* */
        archiveSelected
    } = useItemsStore();

    const [isDeleting, setIsDeleting] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMoveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (selectedIds.length === 0) return null;

    const handleDelete = () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        selectedIds.forEach(id => {
            removeItem(id);
            removeFolder(id);
        });
        clearSelection();
        setIsDeleting(false);
    };

    const handleMoveToFolder = (folderId: string) => {
        selectedIds.forEach(id => {
            const isItem = items.some(i => i.id === id);
            if (isItem) {
                updateItemContent(id, { folder_id: folderId });
            } else {
                useItemsStore.getState().updateFolderContent?.(id, { parent_id: folderId });
            }
        });
        clearSelection();
        setIsMoveMenuOpen(false);
    };

    const handleGroupSubmit = (name: string) => {
        const selectedItems = items.filter(i => selectedIds.includes(i.id));
        const selectedFolders = folders.filter(f => selectedIds.includes(f.id));

        if (selectedItems.length === 0 && selectedFolders.length === 0) return;

        // Calculate center for new folder
        let avgX = 0;
        let avgY = 0;
        const total = selectedItems.length + selectedFolders.length;

        selectedItems.forEach(i => { avgX += i.position_x; avgY += i.position_y; });
        selectedFolders.forEach(f => { avgX += f.position_x; avgY += f.position_y; });
        avgX /= total;
        avgY /= total;

        const folderId = generateId();
        addFolder({
            id: folderId,
            user_id: 'unknown',
            name,
            position_x: avgX - 100, // Offset to center the folder icon
            position_y: avgY - 50,
            created_at: new Date().toISOString()
        });

        // Batch update selected items and folders
        setTimeout(() => {
            selectedIds.forEach(id => {
                const isItem = items.some(i => i.id === id);
                if (isItem) {
                    updateItemContent(id, { folder_id: folderId });
                } else {
                    // It's a folder (nesting support)
                    useItemsStore.getState().updateFolderContent?.(id, { parent_id: folderId });
                }
            });
            clearSelection();
        }, 100);

        setIsGroupModalOpen(false);
    };

    return (
        <div className={styles.bar}>
            <div className={styles.count}>{selectedIds.length} selected</div>
            <div className={styles.divider} />

            <div className={styles.relativeWrapper} ref={menuRef}>
                <button
                    className={clsx(styles.actionBtn, isMoveMenuOpen && styles.activeBtn)}
                    onClick={() => setIsMoveMenuOpen(!isMoveMenuOpen)}
                    title="Move to Folder"
                >
                    <FolderPlus size={18} />
                    <ChevronUp size={12} className={clsx(styles.chevron, isMoveMenuOpen && styles.chevronOpen)} />
                </button>

                {isMoveMenuOpen && (
                    <div className={styles.moveMenu}>
                        <div className={styles.menuHeader}>Move to...</div>
                        <button
                            className={styles.menuOption}
                            onClick={() => { setIsMoveMenuOpen(false); setIsGroupModalOpen(true); }}
                        >
                            <FolderPlus size={14} />
                            <span>New Folder</span>
                        </button>

                        {folders.length > 0 && <div className={styles.menuDivider} />}

                        <div className={styles.folderList}>
                            {folders.map(folder => (
                                <button
                                    key={folder.id}
                                    className={styles.menuOption}
                                    onClick={() => handleMoveToFolder(folder.id)}
                                >
                                    <Folder size={14} />
                                    <span>{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Move to Canvas / Move to Inbox Logic */}
            {
                (() => {
                    const selectedItems = items.filter(i => selectedIds.includes(i.id));
                    // Only show if we have items selected (folders don't switch between inbox/canvas usually, or do they? Assuming items for now)
                    if (selectedItems.length > 0) {
                        const view = selectedItems[0].status === 'inbox' ? 'inbox' : 'canvas';

                        if (view === 'inbox') {
                            return (
                                <button
                                    className={`${styles.actionBtn} ${styles.moveCanvasBtn}`}
                                    onClick={() => {
                                        selectedIds.forEach(id => updateItemContent(id, { status: 'active', folder_id: null })); // Move to root canvas
                                        clearSelection();
                                    }}
                                    title="Move to Canvas"
                                >
                                    <CircleArrowOutUpRight size={18} />
                                    <span className={styles.btnText}>To Canvas</span>
                                </button>
                            );
                        } else {
                            return (
                                <button
                                    className={`${styles.actionBtn} ${styles.moveInboxBtn}`}
                                    onClick={() => {
                                        selectedIds.forEach(id => updateItemContent(id, { status: 'inbox', folder_id: null }));
                                        clearSelection();
                                    }}
                                    title="Move to Inbox"
                                >
                                    <Inbox size={18} />
                                    <span className={styles.btnText}>To Inbox</span>
                                </button>
                            );
                        }
                    }
                    return null;
                })()
            }

            <div className={styles.divider} />

            <button className={`${styles.actionBtn} ${styles.organizeBtn}`} onClick={layoutSelectedItems} title="Clean up layout">
                <Sparkles size={18} />
                <span className={styles.btnText}>Organize</span>
            </button>

            <div className={styles.divider} />

            <button className={`${styles.actionBtn} ${styles.archiveBtn}`} onClick={archiveSelected} title="Archive Selection">
                <Archive size={18} />
            </button>

            <button
                className={`${styles.actionBtn} ${styles.delete} ${isDeleting ? styles.confirmDelete : ''}`}
                onClick={handleDelete}
                title="Delete Selection"
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={18} />}
            </button>

            <button className={styles.closeBtn} onClick={clearSelection} title="Clear selection">
                <X size={16} />
            </button>

            <InputModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSubmit={handleGroupSubmit}
                title="Create Group"
                placeholder="Folder Name"
            />
        </div >
    );
}

