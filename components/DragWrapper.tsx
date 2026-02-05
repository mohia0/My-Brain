"use client";
// Force sync DragWrapper

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
        const currentScale = useCanvasStore.getState().scale;
        const currentSelectedIds = useItemsStore.getState().selectedIds;

        // If dragging an item that is part of selection, move others too
        if (currentSelectedIds.includes(active.id as string)) {
            currentSelectedIds.forEach(id => {
                if (id === active.id) return; // dnd-kit handles this one via Overlay (visually)

                // Try finding item or folder
                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = `translate3d(${delta.x / currentScale}px, ${delta.y / currentScale}px, 0)`;
                    el.style.zIndex = '1000'; // Lift up while dragging
                }
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta, over } = event;
        const currentScale = useCanvasStore.getState().scale;
        const currentSelectedIds = useItemsStore.getState().selectedIds;

        // Clear manual transforms
        if (currentSelectedIds.includes(active.id as string)) {
            currentSelectedIds.forEach(id => {
                if (id === active.id) return;
                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = '';
                    el.style.zIndex = '';
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

            const canvasPos = useCanvasStore.getState().position;
            const dropX = (active.rect.current!.translated!.left - canvasPos.x) / currentScale;
            const dropY = (active.rect.current!.translated!.top - canvasPos.y) / currentScale;

            updateItemContent(active.id as string, {
                position_x: dropX,
                position_y: dropY,
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
        const dx = delta.x / currentScale;
        const dy = delta.y / currentScale;

        const updates: { id: string, type: 'item' | 'folder', x: number, y: number }[] = [];

        // Check if the dragged item is part of the current selection
        if (currentSelectedIds.includes(active.id as string)) {
            currentSelectedIds.forEach(id => {
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

        // ONLY use overlay for items coming from the Inbox
        // Canvas items should move their original elements to maintain look & group sync
        if (activeItem.origin === 'inbox') {
            return (
                <div style={{ width: 280, pointerEvents: 'none' }}>
                    <InboxItem item={activeItem} isOverlay />
                </div>
            );
        }

        return null;
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
            <DragOverlay dropAnimation={null}>
                {activeId ? renderOverlayItem() : null}
            </DragOverlay>
        </DndContext>
    );
}
