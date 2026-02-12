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
    const { scale, currentTool } = useCanvasStore();
    const { updateItemContent, updatePositions, items, folders, selectedIds } = useItemsStore();
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [draggedProjectContents, setDraggedProjectContents] = useState<string[]>([]);

    const isHandTool = currentTool === 'hand';

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: isHandTool ? { distance: 999999 } : {
                distance: 3,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: isHandTool ? { distance: 999999 } : undefined
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id;
        const data = event.active.data.current as any;

        setActiveId(id);
        setActiveItem(data);

        // If dragging a Project Area, identify contained items
        if (data.type === 'project') {
            const area = items.find(i => i.id === id);
            if (area) {
                const areaLeft = area.position_x;
                const areaRight = area.position_x + (area.metadata.width || 300);
                const areaTop = area.position_y;
                const areaBottom = area.position_y + (area.metadata.height || 200);

                const contained = items.filter(i => {
                    if (i.id === id || i.folder_id || i.type === 'project') return false;

                    // Simple Overlap Check
                    const itemW = i.metadata?.width || 250;
                    const itemH = i.metadata?.height || 100;
                    const iLeft = i.position_x;
                    const iRight = i.position_x + itemW;
                    const iTop = i.position_y;
                    const iBottom = i.position_y + itemH;

                    return (areaLeft < iRight && areaRight > iLeft && areaTop < iBottom && areaBottom > iTop);
                }).map(i => i.id);

                const containedFolders = folders.filter(f => {
                    if (f.parent_id) return false;
                    const fW = 200;
                    const fH = 100;
                    const fLeft = f.position_x;
                    const fRight = f.position_x + fW;
                    const fTop = f.position_y;
                    const fBottom = f.position_y + fH;

                    return (areaLeft < fRight && areaRight > fLeft && areaTop < fBottom && areaBottom > fTop);
                }).map(f => f.id);

                setDraggedProjectContents([...contained, ...containedFolders]);
            }
        } else {
            setDraggedProjectContents([]);
        }
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

        // If dragging a Project Area, move contained items
        if (active.data.current?.type === 'project') {
            draggedProjectContents.forEach(id => {
                // Prevent double-movement: If item is selected, it's already moved by the block above
                if (currentSelectedIds.includes(id as string)) return;

                const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
                if (el) {
                    el.style.transform = `translate3d(${delta.x / currentScale}px, ${delta.y / currentScale}px, 0)`;
                    el.style.zIndex = '1000'; // Lift up while dragging to match project area
                }
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta, over } = event;
        const currentScale = useCanvasStore.getState().scale;
        const currentSelectedIds = useItemsStore.getState().selectedIds;

        // Clear manual transforms for Selection
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

        // Clear manual transforms for Project Contents
        if (active.data.current?.type === 'project') {
            draggedProjectContents.forEach(id => {
                if (currentSelectedIds.includes(id as string)) return;
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
            updateItemContent(active.id as string, {
                folder_id: over.id as string,
                status: 'active'
            });
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

        // 4. Handle Dropping ONTO Archive Zone
        if (over && over.id === 'archive-zone') {
            const currentSelectedIds = useItemsStore.getState().selectedIds;
            if (currentSelectedIds.includes(active.id as string)) {
                useItemsStore.getState().archiveSelected();
            } else if (activeData.type === 'folder') {
                useItemsStore.getState().archiveFolder(active.id as string);
            } else {
                useItemsStore.getState().archiveItem(active.id as string);
            }
            return;
        }

        // 5. Handle Normal Canvas Drag
        const dx = delta.x / currentScale;
        const dy = delta.y / currentScale;

        const updates: { id: string, type: 'item' | 'folder', x: number, y: number }[] = [];
        const PADDING = 20;

        // Canvas Boundaries (must match Canvas.tsx)
        const CANVAS_WIDTH = 10000;
        const CANVAS_HEIGHT = 5000;
        const HALF_WIDTH = CANVAS_WIDTH / 2;
        const HALF_HEIGHT = CANVAS_HEIGHT / 2;

        const calculateConstrainedPosition = (x: number, y: number, w: number, h: number) => {
            const projectAreas = items.filter(i => i.type === 'project');

            // 1. Check for Primary Containment (Project Areas)
            let primaryContainer = null;
            let maxOverlap = 0;
            const itemArea = w * h;
            let finalX = x;
            let finalY = y;

            for (const project of projectAreas) {
                const px = project.position_x;
                const py = project.position_y;
                const pw = project.metadata?.width || 300;
                const ph = project.metadata?.height || 200;

                const interX = Math.max(x, px);
                const interY = Math.max(y, py);
                const interR = Math.min(x + w, px + pw);
                const interB = Math.min(y + h, py + ph);

                if (interX < interR && interY < interB) {
                    const overlap = (interR - interX) * (interB - interY);
                    if (overlap > maxOverlap) {
                        maxOverlap = overlap;
                        primaryContainer = project;
                    }
                }
            }

            // 2. Snap INSIDE if mostly contained
            if (primaryContainer && maxOverlap > itemArea * 0.5) {
                const px = primaryContainer.position_x;
                const py = primaryContainer.position_y;
                const pw = primaryContainer.metadata?.width || 300;
                const ph = primaryContainer.metadata?.height || 200;

                const minX = px + PADDING;
                const maxX = px + pw - PADDING - w;
                const minY = py + PADDING;
                const maxY = py + ph - PADDING - h;

                if (minX <= maxX) finalX = Math.max(minX, Math.min(finalX, maxX));
                if (minY <= maxY) finalY = Math.max(minY, Math.min(finalY, maxY));
            } else {
                // 3. Snap OUTSIDE (Padding Zone Enforced)
                for (const project of projectAreas) {
                    const px = project.position_x;
                    const py = project.position_y;
                    const pw = project.metadata?.width || 300;
                    const ph = project.metadata?.height || 200;

                    const fLeft = px - PADDING;
                    const fTop = py - PADDING;
                    const fRight = px + pw + PADDING;
                    const fBottom = py + ph + PADDING;

                    const iLeft = finalX;
                    const iTop = finalY;
                    const iRight = finalX + w;
                    const iBottom = finalY + h;

                    if (iRight > fLeft && iLeft < fRight && iBottom > fTop && iTop < fBottom) {
                        const toLeft = iRight - fLeft;
                        const toRight = fRight - iLeft;
                        const toTop = iBottom - fTop;
                        const toBottom = fBottom - iTop;

                        const minDest = Math.min(toLeft, toRight, toTop, toBottom);

                        if (minDest === toLeft) finalX -= toLeft;
                        else if (minDest === toRight) finalX += toRight;
                        else if (minDest === toTop) finalY -= toTop;
                        else if (minDest === toBottom) finalY += toBottom;
                    }
                }
            }

            // 4. Global Canvas Boundaries
            const canvasMinX = -HALF_WIDTH + PADDING;
            const canvasMaxX = HALF_WIDTH - PADDING - w;
            const canvasMinY = -HALF_HEIGHT + PADDING;
            const canvasMaxY = HALF_HEIGHT - PADDING - h;

            // Ensure we don't snap out if item is larger than canvas (unlikely but safe)
            if (canvasMinX <= canvasMaxX) finalX = Math.max(canvasMinX, Math.min(finalX, canvasMaxX));
            if (canvasMinY <= canvasMaxY) finalY = Math.max(canvasMinY, Math.min(finalY, canvasMaxY));

            return { x: finalX, y: finalY };
        };

        const getElementDims = (id: string, isFolder: boolean) => {
            const el = document.getElementById(isFolder ? `draggable-folder-${id}` : `draggable-item-${id}`);
            if (el) return { w: el.offsetWidth, h: el.offsetHeight };
            return { w: isFolder ? 200 : 280, h: 100 }; // Fallbacks
        };

        // Check if the dragged item is part of the current selection
        if (currentSelectedIds.includes(active.id as string)) {
            currentSelectedIds.forEach(id => {
                const item = items.find(i => i.id === id);
                if (item) {
                    const dims = getElementDims(id, false);
                    const { x, y } = calculateConstrainedPosition(item.position_x + dx, item.position_y + dy, dims.w, dims.h);
                    updates.push({ id, type: 'item', x, y });
                    return;
                }
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    const dims = getElementDims(id, true);
                    const { x, y } = calculateConstrainedPosition(folder.position_x + dx, folder.position_y + dy, dims.w, dims.h);
                    updates.push({ id, type: 'folder', x, y });
                }
            });
        } else if (activeData.type === 'project') {
            // Move Project Area
            const newX = activeData.position_x + dx;
            const newY = activeData.position_y + dy;

            // Constrain project area itself to canvas
            const pw = activeData.metadata?.width || 300;
            const ph = activeData.metadata?.height || 200;
            const canvasMinX = -HALF_WIDTH + PADDING;
            const canvasMaxX = HALF_WIDTH - PADDING - pw;
            const canvasMinY = -HALF_HEIGHT + PADDING;
            const canvasMaxY = HALF_HEIGHT - PADDING - ph;

            let safeX = newX;
            let safeY = newY;
            if (canvasMinX <= canvasMaxX) safeX = Math.max(canvasMinX, Math.min(safeX, canvasMaxX));
            if (canvasMinY <= canvasMaxY) safeY = Math.max(canvasMinY, Math.min(safeY, canvasMaxY));

            updates.push({ id: active.id as string, type: 'item', x: safeX, y: safeY });

            // Calculate shift for contained items
            const shiftX = safeX - activeData.position_x;
            const shiftY = safeY - activeData.position_y;

            // Move Contained Items
            draggedProjectContents.forEach(id => {
                if (currentSelectedIds.includes(id as string)) return; // Already moved by selection block
                const item = items.find(i => i.id === id);
                if (item) {
                    updates.push({ id, type: 'item', x: item.position_x + shiftX, y: item.position_y + shiftY });
                    return;
                }
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    updates.push({ id, type: 'folder', x: folder.position_x + shiftX, y: folder.position_y + shiftY });
                }
            });
        } else {
            if (activeData.type === 'folder') {
                const dims = getElementDims(active.id as string, true);
                const { x, y } = calculateConstrainedPosition(activeData.position_x + dx, activeData.position_y + dy, dims.w, dims.h);
                updates.push({ id: active.id as string, type: 'folder', x, y });
            } else {
                const dims = getElementDims(active.id as string, false);
                const { x, y } = calculateConstrainedPosition(activeData.position_x + dx, activeData.position_y + dy, dims.w, dims.h);
                updates.push({ id: active.id as string, type: 'item', x, y });
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
