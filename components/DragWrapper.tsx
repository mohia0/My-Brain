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
    pointerWithin,
    Modifier
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
    const [snapLines, setSnapLines] = useState<{ vertical: number | null, horizontal: number | null }>({ vertical: null, horizontal: null });
    const draggedProjectContentsRef = React.useRef<string[]>([]);
    const lastSnapDeltaRef = React.useRef<{ x: number, y: number }>({ x: 0, y: 0 });

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

    const getElementRect = (id: string, isFolder: boolean) => {
        const el = document.getElementById(isFolder ? `draggable-folder-${id}` : `draggable-item-${id}`);
        if (el) {
            const rect = el.getBoundingClientRect();
            // We need canvas-relative coordinates, but getBoundingClientRect is viewport.
            // However, for pure dimension/offset checks against other items in same space, we can rely on store positions.
            return { w: el.offsetWidth, h: el.offsetHeight };
        }
        return { w: isFolder ? 200 : 280, h: 100 };
    };

    const snapToGrid: Modifier = ({ transform, active, draggingNodeRect }) => {
        const { scale, isSnappingEnabled } = useCanvasStore.getState();
        const { items, folders, selectedIds } = useItemsStore.getState();

        if (!isSnappingEnabled) {
            // Check if we need to clear guides (only if they are currently set)
            // Use rAF to avoid "setState during render" error
            requestAnimationFrame(() => {
                setSnapLines(prev => {
                    if (prev.vertical === null && prev.horizontal === null) return prev;
                    return { vertical: null, horizontal: null };
                });
            });
            lastSnapDeltaRef.current = { x: transform.x, y: transform.y };
            return transform;
        }

        // 1. Identify Subject
        if (!active) return transform;
        const activeId = active.id as string;
        const activeItemObj = items.find(i => i.id === activeId);
        const activeFolderObj = folders.find(f => f.id === activeId);
        const subject = activeItemObj || activeFolderObj;

        if (!subject || !draggingNodeRect) {
            requestAnimationFrame(() => {
                setSnapLines(prev => {
                    if (prev.vertical === null && prev.horizontal === null) return prev;
                    return { vertical: null, horizontal: null };
                });
            });
            lastSnapDeltaRef.current = { x: transform.x, y: transform.y };
            return transform;
        }

        // 2. Setup Coordinates (Canvas Space)
        const isFolder = !!activeFolderObj;
        // The transform is the DELTA. The initial position is activeItemObj.position_x.
        // We want to snap the FINAL position.
        const currentX = subject.position_x + (transform.x / scale);
        const currentY = subject.position_y + (transform.y / scale);

        const dims = getElementRect(activeId, isFolder);
        const w = dims.w;
        const h = dims.h;

        // 3. Find Candidates
        const movingIds = selectedIds.includes(activeId) ? selectedIds : [activeId];
        const ignoreIds = new Set([...movingIds, ...draggedProjectContentsRef.current]);

        const candidateRects: { x: number, y: number, w: number, h: number }[] = [];

        items.forEach(i => {
            if (ignoreIds.has(i.id) || i.type === 'project') return;
            // Optimistic: Use store positions (fastest). 
            // Ideally we'd measure DOM for exactness, but store is source of truth.
            // For width/height, we might want defaults or store metadata if available.
            let w = i.metadata?.width || 250;
            let h = i.metadata?.height || 100;
            // Try to get real dim if available (mounted)
            const el = document.getElementById(`draggable-item-${i.id}`);
            if (el) { w = el.offsetWidth; h = el.offsetHeight; }

            candidateRects.push({ x: i.position_x, y: i.position_y, w, h });
        });

        folders.forEach(f => {
            if (ignoreIds.has(f.id)) return;
            const el = document.getElementById(`draggable-folder-${f.id}`);
            let w = 200; let h = 100;
            if (el) { w = el.offsetWidth; h = el.offsetHeight; }
            candidateRects.push({ x: f.position_x, y: f.position_y, w, h });
        });

        // 4. Calculate Snap
        const SNAP_THRESHOLD = 20 / scale; // Visual pixels
        const GAP = 20;

        let snappedX = currentX;
        let snappedY = currentY;
        let bestDiffX = SNAP_THRESHOLD;
        let bestDiffY = SNAP_THRESHOLD;
        let guideX: number | null = null;
        let guideY: number | null = null;

        // Center Helper
        const centerX = currentX + w / 2;
        const centerY = currentY + h / 2;

        candidateRects.forEach(rect => {
            const rLeft = rect.x;
            const rRight = rect.x + rect.w;
            const rCenter = rect.x + rect.w / 2;
            const rTop = rect.y;
            const rBottom = rect.y + rect.h;
            const rMid = rect.y + rect.h / 2;

            // X Snapping
            // Left-Left
            if (Math.abs(currentX - rLeft) < bestDiffX) { snappedX = rLeft; bestDiffX = Math.abs(currentX - rLeft); guideX = rLeft; }
            // Right-Right
            if (Math.abs((currentX + w) - rRight) < bestDiffX) { snappedX = rRight - w; bestDiffX = Math.abs((currentX + w) - rRight); guideX = rRight; }
            // Left-Right (Adjacency)
            if (Math.abs(currentX - (rRight + GAP)) < bestDiffX) { snappedX = rRight + GAP; bestDiffX = Math.abs(currentX - (rRight + GAP)); guideX = rRight + GAP; }
            // Right-Left (Adjacency)
            if (Math.abs((currentX + w) - (rLeft - GAP)) < bestDiffX) { snappedX = rLeft - GAP - w; bestDiffX = Math.abs((currentX + w) - (rLeft - GAP)); guideX = rLeft - GAP; }
            // Center-Center
            if (Math.abs(centerX - rCenter) < bestDiffX) { snappedX = rCenter - w / 2; bestDiffX = Math.abs(centerX - rCenter); guideX = rCenter; }

            // Y Snapping
            // Top-Top
            if (Math.abs(currentY - rTop) < bestDiffY) { snappedY = rTop; bestDiffY = Math.abs(currentY - rTop); guideY = rTop; }
            // Bottom-Bottom
            if (Math.abs((currentY + h) - rBottom) < bestDiffY) { snappedY = rBottom - h; bestDiffY = Math.abs((currentY + h) - rBottom); guideY = rBottom; }
            // Top-Bottom (Adjacency)
            if (Math.abs(currentY - (rBottom + GAP)) < bestDiffY) { snappedY = rBottom + GAP; bestDiffY = Math.abs(currentY - (rBottom + GAP)); guideY = rBottom + GAP; }
            // Bottom-Top (Adjacency)
            if (Math.abs((currentY + h) - (rTop - GAP)) < bestDiffY) { snappedY = rTop - GAP - h; bestDiffY = Math.abs((currentY + h) - (rTop - GAP)); guideY = rTop - GAP; }
            // Center-Center
            if (Math.abs(centerY - rMid) < bestDiffY) { snappedY = rMid - h / 2; bestDiffY = Math.abs(centerY - rMid); guideY = rMid; }
        });

        // 5. Update State (Throttled effect essentially since this runs frame-by-frame)
        // Use requestAnimationFrame to avoid "setState during render" error
        requestAnimationFrame(() => {
            // Check current value to avoid unnecessary re-renders (and loops)
            // leveraging the closure to read the latest 'snapLines' state is risky if closure is stale,
            // but since DragWrapper re-renders on state change, this function is recreated with fresh scope.
            setSnapLines(prev => {
                if (prev.vertical === guideX && prev.horizontal === guideY) return prev;
                return { vertical: guideX, horizontal: guideY };
            });
        });

        // 6. Return Modified Transform (Delta)
        const finalDeltaX = (snappedX - subject.position_x) * scale;
        const finalDeltaY = (snappedY - subject.position_y) * scale;

        // Save for use in dragMove/dragEnd
        lastSnapDeltaRef.current = { x: finalDeltaX, y: finalDeltaY };

        return {
            ...transform,
            x: finalDeltaX,
            y: finalDeltaY
        };
    };

    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id;
        const data = event.active.data.current as any;

        setActiveId(id);
        setActiveItem(data);

        const state = useItemsStore.getState();
        const currentSelectedIds = state.selectedIds;
        const freshItems = state.items;
        const freshFolders = state.folders;

        // If the dragged item is PART of the selection, drag the whole selection
        // If it's NOT selected (clicked outside selection), just drag that item (and clear selection elsewhere likely)
        // But DndKit start happens before onClick clear usually. 
        // For project areas, we want to treat them as containers.

        const isSelected = currentSelectedIds.includes(id as string);
        const dragIds = isSelected ? currentSelectedIds : [id as string];

        const allContainedIds: string[] = [];

        // Find contents for ALL dragged project areas
        dragIds.forEach(dragId => {
            const item = freshItems.find(i => i.id === dragId);
            if (item && item.type === 'project') {
                const areaLeft = item.position_x;
                const areaRight = item.position_x + (item.metadata?.width || 300);
                const areaTop = item.position_y;
                const areaBottom = item.position_y + (item.metadata?.height || 200);

                // Find items inside this project area
                const contained = freshItems.filter(i => {
                    if (i.id === item.id || i.folder_id || i.type === 'project') return false;

                    // Get actual dimensions if possible
                    let itemW = i.metadata?.width || 250;
                    let itemH = i.metadata?.height || 100;
                    const el = document.getElementById(`draggable-item-${i.id}`);
                    if (el) {
                        itemW = el.offsetWidth;
                        itemH = el.offsetHeight;
                    } else if (i.type === 'room') {
                        itemW = 220;
                        itemH = 220;
                    }

                    return (areaLeft < i.position_x + itemW && areaRight > i.position_x && areaTop < i.position_y + itemH && areaBottom > i.position_y);
                }).map(i => i.id);

                // Find folders inside this project area
                const containedFolders = freshFolders.filter(f => {
                    if (f.parent_id) return false;

                    let fW = 200;
                    let fH = 100;
                    const el = document.getElementById(`draggable-folder-${f.id}`);
                    if (el) {
                        fW = el.offsetWidth;
                        fH = el.offsetHeight;
                    }

                    return (areaLeft < f.position_x + fW && areaRight > f.position_x && areaTop < f.position_y + fH && areaBottom > f.position_y);
                }).map(f => f.id);

                allContainedIds.push(...contained, ...containedFolders);
            }
        });

        // Deduplicate and Force Set
        // Crucial: We must set this immediately so DragMove sees it on the very first frame
        const uniqueContained = [...new Set(allContainedIds)];
        draggedProjectContentsRef.current = uniqueContained;

        // CRITICAL FIX: If any contained items are currently selected, DESELECT them.
        // This forces them to be handled by the "Project Content Mover" logic (Loop 2), which is known to work reliably,
        // rather than the "Selected Item Mover" logic (Loop 1), which is failing for these items.
        // It also resolves the visual clutter ("double selection") complaint.
        const intersection = currentSelectedIds.filter(selId => uniqueContained.includes(selId));
        if (intersection.length > 0) {
            const newSelection = currentSelectedIds.filter(selId => !uniqueContained.includes(selId));
            state.setSelection(newSelection);
        }
    };

    const handleDragMove = (event: DragMoveEvent) => {
        const { active } = event;
        const currentScale = useCanvasStore.getState().scale;
        const currentSelectedIds = useItemsStore.getState().selectedIds;

        // Use the SNAPPED delta calculated by the modifier
        // We trust 'lastSnapDeltaRef' because 'snapToGrid' modifier runs just before this for the active frame (usually).
        // Even if slightly out of sync, it is better than recalculating.
        const delta = lastSnapDeltaRef.current;

        // Safety check: lastSnapDeltaRef might be stale if drag just started or switched? 
        // But dragMove implies we are dragging.

        const moveElement = (id: string) => {
            const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
            if (el) {
                // Apply visual transform manually to neighbors
                el.style.transform = `translate3d(${delta.x / currentScale}px, ${delta.y / currentScale}px, 0)`;
                el.style.zIndex = '1000';
            }
        };

        // Move Selected Items (except active one which dnd-kit moves via modifier)
        if (currentSelectedIds.includes(active.id as string)) {
            currentSelectedIds.forEach(id => {
                if (id === active.id) return;
                moveElement(id);
            });
        }

        // Move Contained Items
        if (draggedProjectContentsRef.current) {
            draggedProjectContentsRef.current.forEach(id => {
                if (currentSelectedIds.includes(id as string)) return;
                moveElement(id);
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const currentScale = useCanvasStore.getState().scale;
        const currentSelectedIds = useItemsStore.getState().selectedIds;

        // Use the final snapped delta
        const delta = lastSnapDeltaRef.current; // { x, y } in scaled pixels (screen deltas)

        // Clear guides
        setSnapLines({ vertical: null, horizontal: null });
        lastSnapDeltaRef.current = { x: 0, y: 0 };

        // Cleanup transforms
        const clearTransform = (id: string) => {
            const el = document.getElementById(`draggable-item-${id}`) || document.getElementById(`draggable-folder-${id}`);
            if (el) {
                el.style.transform = '';
                el.style.zIndex = '';
            }
        };

        if (currentSelectedIds.includes(active.id as string)) {
            currentSelectedIds.forEach(id => { if (id !== active.id) clearTransform(id); });
        }

        if (draggedProjectContentsRef.current) {
            draggedProjectContentsRef.current.forEach(id => {
                if (!currentSelectedIds.includes(id as string)) clearTransform(id);
            });
        }

        const draggedContents = draggedProjectContentsRef.current || [];
        draggedProjectContentsRef.current = []; // Reset

        setActiveId(null);
        setActiveItem(null);

        const activeData = active.data.current as any;
        if (!activeData) return;

        // 1. Handle dropping an item INTO a folder
        if (activeData.type !== 'folder' && over && over.data.current?.type === 'folder' && activeData.type !== 'inbox-item') {
            updateItemContent(active.id as string, {
                folder_id: over.id as string,
                status: 'active',
                room_id: over.data.current?.room_id || null
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
                status: 'active',
                room_id: useItemsStore.getState().currentRoomId || null
            });
            return;
        }

        // 3. Handle Dropping ONTO Inbox
        if (over && over.id === 'inbox-area') {
            // Prevent rooms and project areas from being moved to inbox
            if (activeData.type === 'project' || activeData.itemType === 'room' || activeData.type === 'room') {
                return;
            }

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
        // NOTE: We use 'delta' (which comes from lastSnapDeltaRef) for the position calculation
        // But we need to use it consistently. snapping logic already calculated finalDelta.
        // So we just apply it.
        let dx = delta.x / currentScale;
        let dy = delta.y / currentScale;

        // ... (existing logic for constrained position / project areas)
        // We still run project area constraints logic because snapping might have pushed it out?
        // OR we just trust the snap if it was a snap?
        // Let's run the standard constraint logic but with the snapped delta.

        const getElementDims = (id: string, isFolder: boolean) => {
            const el = document.getElementById(isFolder ? `draggable-folder-${id}` : `draggable-item-${id}`);
            if (el) return { w: el.offsetWidth, h: el.offsetHeight };
            return { w: isFolder ? 200 : 280, h: 100 }; // Fallbacks
        };

        const movingIds = currentSelectedIds.includes(active.id as string)
            ? currentSelectedIds
            : [active.id as string];

        // NO inline snapping logic here anymore. It's done in the modifier.

        const updates: { id: string, type: 'item' | 'folder', x: number, y: number }[] = [];
        const processedIds = new Set<string>();
        const PADDING = 20;

        // Canvas Boundaries (must match Canvas.tsx)
        // Canvas Boundaries (must match Canvas.tsx)
        const currentRoomId = useItemsStore.getState().currentRoomId;
        const isRoom = !!currentRoomId;
        const CANVAS_WIDTH = isRoom ? 5000 : 10000;
        const CANVAS_HEIGHT = isRoom ? 2500 : 5000;
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

            // 5. Room Back Button Exclusion Zone (only if inside a room)
            if (isRoom) {
                const backBtnRadius = 140;
                // A box around (0,0) simulating the Back Button
                const bLeft = -backBtnRadius;
                const bRight = backBtnRadius;
                const bTop = -backBtnRadius;
                const bBottom = backBtnRadius;

                const iLeft = finalX;
                const iTop = finalY;
                const iRight = finalX + w;
                const iBottom = finalY + h;

                // Check intersection
                if (iRight > bLeft && iLeft < bRight && iBottom > bTop && iTop < bBottom) {
                    // Push out to the closest edge of the exclusion zone
                    const toLeft = iRight - bLeft;
                    const toRight = bRight - iLeft;
                    const toTop = iBottom - bTop;
                    const toBottom = bBottom - iTop;

                    const minDest = Math.min(toLeft, toRight, toTop, toBottom);

                    if (minDest === toLeft) finalX -= toLeft;
                    else if (minDest === toRight) finalX += toRight;
                    else if (minDest === toTop) finalY -= toTop;
                    else if (minDest === toBottom) finalY += toBottom;
                }
            }

            // 6. Global Canvas Boundaries
            const canvasMinX = -HALF_WIDTH + PADDING;
            const canvasMaxX = HALF_WIDTH - PADDING - w;
            const canvasMinY = -HALF_HEIGHT + PADDING;
            const canvasMaxY = HALF_HEIGHT - PADDING - h;

            // Ensure we don't snap out if item is larger than canvas (unlikely but safe)
            if (canvasMinX <= canvasMaxX) finalX = Math.max(canvasMinX, Math.min(finalX, canvasMaxX));
            if (canvasMinY <= canvasMaxY) finalY = Math.max(canvasMinY, Math.min(finalY, canvasMaxY));

            return { x: finalX, y: finalY };
        };



        // Identify "Root" movers - items that are NOT implicitly moved by a selected project area
        const rootIds = movingIds.filter(id => !draggedContents.includes(id));

        rootIds.forEach(id => {
            if (processedIds.has(id)) return;

            const item = items.find(i => i.id === id);
            const folder = folders.find(f => f.id === id);

            if (item && item.type === 'project') {
                // Handle Project Area Movement (Constrained to Canvas only)
                const pw = item.metadata?.width || 300;
                const ph = item.metadata?.height || 200;
                const canvasMinX = -HALF_WIDTH + PADDING;
                const canvasMaxX = HALF_WIDTH - PADDING - pw;
                const canvasMinY = -HALF_HEIGHT + PADDING;
                const canvasMaxY = HALF_HEIGHT - PADDING - ph;

                let safeX = item.position_x + dx;
                let safeY = item.position_y + dy;
                if (canvasMinX <= canvasMaxX) safeX = Math.max(canvasMinX, Math.min(safeX, canvasMaxX));
                if (canvasMinY <= canvasMaxY) safeY = Math.max(canvasMinY, Math.min(safeY, canvasMaxY));

                updates.push({ id, type: 'item', x: safeX, y: safeY });
                processedIds.add(id);

                // Calculate actual shift
                const shiftX = safeX - item.position_x;
                const shiftY = safeY - item.position_y;

                // Move Contents Rigidly
                // We need to re-find contents for THIS specific project to apply the shift
                // (Since draggedContents is global for all selected projects)
                const areaLeft = item.position_x;
                const areaRight = item.position_x + (item.metadata.width || 300);
                const areaTop = item.position_y;
                const areaBottom = item.position_y + (item.metadata.height || 200);

                const contents = items.filter(i => {
                    if (i.id === item.id || i.folder_id || i.type === 'project') return false;

                    let itemW = i.metadata?.width || 250;
                    let itemH = i.metadata?.height || 100;
                    const el = document.getElementById(`draggable-item-${i.id}`);
                    if (el) {
                        itemW = el.offsetWidth;
                        itemH = el.offsetHeight;
                    } else if (i.type === 'room') {
                        itemW = 220;
                        itemH = 220;
                    }

                    return (areaLeft < i.position_x + itemW && areaRight > i.position_x && areaTop < i.position_y + itemH && areaBottom > i.position_y);
                });

                const contentFolders = folders.filter(f => {
                    if (f.parent_id) return false;

                    let fW = 200;
                    let fH = 100;
                    const el = document.getElementById(`draggable-folder-${f.id}`);
                    if (el) {
                        fW = el.offsetWidth;
                        fH = el.offsetHeight;
                    }

                    return (areaLeft < f.position_x + fW && areaRight > f.position_x && areaTop < f.position_y + fH && areaBottom > f.position_y);
                });

                [...contents, ...contentFolders].forEach(c => {
                    if (!processedIds.has(c.id)) {
                        updates.push({
                            id: c.id,
                            type: 'parent_id' in c ? 'folder' : 'item',
                            x: c.position_x + shiftX,
                            y: c.position_y + shiftY
                        });
                        processedIds.add(c.id);
                    }
                });

            } else {
                // Handle Normal Item/Folder Movement (Constrained/Snapped)
                const dims = getElementDims(id, !!folder);
                const startX = item ? item.position_x : folder!.position_x;
                const startY = item ? item.position_y : folder!.position_y;

                const { x, y } = calculateConstrainedPosition(startX + dx, startY + dy, dims.w, dims.h);

                updates.push({
                    id,
                    type: item ? 'item' : 'folder',
                    x,
                    y
                });
                processedIds.add(id);
            }
        });

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
            modifiers={[snapToGrid]}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {snapLines.vertical !== null && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: (snapLines.vertical * scale) + useCanvasStore.getState().position.x,
                        width: 1,
                        backgroundColor: 'var(--accent)',
                        opacity: 0.35,
                        zIndex: 50,
                        pointerEvents: 'none'
                    }}
                />
            )}
            {snapLines.horizontal !== null && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: (snapLines.horizontal * scale) + useCanvasStore.getState().position.y,
                        height: 1,
                        backgroundColor: 'var(--accent)',
                        opacity: 0.35,
                        zIndex: 50,
                        pointerEvents: 'none'
                    }}
                />
            )}
            {children}
            <DragOverlay dropAnimation={null}>
                {activeId ? renderOverlayItem() : null}
            </DragOverlay>
        </DndContext>
    );
}
