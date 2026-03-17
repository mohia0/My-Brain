"use client";

import React from 'react';
import styles from './FolderModal.module.css';
import { X, FolderOpen, LogOut, Check, CheckCircle2, Archive, Copy, Trash2, ArrowUpRight, Maximize2, Minimize2, Palette } from 'lucide-react';
import clsx from 'clsx';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ItemCard from '@/components/Grid/ItemCard'; // Reuse ItemCard for consistency? 
// Actually ItemCard is Draggable, we might just want a static view or re-use logic.
// If we re-use ItemCard, they might try to drag inside the modal which is tricky.
// Let's make a simple static view for now, or allow "Unfolder" action.

function SortableItem({ id, children, isFolder = false, activeId, isDraggingItem }: { id: string, children: React.ReactNode, isFolder?: boolean, activeId: string | null, isDraggingItem?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver
    } = useSortable({ 
        id,
        data: {
            type: isFolder ? 'folder' : 'item'
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 100 : 1,
        cursor: 'grab'
    };

    // Show drop target if we are dragging something over a folder (nesting)
    // For items, we always highlight folders. 
    // For folders, we only highlight if they are not the same (nesting subfolders)
    // Note: Reordering is prioritized in SortableContext, but we can detect intent in handleDragEnd
    const isHoveringFolderForNesting = isOver && isFolder && activeId !== id;

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners} 
            className={clsx(isHoveringFolderForNesting && styles.dropTarget)}
        >
            {children}
        </div>
    );
}

