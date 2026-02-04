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
    DragMoveEvent
} from '@dnd-kit/core';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import InboxItem from './Inbox/InboxItem';

export default function DragWrapper({ children }: { children: React.ReactNode }) {
    const { scale } = useCanvasStore();
    const { updateItemPosition, updateItemContent, updateFolderPosition, items, folders } = useItemsStore();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<any>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        const data = event.active.data.current as any;
        setActiveItem(data);
    };

    const handleDragMove = (event: DragMoveEvent) => {
        const { active, delta } = event;
        const { selectedIds } = useItemsStore.getState();

        // If dragging an item that is part of selection, move others too
        if (selectedIds.includes(active.id as string)) {
            selectedIds.forEach(id => {
                if (id === active.id) return; // dnd-kit handles this one

                // Try finding item or folder
                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = `translate3d(${delta.x}px, ${delta.y}px, 0)`;
                }
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        setActiveItem(null);

        const { active, delta, over } = event;

        // Clear manual transforms
        const { selectedIds } = useItemsStore.getState();
        if (selectedIds.includes(active.id as string)) {
            selectedIds.forEach(id => {
                if (id === active.id) return;
                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = '';
                }
            });
        }

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

        // Check if the dragged item is part of the current selection
        if (selectedIds.includes(active.id as string)) {
            selectedIds.forEach(id => {
                const item = items.find(i => i.id === id);
                if (item) {
                    updateItemPosition(id, item.position_x + dx, item.position_y + dy);
                    return;
                }
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    updateFolderPosition(id, folder.position_x + dx, folder.position_y + dy);
                }
            });
        } else {
            if (activeData.type === 'folder') {
                const newX = activeData.position_x + dx;
                const newY = activeData.position_y + dy;
                updateFolderPosition(active.id as string, newX, newY);
            } else {
                const newX = activeData.position_x + dx;
                const newY = activeData.position_y + dy;
                updateItemPosition(active.id as string, newX, newY);
            }
        }
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
            {children}
            <DragOverlay dropAnimation={null}>
                {activeId && activeItem?.origin === 'inbox' ? (
                    <div style={{ width: 280 }}>
                        <InboxItem item={activeItem} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
