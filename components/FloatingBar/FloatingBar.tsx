"use client";

import React, { useState } from 'react';
import styles from './FloatingBar.module.css';
import { Trash2, FolderInput, Sparkles, X } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import InputModal from '@/components/InputModal/InputModal';

export default function FloatingBar() {
    const { selectedIds, clearSelection, removeItem, removeFolder, addFolder, items, updateItemContent, layoutSelectedItems } = useItemsStore();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    if (selectedIds.length === 0) return null;

    const handleDelete = () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        selectedIds.forEach(id => {
            removeItem(id); // Try removing as item
            removeFolder(id); // Try removing as folder (safe since IDs are UUIDs)
        });
        clearSelection();
        setIsDeleting(false);
    };

    const handleGroupClick = () => {
        setIsGroupModalOpen(true);
    };

    const handleGroupSubmit = (name: string) => {
        // find center of selected items
        const selectedItems = items.filter(i => selectedIds.includes(i.id));
        if (selectedItems.length === 0) return;

        const minX = Math.min(...selectedItems.map(i => i.position_x));
        const minY = Math.min(...selectedItems.map(i => i.position_y));

        // Create folder at top-left of selection group
        const folderId = crypto.randomUUID();
        addFolder({
            id: folderId,
            user_id: 'user-1',
            name,
            position_x: minX,
            position_y: minY - 50,
            created_at: new Date().toISOString()
        });

        // Move items into folder
        selectedIds.forEach(id => {
            updateItemContent(id, { folder_id: folderId });
        });

        clearSelection();
        setIsGroupModalOpen(false);
    };

    return (
        <div className={styles.bar}>
            <div className={styles.count}>{selectedIds.length} selected</div>
            <div className={styles.divider} />

            <button className={styles.actionBtn} onClick={handleGroupClick} title="Group into Folder">
                <FolderInput size={18} />
            </button>

            <button className={`${styles.actionBtn} ${styles.organizeBtn}`} onClick={layoutSelectedItems}>
                <Sparkles size={18} />
                <span className={styles.btnText}>Organize</span>
            </button>

            <div className={styles.divider} />

            <button
                className={`${styles.actionBtn} ${styles.delete} ${isDeleting ? styles.confirmDelete : ''}`}
                onClick={handleDelete}
                title="Delete"
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? <span style={{ fontSize: 12, fontWeight: 600 }}>Sure?</span> : <Trash2 size={18} />}
            </button>

            <button className={styles.closeBtn} onClick={clearSelection}>
                <X size={16} />
            </button>

            <InputModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSubmit={handleGroupSubmit}
                title="Group into Folder"
                placeholder="Folder Name"
            />
        </div>
    );
}
