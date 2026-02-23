"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './ActionMoveMenu.module.css';
import { MoveRight, Folder, DoorClosed, Frame, CornerLeftUp } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import clsx from 'clsx';

interface ActionMoveMenuProps {
    itemId: string;
    isFolder?: boolean;
}

export default function ActionMoveMenu({ itemId, isFolder }: ActionMoveMenuProps) {
    const { items, folders, updateItemContent, currentRoomId, roomHistory } = useItemsStore();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMoveToFolder = (folderId: string) => {
        if (isFolder) {
            useItemsStore.getState().updateFolderContent?.(itemId, { parent_id: folderId, room_id: null });
        } else {
            updateItemContent(itemId, { folder_id: folderId, room_id: null, status: 'active' });
        }
        setIsOpen(false);
    };

    const handleMoveToRoom = (roomId: string | null) => {
        // Position logic:
        // 1. If we are moving UP to a parent/grandparent, place it beside the room portal we just left.
        // 2. Otherwise, place it at (200, 0) - the default entrance spot.
        let tx = 200;
        let ty = 0;

        // If moving UP, find the room item we are leaving in that space
        if (roomId !== currentRoomId) {
            // Check if roomId is in ancestors
            const targetAncestorIndex = roomHistory.findIndex(h => h.id === roomId);
            if (targetAncestorIndex !== -1) {
                // The room we are currently IN (or its representative in the target room)
                // is the one at index targetAncestorIndex + 1 in the full path [Canvas, A, B, C]
                // Full effective path = [...roomHistory, {id: currentRoomId, title: currentRoomTitle}]
                const fullPath = [...roomHistory, { id: currentRoomId, title: '' }];
                const roomLeaving = fullPath[targetAncestorIndex + 1];

                if (roomLeaving) {
                    const roomItem = items.find(i => i.id === roomLeaving.id);
                    if (roomItem) {
                        tx = roomItem.position_x + 240;
                        ty = roomItem.position_y;
                    }
                }
            }
        }

        if (isFolder) {
            useItemsStore.getState().updateFolderContent?.(itemId, {
                room_id: roomId,
                parent_id: null,
                position_x: tx,
                position_y: ty
            });
        } else {
            updateItemContent(itemId, {
                room_id: roomId,
                folder_id: null,
                status: 'active',
                position_x: tx,
                position_y: ty
            });
        }
        setIsOpen(false);
    };

    const handleMoveToArea = (areaId: string) => {
        const area = items.find(i => i.id === areaId);
        if (!area) return;

        const centerX = area.position_x + (area.metadata?.width || 300) / 2;
        const centerY = area.position_y + (area.metadata?.height || 200) / 2;
        const targetRoomId = area.room_id || null;

        if (isFolder) {
            useItemsStore.getState().updateFolderContent?.(itemId, {
                position_x: centerX - 140,
                position_y: centerY - 60,
                room_id: targetRoomId,
                parent_id: null
            });
        } else {
            updateItemContent(itemId, {
                position_x: centerX - 140,
                position_y: centerY - 60,
                room_id: targetRoomId,
                folder_id: null,
                status: 'active'
            });
        }
        setIsOpen(false);
    };

    const handleMoveOut = () => {
        const currentRoom = items.find(i => i.id === currentRoomId);
        const parentRoomId = currentRoom?.room_id || null;
        handleMoveToRoom(parentRoomId);
    };

    const mindrooms = items.filter(i => i.type === 'room' && i.id !== itemId && i.id !== currentRoomId);
    const projectAreas = items.filter(i => i.type === 'project');
    const filteredFolders = folders.filter(f => f.id !== itemId); // Don't allow moving a folder into itself

    const isInsideRoom = !!currentRoomId;

    // ancestors[0] will be the Parent, ancestors[1] the GrandParent, etc.
    const ancestors = [...roomHistory].reverse();

    return (
        <div className={styles.container} ref={menuRef}>
            <button
                className={clsx(styles.actionBtn, isOpen && styles.activeBtn)}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                onPointerDown={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                data-tooltip="Move to..."
                data-tooltip-pos="bottom"
            >
                <MoveRight size={12} />
            </button>

            {isOpen && (
                <div
                    className={styles.moveMenu}
                    onPointerDown={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onWheel={e => e.stopPropagation()}
                >
                    <div className={styles.menuHeader}>Move to...</div>
                    <div className={styles.folderList} onWheel={e => e.stopPropagation()}>
                        {isInsideRoom && (
                            <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: 8, paddingBottom: 4 }}>
                                {ancestors.map((anc, index) => {
                                    const isImmediateParent = index === 0;
                                    const Icon = anc.id === null ? Frame : (isImmediateParent ? CornerLeftUp : DoorClosed);

                                    return (
                                        <button
                                            key={anc.id || 'canvas'}
                                            className={styles.menuOption}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveToRoom(anc.id);
                                            }}
                                            style={{
                                                color: 'var(--accent)',
                                                opacity: 1 - (index * 0.15),
                                                paddingLeft: 12 + (index * 4)
                                            }}
                                        >
                                            <Icon size={14} style={!isImmediateParent && anc.id !== null ? { transform: 'rotate(180deg)' } : {}} />
                                            <span>Move to {anc.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {filteredFolders.length > 0 && <div className={styles.menuGroupTitle}>Folders</div>}
                        {filteredFolders.map(folder => (
                            <button
                                key={folder.id}
                                className={styles.menuOption}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToFolder(folder.id);
                                }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToRoom(room.id);
                                }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToArea(area.id);
                                }}
                            >
                                <Frame size={14} />
                                <span>{area.metadata?.title || 'Project Area'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
