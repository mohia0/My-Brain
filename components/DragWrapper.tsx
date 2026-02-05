"use client";

import React, { useState } from 'react';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    DragMoveEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    UniqueIdentifier,
    pointerWithin
} from '@dnd-kit/core';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import InboxItem from './Inbox/InboxItem';
import { ItemCardView } from './Grid/ItemCard';
import { FolderItemView } from './Grid/FolderItem';

// Professional drop animation configuration
const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.4',
            },
        },
    }),
};

export default function DragWrapper({ children }: { children: React.ReactNode }) {
    const { scale } = useCanvasStore();
    const { updateItemContent, updatePositions, items, folders, selectedIds } = useItemsStore();
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeItem, setActiveItem] = useState<any>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 3,
            },
        }),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
        const data = event.active.data.current as any;
        setActiveItem(data);
    };

    const handleDragMove = (event: DragMoveEvent) => {
        const { active, delta } = event;

        // If dragging an item that is part of selection, move others too
        if (selectedIds.includes(active.id as string)) {
            selectedIds.forEach(id => {
                if (id === active.id) return; // dnd-kit handles this one via Overlay (visually)

                // Try finding item or folder
                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = `translate3d(${delta.x / scale}px, ${delta.y / scale}px, 0)`;
                }
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta, over } = event;

        // Clear manual transforms
        if (selectedIds.includes(active.id as string)) {
            selectedIds.forEach(id => {
                if (id === active.id) return;
                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = '';
                }
            });
        }

        setActiveId(null);
        setActiveItem(null);

        const activeData = active.data.current as any;
        if (!activeData) return;

        // 1. Handle dropping an item INTO a folder
        if (activeData.type !== 'folder' && over && over.data.current?.type === 'folder' && activeData.type !== 'inbox-item') {
            updateItemContent(active.id as string, { folder_id: over.id as string });
            return;
        }

        // 2. Handle Dragging FROM Inbox
        if (activeData.origin === 'inbox') {
            if (over && over.id === 'inbox-area') {
                return;
            }

            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const cx = (viewportW / 2 - useCanvasStore.getState().position.x) / scale;
            const cy = (viewportH / 2 - useCanvasStore.getState().position.y) / scale;

            updateItemContent(active.id as string, {
                position_x: cx + (delta.x / scale),
                position_y: cy + (delta.y / scale),
                status: 'active'
            });
            return;
        }

        // 3. Handle Dropping ONTO Inbox
        if (over && over.id === 'inbox-area') {
            updateItemContent(active.id as string, { status: 'inbox' });
            return;
        }

        // 4. Handle Normal Canvas Drag
        const dx = delta.x / scale;
        const dy = delta.y / scale;

        const updates: { id: string, type: 'item' | 'folder', x: number, y: number }[] = [];

        // Check if the dragged item is part of the current selection
        if (selectedIds.includes(active.id as string)) {
            selectedIds.forEach(id => {
                const item = items.find(i => i.id === id);
                if (item) {
                    updates.push({ id, type: 'item', x: item.position_x + dx, y: item.position_y + dy });
                    return;
                }
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    updates.push({ id, type: 'folder', x: folder.position_x + dx, y: folder.position_y + dy });
                }
            });
        } else {
            if (activeData.type === 'folder') {
                const newX = activeData.position_x + dx;
                const newY = activeData.position_y + dy;
                updates.push({ id: active.id as string, type: 'folder', x: newX, y: newY });
            } else {
                const newX = activeData.position_x + dx;
                const newY = activeData.position_y + dy;
                updates.push({ id: active.id as string, type: 'item', x: newX, y: newY });
            }
        }

        if (updates.length > 0) {
            updatePositions(updates);
        }
    };

    const renderOverlayItem = () => {
        if (!activeItem) return null;

        if (activeItem.origin === 'inbox') {
            return (
                <div style={{ width: 280 }}>
                    <InboxItem item={activeItem} isOverlay />
                </div>
            );
        }

        if (activeItem.type === 'folder') {
            const folderItems = items.filter(i => i.folder_id === activeItem.id);
            return (
                <FolderItemView
                    folder={activeItem}
                    folderItems={folderItems}
                    isOverlay
                    isSelected={selectedIds.includes(activeItem.id)}
                    onDelete={() => { }}
                    onDuplicate={() => { }}
                    onClick={() => { }}
                />
            );
        }

        // Default to ItemCard
        return (
            <ItemCardView
                item={activeItem}
                isOverlay
                isSelected={selectedIds.includes(activeItem.id)}
                onDelete={() => { }}
                onDuplicate={() => { }}
                onClick={() => { }}
            />
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {children}
            <DragOverlay dropAnimation={dropAnimationConfig}>
                {activeId ? renderOverlayItem() : null}
            </DragOverlay>
        </DndContext>
    );
}
