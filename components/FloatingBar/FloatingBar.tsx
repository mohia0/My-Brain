"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './FloatingBar.module.css';
import { Trash2, FolderPlus, Sparkles, X, ChevronUp, Folder, Archive, CircleArrowOutUpRight, Inbox, DoorClosed, Frame, CornerLeftUp } from 'lucide-react';
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
        archiveSelected,
        currentRoomId
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

    const selectedItemsList = items.filter(i => selectedIds.includes(i.id));
    const isOnlyTwoProjectAreas = selectedIds.length === 2 &&
        selectedItemsList.length === 2 &&
        selectedItemsList.every(i => i.type === 'project');

    if (selectedIds.length <= 1 || isOnlyTwoProjectAreas) return null;

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
                updateItemContent(id, { folder_id: folderId, room_id: null, status: 'active' });
            } else {
                useItemsStore.getState().updateFolderContent?.(id, { parent_id: folderId, room_id: null });
            }
        });
        clearSelection();
        setIsMoveMenuOpen(false);
    };

    const handleMoveToRoom = (roomId: string) => {
        selectedIds.forEach(id => {
            const isItem = items.some(i => i.id === id);
            if (isItem) {
                updateItemContent(id, { room_id: roomId, folder_id: null, status: 'active' });
            } else {
                useItemsStore.getState().updateFolderContent?.(id, { room_id: roomId, parent_id: null });
            }
        });
        clearSelection();
        setIsMoveMenuOpen(false);
    };

    const handleMoveToArea = (areaId: string) => {
        const area = items.find(i => i.id === areaId);
        if (!area) return;

        const centerX = area.position_x + (area.metadata?.width || 300) / 2;
        const centerY = area.position_y + (area.metadata?.height || 200) / 2;

        selectedIds.forEach((id, index) => {
            const offset = index * 20;
            const isItem = items.some(i => i.id === id);
            if (isItem) {
                updateItemContent(id, {
                    position_x: centerX - 140 + offset,
                    position_y: centerY - 60 + offset,
                    room_id: null,
                    folder_id: null,
                    status: 'active'
                });
            } else {
                useItemsStore.getState().updateFolderContent?.(id, {
                    position_x: centerX - 140 + offset,
                    position_y: centerY - 60 + offset,
                    room_id: null,
                    parent_id: null
                });
            }
        });
        clearSelection();
        setIsMoveMenuOpen(false);
    };

    const handleMoveOut = () => {
        const parentRoomId = currentRoomId ? items.find(i => i.id === currentRoomId)?.room_id || null : null;

        selectedIds.forEach((id) => {
            const isItem = items.some(i => i.id === id);
            if (isItem) {
                updateItemContent(id, {
                    room_id: parentRoomId,
                    folder_id: null,
                    status: 'active'
                });
            } else {
                useItemsStore.getState().updateFolderContent?.(id, {
                    room_id: parentRoomId,
                    parent_id: null
                });
            }
        });
        clearSelection();
        setIsMoveMenuOpen(false);
    };

    const mindrooms = items.filter(i => i.type === 'room');
    const projectAreas = items.filter(i => i.type === 'project');

    const isInsideRoom = !!currentRoomId;
    const parentRoomId = currentRoomId ? items.find(i => i.id === currentRoomId)?.room_id : null;
    const moveOutLabel = parentRoomId ? 'Move to Outer Room' : 'Move to Main Canvas';

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
            status: 'active',
            created_at: new Date().toISOString()
        });

        // Batch update selected items and folders
        setTimeout(() => {
            selectedIds.forEach(id => {
                const isItem = items.some(i => i.id === id);
                if (isItem) {
                    updateItemContent(id, { folder_id: folderId, status: 'active' });
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
                    data-tooltip="Move to Folder"
                    data-tooltip-pos="top"
                >
                    <FolderPlus size={18} />
                    <ChevronUp size={12} className={clsx(styles.chevron, isMoveMenuOpen && styles.chevronOpen)} />
                </button>

                {isMoveMenuOpen && (
                    <div className={styles.moveMenu}>

                        <div className={styles.menuHeader}>Move to...</div>


                        <div className={styles.folderList}>
                            {isInsideRoom && (
                                <button
                                    className={styles.menuOption}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveOut();
                                    }}
                                    style={{ color: 'var(--accent)' }}
                                >
                                    <CornerLeftUp size={14} />
                                    <span>{moveOutLabel}</span>
                                </button>
                            )}

                            {folders.length > 0 && <div className={styles.menuGroupTitle}>Folders</div>}
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

                            {mindrooms.length > 0 && <div className={styles.menuGroupTitle}>Mind Rooms</div>}
                            {mindrooms.map(room => (
                                <button
                                    key={room.id}
                                    className={styles.menuOption}
                                    onClick={() => handleMoveToRoom(room.id)}
                                >
                                    <DoorClosed size={14} />
                                    <span>{room.metadata?.title || 'Untitled Room'}</span>
                                </button>
                            ))}

                            {projectAreas.length > 0 && <div className={styles.menuGroupTitle}>Project Areas</div>}
                            {projectAreas.map(area => (
                                <button
                                    key={area.id}
                                    className={styles.menuOption}
                                    onClick={() => handleMoveToArea(area.id)}
                                >
                                    <Frame size={14} />
                                    <span>{area.metadata?.title || 'Project Area'}</span>
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
                                    data-tooltip="Move to Canvas"
                                    data-tooltip-pos="top"
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
                                    data-tooltip="Move to Inbox"
                                    data-tooltip-pos="top"
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

            <button className={`${styles.actionBtn} ${styles.organizeBtn}`} onClick={layoutSelectedItems} data-tooltip="Clean up layout" data-tooltip-pos="top">
                <Sparkles size={18} />
                <span className={styles.btnText}>Organize</span>
            </button>

            <div className={styles.divider} />

            <button className={`${styles.actionBtn} ${styles.archiveBtn}`} onClick={archiveSelected} data-tooltip="Archive Selection" data-tooltip-pos="top">
                <Archive size={18} />
            </button>

            <button
                className={`${styles.actionBtn} ${styles.delete} ${isDeleting ? styles.confirmDelete : ''}`}
                onClick={handleDelete}
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={18} />}
            </button>

            <button className={styles.closeBtn} onClick={clearSelection} data-tooltip="Clear selection" data-tooltip-pos="top">
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

