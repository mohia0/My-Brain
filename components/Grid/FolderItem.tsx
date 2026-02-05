"use client";

import React, { forwardRef } from 'react';
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

interface FolderItemViewProps {
    folder: Folder;
    folderItems: any[];
    isSelected?: boolean;
    isDimmed?: boolean;
    isDragging?: boolean;
    isOverlay?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    droppableRef?: (node: HTMLElement | null) => void;
}

export const FolderItemView = forwardRef<HTMLDivElement, FolderItemViewProps>(({
    folder,
    folderItems,
    isSelected,
    isDimmed,
    isDragging,
    isOverlay,
    onClick,
    style,
    attributes,
    listeners,
    droppableRef
}, ref) => {

    // Base class name
    const baseClassName = clsx(
        styles.folder,
        isSelected && styles.selected,
        isDimmed && styles.dimmed
    );

    // Style adjustments for overlay (fixed type error)
    const finalStyle = isOverlay ? {
        ...style,
        position: 'relative' as const,
        top: 0,
        left: 0,
        transform: 'none'
    } : style;

    return (
        <div
            id={`draggable-folder-${folder.id}`}
            ref={ref}
            className={baseClassName}
            style={finalStyle}
            {...listeners}
            {...attributes}
            onPointerDown={(e) => {
                e.stopPropagation();
                listeners?.onPointerDown?.(e);
            }}
            onClick={onClick}
        >
            <div ref={droppableRef} className={styles.dropZone}>
                <div className={styles.header}>
                    <FolderIcon
                        size={16}
                        fill={folder.color ? `${folder.color}44` : "rgba(255,255,255,0.2)"}
                        color={folder.color || "var(--accent)"}
                    />
                    <span className={styles.title}>{folder.name}</span>
                    <span className={styles.count} style={{ color: folder.color }}>{folderItems.length}</span>
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
                                <div key={item.id} className={styles.miniItem} style={{ background: 'var(--accent)' }}>
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
            <div className={styles.outerDate}>
                {new Date(folder.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
        </div>
    );
});

FolderItemView.displayName = 'FolderItemView';

export default function FolderItem({ folder, onClick }: FolderItemProps) {
    const { items, selectedIds } = useItemsStore();
    const { scale } = useCanvasStore(); // Need scale for transform
    const folderItems = items.filter(i => i.folder_id === folder.id);

    const isSelected = selectedIds.includes(folder.id);
    const isDimmed = selectedIds.length > 0 && !isSelected;

    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: folder.id,
        data: { ...folder, type: 'folder' }
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: folder.id,
        data: { type: 'folder', id: folder.id }
    });

    const dragStyle: React.CSSProperties = {
        left: folder.position_x,
        top: folder.position_y,
        opacity: 1, // Always visible
        zIndex: isDragging ? 1000 : undefined,
        transform: transform ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` : undefined
    };

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            useItemsStore.getState().toggleSelection(folder.id);
        } else {
            useItemsStore.getState().selectItem(folder.id);
            onClick?.();
        }
    };

    return (
        <FolderItemView
            ref={setNodeRef}
            droppableRef={setDroppableRef}
            folder={folder}
            folderItems={folderItems}
            isSelected={isSelected}
            isDimmed={isDimmed}
            isDragging={isDragging}
            onClick={handleClick}
            attributes={attributes}
            listeners={listeners}
            style={dragStyle}
        />
    );
}
