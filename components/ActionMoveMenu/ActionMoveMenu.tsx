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
    const { items, folders, updateItemContent, currentRoomId } = useItemsStore();
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

    const handleMoveToRoom = (roomId: string) => {
        if (isFolder) {
            useItemsStore.getState().updateFolderContent?.(itemId, { room_id: roomId, parent_id: null });
        } else {
            updateItemContent(itemId, { room_id: roomId, folder_id: null, status: 'active' });
        }
        setIsOpen(false);
    };

    const handleMoveToArea = (areaId: string) => {
        const area = items.find(i => i.id === areaId);
        if (!area) return;

        const centerX = area.position_x + (area.metadata?.width || 300) / 2;
        const centerY = area.position_y + (area.metadata?.height || 200) / 2;

        if (isFolder) {
            useItemsStore.getState().updateFolderContent?.(itemId, {
                position_x: centerX - 140,
                position_y: centerY - 60,
                room_id: null,
                parent_id: null
            });
        } else {
            updateItemContent(itemId, {
                position_x: centerX - 140,
                position_y: centerY - 60,
                room_id: null,
                folder_id: null,
                status: 'active'
            });
        }
        setIsOpen(false);
    };

    const handleMoveOut = () => {
        const parentRoomId = currentRoomId ? items.find(i => i.id === currentRoomId)?.room_id || null : null;

        if (isFolder) {
            useItemsStore.getState().updateFolderContent?.(itemId, { room_id: parentRoomId, parent_id: null });
        } else {
            updateItemContent(itemId, { room_id: parentRoomId, folder_id: null, status: 'active' });
        }
        setIsOpen(false);
    };

    const mindrooms = items.filter(i => i.type === 'room');
    const projectAreas = items.filter(i => i.type === 'project');

    const isInsideRoom = !!currentRoomId;
    const parentRoomId = currentRoomId ? items.find(i => i.id === currentRoomId)?.room_id : null;
    let moveOutLabel = 'Move to Main Canvas';
    if (parentRoomId) {
        const parentRoomName = items.find(i => i.id === parentRoomId)?.metadata?.title || 'Room';
        moveOutLabel = `Move to ${parentRoomName}`;
    }

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
                <div className={styles.moveMenu} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToFolder(folder.id);
                                }}
                            >
                                <Folder size={14} />
                                <span>{folder.name}</span>
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
