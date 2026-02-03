"use client";

import React from 'react';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { useCanvasStore } from '@/lib/store/canvasStore';

export default function DragWrapper({ children }: { children: React.ReactNode }) {
    const { scale, position } = useCanvasStore();

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10, // Prevent accidental drags when clicking
            },
        }),
        useSensor(TouchSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;

        // Logic to calculate new position relative to canvas
        // This is simplified; real implementation needs to separate Canvas Item Drag vs Inbox Drag
        console.log('Dragged', active.id, delta);
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {children}
        </DndContext>
    );
}
