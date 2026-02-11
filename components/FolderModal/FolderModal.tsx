"use client";

import React from 'react';
import styles from './FolderModal.module.css';
import { X, FolderOpen, LogOut, Check, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';
import ItemCard from '@/components/Grid/ItemCard'; // Reuse ItemCard for consistency? 
// Actually ItemCard is Draggable, we might just want a static view or re-use logic.
// If we re-use ItemCard, they might try to drag inside the modal which is tricky.
// Let's make a simple static view for now, or allow "Unfolder" action.

export default function FolderModal({ folderId: initialFolderId, onClose, onItemClick, onFolderClick }: { folderId: string, onClose: () => void, onItemClick: (id: string) => void, onFolderClick?: (id: string) => void }) {
    const { items, folders, updateItemContent, removeFolder, updateFolderPosition, updateFolderContent, selectedIds, toggleSelection, clearSelection } = useItemsStore();
    const [currentFolderId, setCurrentFolderId] = React.useState(initialFolderId);
    const folder = folders.find(f => f.id === currentFolderId);
    const folderItems = items.filter(i => i.folder_id === currentFolderId);
    const subFolders = folders.filter(f => f.parent_id === currentFolderId);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const titleRef = React.useRef<HTMLDivElement>(null);
    const scrollContentRef = React.useRef<HTMLDivElement>(null);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const [manualSelectionMode, setManualSelectionMode] = React.useState(false);
    const [showColorPicker, setShowColorPicker] = React.useState(false);

    const isSelectionMode = selectedIds.length > 0 || manualSelectionMode;

    // Clear selection on mount to ensure clean state
    React.useEffect(() => {
        clearSelection();
        return () => clearSelection(); // Clear on unmount too
    }, []);

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(onClose, 120, scrollContentRef);

    const [isEditingName, setIsEditingName] = React.useState(false);
    const [tempName, setTempName] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (folder) setTempName(folder.name);
    }, [folder?.id]);

    const handleBack = () => {
        if (folder?.parent_id) {
            setCurrentFolderId(folder.parent_id);
        } else {
            onClose();
        }
    };

    React.useEffect(() => {
        const onSystemBack = (e: Event) => {
            e.preventDefault();
            handleBack();
        };
        window.addEventListener('systemBack', onSystemBack);
        return () => window.removeEventListener('systemBack', onSystemBack);
    }, [folder?.id]);

    const handleNameChange = (newName: string) => {
        setTempName(newName);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await updateFolderContent(currentFolderId, { name: newName });
            } finally {
                setTimeout(() => setIsSaving(false), 500);
            }
        }, 1000);
    };

    // Check for title overflow
    React.useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current) {
                const isOver = titleRef.current.scrollWidth > titleRef.current.clientWidth;
                setIsOverflowing(isOver);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [folder?.name]);

    const getRelativeTime = (dateStr: string) => {
        if (!dateStr) return 'unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    // Handle ESC key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!folder) return null;

    const handleRemoveFromFolder = (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateItemContent(itemId, {
            folder_id: undefined,
            position_x: folder.position_x + 50,
            position_y: folder.position_y + 50
        });
    };

    const handleRemoveFolderFromFolder = (subFolderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateFolderContent(subFolderId, {
            parent_id: undefined,
            position_x: folder.position_x + 80,
            position_y: folder.position_y + 80
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
        subFolders.forEach(sf => {
            updateFolderContent(sf.id, {
                parent_id: undefined,
                position_x: folder.position_x + 80,
                position_y: folder.position_y + 80
            });
        });
        removeFolder(currentFolderId);
        onClose();
    };

    const handleItemClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Check for modifier keys explicitly
        const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;

        if (hasModifier || isSelectionMode) {
            toggleSelection(id);
        } else {
            onClose();
            onItemClick(id);
        }
    };

    const handleSubFolderClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;

        if (hasModifier || isSelectionMode) {
            toggleSelection(id);
        } else {
            setCurrentFolderId(id);
        }
    };

    const handleTouchStart = (id: string) => {
        longPressTimer.current = setTimeout(() => {
            toggleSelection(id);
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
        }, 600);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                style={{
                    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
                    transition: offset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                }}
            >
                <div className={styles.swipeHandle} />
                <header className={styles.header}>
                    <div className={styles.titleInfo}>
                        <div
                            className={clsx(styles.iconCircle, showColorPicker && styles.activeIcon)}
                            style={{
                                backgroundColor: folder.color?.startsWith('var') ? folder.color : (folder.color ? `${folder.color}22` : undefined),
                                color: folder.color || 'var(--accent)',
                                cursor: 'pointer'
                            }}
                            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                        >
                            <FolderOpen size={22} />
                        </div>
                        <div className={styles.titleLayout}>
                            <div className={styles.nameRow}>
                                <div className={styles.folderNameWrapper} onClick={() => setIsEditingName(true)}>
                                    {isEditingName ? (
                                        <input
                                            autoFocus
                                            className={styles.folderNameInput}
                                            value={tempName}
                                            onChange={e => handleNameChange(e.target.value)}
                                            onBlur={() => setIsEditingName(false)}
                                            onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                                        />
                                    ) : (
                                        <span
                                            ref={titleRef}
                                            className={clsx(styles.folderName, isOverflowing && styles.canAnimate)}
                                        >
                                            {folder.name}
                                        </span>
                                    )}
                                </div>
                                {(isSaving || folder.syncStatus === 'syncing') && <span className={styles.savingIndicator}>Saving...</span>}
                                {showColorPicker && (
                                    <div className={styles.colorDots} onClick={e => e.stopPropagation()}>
                                        {['#6E56CF', '#E11D48', '#059669', '#D97706', '#2563EB', '#7C3AED'].map(color => (
                                            <button
                                                key={color}
                                                className={clsx(styles.colorDot, folder.color === color && styles.activeColor)}
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    updateFolderContent(currentFolderId, { color });
                                                    // Optional: Hide after selection
                                                    // setShowColorPicker(false);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className={styles.itemMetaHeader}>
                                {folderItems.length} ideas • Created {getRelativeTime(folder.created_at)}
                            </span>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button
                            onClick={handleDeleteClick}
                            className={`${styles.deleteBtn} ${isDeleting ? styles.confirmDelete : ''}`}
                            data-tooltip={isDeleting ? "Confirm Delete" : "Remove Folder"}
                            data-tooltip-pos="bottom"
                        >
                            {isDeleting ? "Sure?" : "Delete"}
                        </button>
                        <button
                            onClick={() => setManualSelectionMode(!manualSelectionMode)}
                            className={clsx(styles.actionBtn, manualSelectionMode && styles.activeActionBtn)}
                            data-tooltip="Select Items"
                            data-tooltip-pos="bottom"
                        >
                            <CheckCircle2 size={20} />
                        </button>
                        <button onClick={handleBack} className={styles.closeBtn}>
                            {folder.parent_id ? <LogOut size={20} style={{ transform: 'rotate(180deg)' }} /> : <X size={20} />}
                        </button>
                    </div>
                </header>

                <div className={styles.content} ref={scrollContentRef}>
                    {folderItems.length === 0 && subFolders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FolderOpen size={48} strokeWidth={1} style={{ opacity: 0.2 }} />
                            <span>No ideas here yet</span>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {subFolders.map(sf => (
                                <div
                                    key={sf.id}
                                    className={clsx(
                                        styles.itemWrapper,
                                        styles.folderItem,
                                        selectedIds.includes(sf.id) && styles.selected
                                    )}
                                    onClick={(e) => handleSubFolderClick(sf.id, e)}
                                    onTouchStart={() => handleTouchStart(sf.id)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd}
                                >
                                    <button
                                        className={styles.removeBtn}
                                        onClick={(e) => handleRemoveFolderFromFolder(sf.id, e)}
                                        data-tooltip="Move out of folder"
                                        data-tooltip-pos="bottom"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                    <div className={styles.itemPreview} style={{ color: sf.color || 'var(--accent)' }}>
                                        <FolderOpen size={32} />
                                    </div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemTitle}>{sf.name}</span>
                                        <div className={styles.itemMeta}>
                                            <span>Folder</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {folderItems.map(item => (
                                <div
                                    key={item.id}
                                    className={clsx(
                                        styles.itemWrapper,
                                        selectedIds.includes(item.id) && styles.selected
                                    )}
                                    onClick={(e) => handleItemClick(item.id, e)}
                                    onTouchStart={() => handleTouchStart(item.id)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd}
                                >
                                    <button
                                        className={styles.removeBtn}
                                        onClick={(e) => handleRemoveFromFolder(item.id, e)}
                                        data-tooltip="Move to Ideas"
                                        data-tooltip-pos="bottom"
                                    >
                                        <LogOut size={14} />
                                    </button>

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
                                        <div className={styles.itemMeta}>
                                            <span>
                                                {item.type === 'link' ? (() => {
                                                    try { return new URL(item.content).hostname; }
                                                    catch { return 'Link'; }
                                                })() :
                                                    item.type === 'text' ? 'Idea' : 'Image'}
                                            </span>
                                            <span className={styles.itemDate}>
                                                {getRelativeTime(item.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