export default function FolderModal({ folderId: initialFolderId, onClose, onItemClick, onFolderClick, isChildOpen }: { folderId: string, onClose: () => void, onItemClick: (id: string) => void, onFolderClick?: (id: string) => void, isChildOpen?: boolean }) {
    const { items, folders, updateItemContent, removeFolder, updateFolderPosition, updateFolderContent, selectedIds, toggleSelection, clearSelection, duplicateItem, archiveItem, removeItem, isSelectionMode, setSelectionMode, updateFolderItemsOrder, updateSubFoldersOrder } = useItemsStore();
    const [currentFolderId, setCurrentFolderId] = React.useState(initialFolderId);
    const folder = folders.find(f => f.id === currentFolderId);

    const sortFn = (a: any, b: any) => {
        const aIndex = a.metadata?.sort_index ?? 0;
        const bIndex = b.metadata?.sort_index ?? 0;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    };

    const folderItems = items.filter(i => i.folder_id === currentFolderId && i.status !== 'archived').sort(sortFn);
    const subFolders = folders.filter(f => f.parent_id === currentFolderId && f.status !== 'archived').sort(sortFn);

    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeItem, setActiveItem] = React.useState<any>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const titleRef = React.useRef<HTMLDivElement>(null);
    const scrollContentRef = React.useRef<HTMLDivElement>(null);
    const swipeZoneRef = React.useRef<HTMLDivElement>(null);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const [showColorPicker, setShowColorPicker] = React.useState(false);

    // Clear selection on mount to ensure clean state
    React.useEffect(() => {
        clearSelection();
        return () => clearSelection(); // Clear on unmount too
    }, []);

    const [isClosing, setIsClosing] = React.useState(false);

    const handleClose = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => onClose(), 200); // Wait for the 0.2s animation to finish
    }, [onClose]);

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(handleClose, 120, scrollContentRef, swipeZoneRef);

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
            handleClose();
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
            if (e.key === 'Escape' && !isChildOpen) handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, isChildOpen]);

    if (!folder) return null;

    const handleRemoveFromFolder = (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateItemContent(itemId, {
            folder_id: null as any, // Explicit null for DB
            position_x: folder.position_x + 50,
            position_y: folder.position_y + 50
        });
    };

    const handleRemoveFolderFromFolder = (subFolderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateFolderContent(subFolderId, {
            parent_id: null as any,
            position_x: folder.position_x + 80,
            position_y: folder.position_y + 80
        });
    };

    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isDeletingItem, setIsDeletingItem] = React.useState<string | null>(null);
    const [isExpanded, setIsExpanded] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('brainia_folder_expanded') === 'true';
        }
        return false;
    });

    const toggleExpand = () => {
        const next = !isExpanded;
        setIsExpanded(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem('brainia_folder_expanded', next.toString());
        }
    };

    const handleDeleteClick = () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }

        // Confirmed Delete
        folderItems.forEach(item => {
            updateItemContent(item.id, {
                folder_id: null as any,
                position_x: folder.position_x + 50,
                position_y: folder.position_y + 50
            });
        });
        subFolders.forEach(sf => {
            updateFolderContent(sf.id, {
                parent_id: null as any,
                position_x: folder.position_x + 80,
                position_y: folder.position_y + 80
            });
        });
        removeFolder(currentFolderId);
        handleClose();
    };

    const handleItemClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Check for modifier keys explicitly
        const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;

        if (hasModifier || isSelectionMode) {
            toggleSelection(id);
        } else {
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

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        const item = folderItems.find(i => i.id === active.id);
        const subf = subFolders.find(f => f.id === active.id);
        setActiveItem(item || subf);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveItem(null);

        if (!over) return;

        if (active.id !== over.id) {
            const activeIsItem = folderItems.some(i => i.id === active.id);
            const overIsFolder = subFolders.some(f => f.id === over.id);

            // 1. Move into subfolder logic
            if (overIsFolder) {
                if (activeIsItem) {
                    await updateItemContent(active.id as string, { folder_id: over.id as string });
                    return;
                } else if (active.id !== over.id) {
                    // Nested folder move
                    await updateFolderContent(active.id as string, { parent_id: over.id as string });
                    return;
                }
            }

            // 2. Reorder logic
            if (activeIsItem && folderItems.some(i => i.id === over.id)) {
                const oldIndex = folderItems.findIndex(i => i.id === active.id);
                const newIndex = folderItems.findIndex(i => i.id === over.id);
                const newOrder = arrayMove([...folderItems], oldIndex, newIndex).map(i => i.id);
                updateFolderItemsOrder(newOrder);
            } else if (!activeIsItem && subFolders.some(f => f.id === over.id)) {
                const oldIndex = subFolders.findIndex(f => f.id === active.id);
                const newIndex = subFolders.findIndex(f => f.id === over.id);
                const newOrder = arrayMove([...subFolders], oldIndex, newIndex).map(f => f.id);
                updateSubFoldersOrder(newOrder);
            }
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.4',
                },
            },
        }),
    };

    const canExpand = folderItems.length + subFolders.length > 5;
    const shouldExpand = isExpanded && canExpand;

    const isDraggingItem = activeItem && !('name' in activeItem);

    return (
        <div
            className={clsx(styles.overlay, isClosing && styles.closingOverlay, isChildOpen && styles.childOpen)}
            onClick={handleClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                className={clsx(styles.modal, shouldExpand && styles.expandedModal, isClosing && styles.closingModal)}
                onClick={e => e.stopPropagation()}
                style={{
                    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
                    transition: offset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                }}
            >
                <div
                    ref={swipeZoneRef}
                    className={styles.swipeZone}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className={styles.swipeHandle} />
                </div>
                <header className={styles.header}>
                    <div className={styles.titleInfo}>
                        <div
                            className={styles.iconCircle}
                            style={{
                                backgroundColor: folder.color?.startsWith('var') ? folder.color : (folder.color ? `${folder.color}22` : undefined),
                                color: folder.color || 'var(--accent)'
                            }}
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
                            </div>
                            <span className={styles.itemMetaHeader}>
                                {folderItems.length} ideas • Created {getRelativeTime(folder.created_at)}
                                {folder.updated_at && folder.updated_at !== folder.created_at && ` • Updated ${getRelativeTime(folder.updated_at)}`}
                            </span>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                                className={clsx(styles.actionBtn, showColorPicker && styles.activeActionBtn)}
                                data-tooltip="Change Color"
                                data-tooltip-pos="bottom"
                            >
                                <Palette size={20} />
                            </button>
                            {showColorPicker && (
                                <>
                                    <div className={styles.colorOverlay} onClick={() => setShowColorPicker(false)} />
                                    <div className={styles.colorDropdown} onClick={e => e.stopPropagation()}>
                                        <div className={styles.colorGrid}>
                                            {[
                                                '#6B7280', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#F59E0B',
                                                '#84CC16', '#14B8A6', '#0EA5E9', '#3B82F6'
                                            ].map(color => (
                                                <button
                                                    key={color}
                                                    className={clsx(styles.colorDot, folder.color === color && styles.activeColor)}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => {
                                                        updateFolderContent(currentFolderId, { color });
                                                        setShowColorPicker(false);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleDeleteClick}
                            className={clsx(styles.actionBtn, styles.deleteBtnIcon, isDeleting && styles.confirmDelete)}
                            data-tooltip={isDeleting ? "Confirm Delete" : "Remove Folder"}
                            data-tooltip-pos="bottom"
                        >
                            {isDeleting ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={20} />}
                        </button>
                        <button
                            onClick={() => {
                                if (isSelectionMode) clearSelection();
                                setSelectionMode(!isSelectionMode);
                            }}
                            className={clsx(styles.actionBtn, isSelectionMode && styles.activeActionBtn)}
                            data-tooltip="Select Items"
                            data-tooltip-pos="bottom"
                        >
                            <CheckCircle2 size={20} />
                        </button>
                        {(folderItems.length + subFolders.length > 5) && (
                            <button
                                onClick={toggleExpand}
                                className={clsx(styles.actionBtn, styles.expandBtn, isExpanded && styles.activeActionBtn)}
                                data-tooltip={isExpanded ? "Collapse" : "Expand"}
                                data-tooltip-pos="bottom"
                            >
                                {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                            </button>
                        )}
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
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={[...subFolders.map(f => f.id), ...folderItems.map(i => i.id)]}
                                strategy={rectSortingStrategy}
                            >
                                <div className={styles.grid}>
                                    {subFolders.map(sf => {
                                        const sfItems = items.filter(i => i.folder_id === sf.id && i.status !== 'archived');
                                        return (
                                            <SortableItem key={sf.id} id={sf.id} isFolder={true} activeId={activeId} isDraggingItem={isDraggingItem}>
                                                <div
                                                    className={clsx(
                                                        styles.itemWrapper,
                                                        styles.folderItem,
                                                        selectedIds.includes(sf.id) && styles.selected,
                                                        selectedIds.includes(sf.id) && selectedIds.length === 1 && styles.singleSelected
                                                    )}
                                                    onClick={(e) => handleSubFolderClick(sf.id, e)}
                                                    onTouchStart={() => handleTouchStart(sf.id)}
                                                    onTouchEnd={handleTouchEnd}
                                                    onTouchMove={handleTouchEnd}
                                                >
                                                    <div
                                                        onClick={e => e.stopPropagation()}
                                                        onTouchStart={e => e.stopPropagation()}
                                                        onTouchEnd={e => e.stopPropagation()}
                                                        onTouchMove={e => e.stopPropagation()}
                                                        onPointerDown={e => e.stopPropagation()}
                                                        onPointerUp={e => e.stopPropagation()}
                                                    >
                                                        <button
                                                            className={styles.removeBtn}
                                                            onClick={(e) => handleRemoveFolderFromFolder(sf.id, e)}
                                                            onTouchStart={e => e.stopPropagation()}
                                                            onTouchEnd={e => e.stopPropagation()}
                                                            onTouchMove={e => e.stopPropagation()}
                                                            data-tooltip="Move out of folder"
                                                            data-tooltip-pos="bottom"
                                                        >
                                                            <LogOut size={14} style={{ transform: 'rotate(180deg)' }} />
                                                        </button>
                                                    </div>
                                                    <div className={styles.itemPreview} style={{ color: sf.color || 'var(--accent)' }}>
                                                        {sfItems.length > 0 ? (
                                                            <div className={clsx(
                                                                styles.previewGrid,
                                                                sfItems.length === 1 && styles.grid1,
                                                                sfItems.length === 2 && styles.grid2,
                                                                sfItems.length === 3 && styles.grid3,
                                                                sfItems.length >= 4 && styles.grid4
                                                            )}>
                                                                {sfItems.slice(0, 4).map(item => {
                                                                    if (item.type === 'image' || item.metadata?.image) {
                                                                        return <img key={item.id} src={item.type === 'image' ? item.content : item.metadata?.image} className={styles.miniImage} />;
                                                                    }
                                                                    if (item.type === 'link') {
                                                                        return <div key={item.id} className={styles.miniItem}><div className={styles.miniIcon}>🔗</div></div>;
                                                                    }
                                                                    return (
                                                                        <div key={item.id} className={styles.miniItem}>
                                                                            <div className={styles.miniTextLine} />
                                                                            <div className={styles.miniTextLine} style={{ width: '60%' }} />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <FolderOpen size={32} />
                                                        )}
                                                    </div>
                                                    <div className={styles.itemInfo}>
                                                        <span className={styles.itemTitle}>{sf.name}</span>
                                                        <div className={styles.itemMeta}>
                                                            <span>Folder</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SortableItem>
                                        );
                                    })}
                                    {folderItems.map(item => (
                                        <SortableItem key={item.id} id={item.id} activeId={activeId} isDraggingItem={isDraggingItem}>
                                            <div
                                                className={clsx(
                                                    styles.itemWrapper,
                                                    selectedIds.includes(item.id) && styles.selected,
                                                    selectedIds.includes(item.id) && selectedIds.length === 1 && styles.singleSelected
                                                )}
                                                onClick={(e) => handleItemClick(item.id, e)}
                                                onTouchStart={() => handleTouchStart(item.id)}
                                                onTouchEnd={handleTouchEnd}
                                                onTouchMove={handleTouchEnd}
                                            >
                                                <div
                                                    className={styles.itemActions}
                                                    onClick={e => e.stopPropagation()}
                                                    onTouchStart={e => { e.stopPropagation(); }}
                                                    onTouchEnd={e => { e.stopPropagation(); }}
                                                    onTouchMove={e => e.stopPropagation()}
                                                    onPointerDown={e => e.stopPropagation()}
                                                    onPointerUp={e => e.stopPropagation()}
                                                >
                                                    <button
                                                        className={styles.itemActionBtn}
                                                        onClick={(e) => { e.stopPropagation(); archiveItem(item.id); }}
                                                        data-tooltip="Archive"
                                                        data-tooltip-pos="bottom"
                                                    >
                                                        <Archive size={14} />
                                                    </button>
                                                    <button
                                                        className={styles.itemActionBtn}
                                                        onClick={(e) => { e.stopPropagation(); duplicateItem(item.id); }}
                                                        data-tooltip="Duplicate"
                                                        data-tooltip-pos="bottom"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        className={styles.itemActionBtn}
                                                        onClick={(e) => handleRemoveFromFolder(item.id, e)}
                                                        data-tooltip="Move back to Canvas"
                                                        data-tooltip-pos="bottom"
                                                    >
                                                        <ArrowUpRight size={14} />
                                                    </button>
                                                    <button
                                                        className={clsx(styles.itemActionBtn, styles.deleteActionBtn, isDeletingItem === item.id && styles.confirmDelete)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isDeletingItem === item.id) {
                                                                removeItem(item.id);
                                                                setIsDeletingItem(null);
                                                            } else {
                                                                setIsDeletingItem(item.id);
                                                            }
                                                        }}
                                                        onMouseLeave={() => setIsDeletingItem(null)}
                                                        data-tooltip={isDeletingItem === item.id ? "Confirm?" : "Delete"}
                                                        data-tooltip-pos="bottom"
                                                    >
                                                        {isDeletingItem === item.id ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={14} />}
                                                    </button>
                                                </div>

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
                                        </SortableItem>
                                    ))}
                                </div>
                            </SortableContext>

                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeId && activeItem ? (
                                    <div className={clsx(styles.itemWrapper, styles.draggingOverlay)}>
                                        {'name' in activeItem ? (
                                            <>
                                                <div className={styles.itemPreview} style={{ color: activeItem.color || 'var(--accent)' }}>
                                                    {(() => {
                                                        const sfItems = items.filter(i => i.folder_id === (activeItem as any).id && i.status !== 'archived');
                                                        if (sfItems.length > 0) {
                                                            return (
                                                                <div className={clsx(
                                                                    styles.previewGrid,
                                                                    sfItems.length === 1 && styles.grid1,
                                                                    sfItems.length === 2 && styles.grid2,
                                                                    sfItems.length === 3 && styles.grid3,
                                                                    sfItems.length >= 4 && styles.grid4
                                                                )}>
                                                                    {sfItems.slice(0, 4).map(item => {
                                                                        if (item.type === 'image' || item.metadata?.image) {
                                                                            return <img key={item.id} src={item.type === 'image' ? item.content : item.metadata?.image} className={styles.miniImage} />;
                                                                        }
                                                                        if (item.type === 'link') {
                                                                            return <div key={item.id} className={styles.miniItem}><div className={styles.miniIcon}>🔗</div></div>;
                                                                        }
                                                                        return (
                                                                            <div key={item.id} className={styles.miniItem}>
                                                                                <div className={styles.miniTextLine} />
                                                                                <div className={styles.miniTextLine} style={{ width: '60%' }} />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        }
                                                        return <FolderOpen size={32} />;
                                                    })()}
                                                </div>
                                                <div className={styles.itemInfo}>
                                                    <span className={styles.itemTitle}>{(activeItem as any).name}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={styles.itemPreview}>
                                                    {activeItem.type === 'image' || activeItem.metadata?.image ? (
                                                        <img src={activeItem.type === 'image' ? activeItem.content : activeItem.metadata?.image} className={styles.previewImg} />
                                                    ) : (
                                                        <div className={styles.genericIcon}>
                                                            {activeItem.type === 'link' ? '🔗' : '📝'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.itemInfo}>
                                                    <span className={styles.itemTitle}>{activeItem.metadata?.title || 'Untitled'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </div>
        </div>
    );
}
