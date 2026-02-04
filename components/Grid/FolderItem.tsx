"use client";

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Folder as FolderIcon } from 'lucide-react';
import { Folder } from '@/types';
import styles from './FolderItem.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import clsx from 'clsx';

interface FolderItemProps {
    folder: Folder;
    onClick?: () => void;
}

export default function FolderItem({ folder, onClick }: FolderItemProps) {
    const { items, selectedIds } = useItemsStore();
    const { scale } = useCanvasStore();
    const folderItems = items.filter(i => i.folder_id === folder.id);

    const isSelected = selectedIds.includes(folder.id);
    const isDimmed = selectedIds.length > 0 && !isSelected;

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: folder.id,
        data: { ...folder, type: 'folder' }
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: folder.id,
        data: { type: 'folder', id: folder.id }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`,
    } : undefined;

    return (
        <div
            id={`draggable-folder-${folder.id}`}
            ref={setNodeRef}
            className={clsx(styles.folder, isSelected && styles.selected, isDimmed && styles.dimmed)}
            style={{
                left: folder.position_x,
                top: folder.position_y,
                ...style
            }}
            {...listeners}
            {...attributes}
            onPointerDown={(e) => {
                e.stopPropagation();
                listeners?.onPointerDown?.(e);
            }}
            onClick={onClick}
        >
            <div ref={setDroppableRef} className={styles.dropZone}>
                <div className={styles.header}>
                    <FolderIcon size={16} fill="rgba(255,255,255,0.2)" />
                    <span className={styles.title}>{folder.name}</span>
                    <span className={styles.count}>{folderItems.length}</span>
                </div>

                <div className={styles.previewGrid}>
                    {folderItems.slice(0, 4).map(item => {
                        // Image / Capture Preview
                        if (item.type === 'image' || (item.type === 'link' && item.metadata?.image)) {
                            return (
                                <img
                                    key={item.id}
                                    src={item.type === 'image' ? item.content : item.metadata?.image}
                                    className={styles.miniImage}
                                    alt=""
                                />
                            );
                        }
                        // Link Icon Preview
                        if (item.type === 'link') {
                            return (
                                <div key={item.id} className={styles.miniItem} style={{ background: '#6e56cf' }}>
                                    <div className={styles.miniIcon}>🔗</div>
                                </div>
                            );
                        }
                        // Text Preview
                        return (
                            <div key={item.id} className={styles.miniItem}>
                                <div className={styles.textLine} />
                                <div className={styles.textLine} style={{ width: '60%' }} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
