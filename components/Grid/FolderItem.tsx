"use client";

import React, { forwardRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Folder as FolderIcon, Archive, Copy, Trash2, Lock, Unlock } from 'lucide-react';
import { Folder } from '@/types';
import styles from './FolderItem.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useVaultStore } from '@/components/Vault/VaultAuthModal';
import clsx from 'clsx';

interface FolderItemProps {
    folder: Folder;
    isLocked?: boolean;
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
    onDelete: (e: React.MouseEvent) => void;
    onArchive: (e: React.MouseEvent) => void;
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
    onDelete,
    onArchive,
    style,
    attributes,
    listeners,
    droppableRef
}, ref) => {
    const [isDeleting, setIsDeleting] = React.useState(false);

    const { isVaultLocked, setModalOpen, hasPassword, lock, unlockedIds, lockItem } = useVaultStore();
    const { toggleVaultFolder } = useItemsStore();

    const isVaulted = folder.is_vaulted;
    const isObscured = isVaulted && isVaultLocked && !unlockedIds.includes(folder.id);

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        onDelete(e);
    };

    const handleVaultToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // If no password is set, open modal (Targeting this folder)
        if (hasPassword === false) {
            setModalOpen(true, folder.id);
            return;
        }

        if (hasPassword !== true && !isVaulted) {
            setModalOpen(true, folder.id);
            return;
        }

        await toggleVaultFolder(folder.id);

        if (!isVaulted) {
            // Let individual re-lock handle it
        }
    };

    const handleLockFolder = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (hasPassword === false) {
            setModalOpen(true, folder.id);
            return;
        }

        if (!isVaultLocked) {
            lock();
        } else {
            lockItem(folder.id);
        }
    };

    const renderActions = () => (
        <div className={styles.actions} onPointerDown={e => e.stopPropagation()}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (isVaulted && !isObscured) handleLockFolder(e);
                    else if (isObscured) {
                        e.stopPropagation();
                        setModalOpen(true, folder.id);
                    } else handleVaultToggle(e);
                }}
                onPointerDown={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                data-tooltip={isObscured ? "Hidden - Tap to Unlock" : (isVaulted ? "Re-Lock Folder" : "Lock Folder")}
                data-tooltip-pos="bottom"
                style={{ color: 'inherit' }}
            >
                <Lock size={12} />
            </button>
            <button onClick={onArchive} data-tooltip="Archive" data-tooltip-pos="bottom-left"><Archive size={12} /></button>
            <button
                onClick={handleDeleteClick}
                data-tooltip={isDeleting ? "Confirm Delete" : "Delete"}
                data-tooltip-pos="bottom-left"
                className={clsx(styles.deleteAction, isDeleting && styles.confirmDelete)}
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? "Sure?" : <Trash2 size={12} />}
            </button>
        </div>
    );


    // Base class name
    const baseClassName = clsx(
        styles.folder,
        isSelected && styles.selected,
        isDimmed && styles.dimmed,
        isObscured && styles.obscured
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
        >
            {!isObscured && renderActions()}
            <div className={styles.tab} style={{ background: folder.color || 'var(--card-bg)' }} />
            <div
                className={styles.mainBody}
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

                    <div className={clsx(
                        styles.previewGrid,
                        folderItems.length === 1 && styles.grid1,
                        folderItems.length === 2 && styles.grid2,
                        folderItems.length === 3 && styles.grid3,
                        folderItems.length >= 4 && styles.grid4
                    )}>
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
                                    <div key={item.id} className={styles.miniItem} style={{ background: item.metadata?.color || folder.color || 'var(--accent)' }}>
                                        <div className={styles.miniIcon}>🔗</div>
                                    </div>
                                );
                            }
                            // Text Preview
                            return (
                                <div key={item.id} className={styles.miniItem} style={{ borderLeft: `3px solid ${item.metadata?.color || folder.color || 'var(--accent)'}` }}>
                                    <div className={styles.textLine} />
                                    <div className={styles.textLine} style={{ width: '60%' }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className={styles.bottomAccent} style={{ background: folder.color || 'var(--accent)' }} />
            </div>
            {isObscured && (
                <button
                    className={styles.revealButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        setModalOpen(true, folder.id);
                    }}
                >
                    <Unlock size={14} /> UNLOCK
                </button>
            )}
            <div className={styles.outerDate}>
                {folder.updated_at && folder.updated_at !== folder.created_at ? 'Edited: ' : 'Created: '}
                {new Date(folder.updated_at || folder.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
        </div>
    );
});

FolderItemView.displayName = 'FolderItemView';

export default function FolderItem({ folder, isLocked, onClick }: FolderItemProps) {
    const { items, selectedIds, archiveFolder, removeFolder } = useItemsStore();
    const { scale } = useCanvasStore(); // Need scale for transform
    const folderItems = items.filter(i => i.folder_id === folder.id);

    const isSelected = selectedIds.includes(folder.id);
    const isDimmed = selectedIds.length > 1 && !isSelected;

    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: folder.id,
        data: { ...folder, type: 'folder' },
        disabled: isLocked,
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
        transform: transform ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` : undefined,
        cursor: isLocked ? 'default' : (isDragging ? 'grabbing' : 'grab')
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

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        archiveFolder(folder.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeFolder(folder.id);
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
            onArchive={handleArchive}
            onDelete={handleDelete}
            attributes={attributes}
            listeners={listeners}
            style={dragStyle}
        />
    );
}
