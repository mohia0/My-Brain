"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './FloatingBar.module.css';
import { Trash2, FolderPlus, Sparkles, X, ChevronUp, Folder } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
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
        folders,
        updateItemContent,
        layoutSelectedItems
    } = useItemsStore();

    const [isDeleting, setIsDeleting] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
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
            updateItemContent(id, { folder_id: folderId });
        });
        clearSelection();
        setIsMoveMenuOpen(false);
    };

    const handleGroupSubmit = (name: string) => {
        const selectedItems = items.filter(i => selectedIds.includes(i.id));
        if (selectedItems.length === 0) return;

        const avgX = selectedItems.reduce((acc, i) => acc + i.position_x, 0) / selectedItems.length;
        const avgY = selectedItems.reduce((acc, i) => acc + i.position_y, 0) / selectedItems.length;

        const folderId = crypto.randomUUID();
        addFolder({
            id: folderId,
            user_id: 'user-1',
            name,
            position_x: avgX - 100,
            position_y: avgY - 50,
            created_at: new Date().toISOString()
        });

        // Use setTimeout to ensure folder is in store
        setTimeout(() => {
            selectedIds.forEach(id => {
                updateItemContent(id, { folder_id: folderId });
            });
            clearSelection();
        }, 50);

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

            <button className={`${styles.actionBtn} ${styles.organizeBtn}`} onClick={layoutSelectedItems} title="Clean up layout">
                <Sparkles size={18} />
                <span className={styles.btnText}>Organize</span>
            </button>

            <div className={styles.divider} />

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
        </div>
    );
}

