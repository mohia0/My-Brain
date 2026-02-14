"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Item } from '@/types';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { DoorOpen, ArrowRight, CornerUpLeft } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface RoomPortalProps {
    item: Item;
    isLocked?: boolean;
    onClick?: () => void;
}

export default function RoomPortal({ item, isLocked, onClick }: RoomPortalProps) {
    const { setCurrentRoomId } = useItemsStore();
    const { setPosition, setScale } = useCanvasStore();

    const handleEnterRoom = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Use getState to avoid re-rendering loop issues if calling from effect, 
        // but here it is an event handler.
        const { scale, position } = useCanvasStore.getState();

        setCurrentRoomId(item.id);
        setPosition(window.innerWidth / 2, window.innerHeight / 2);
        setScale(1);
    };

    return (
        <div
            className={clsx(
                "relative flex flex-col items-center justify-center rounded-[24px] transition-all duration-300 group overflow-hidden cursor-pointer",
                "bg-zinc-900 border border-white/10",
                "hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]"
            )}
            style={{
                width: 220,
                height: 220,
            }}
            onClick={onClick}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="z-10 bg-zinc-800 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl border border-white/5">
                <DoorOpen size={32} className="text-purple-400" strokeWidth={1.5} />
            </div>

            <div className="z-10 text-center px-4">
                <h3 className="text-lg font-bold text-white mb-1">
                    {item.metadata?.title || 'Mind Room'}
                </h3>
                <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">
                    Enter Space
                </p>
            </div>

            <button
                className="absolute inset-0 w-full h-full z-20 opacity-0"
                onClick={handleEnterRoom}
                aria-label="Enter Room"
            />
        </div>
    );
}

export function RoomBackButton() {
    const { currentRoomId, setCurrentRoomId } = useItemsStore();
    const { setPosition, setScale } = useCanvasStore();

    if (!currentRoomId) return null;

    const handleBack = () => {
        setCurrentRoomId(null);
        setPosition(window.innerWidth / 2, window.innerHeight / 2);
        setScale(0.65);
    };

    return (
        <div className="fixed top-6 left-6 z-[99999] animate-in fade-in zoom-in duration-300">
            <button
                onClick={handleBack}
                className="group flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 px-5 py-3 rounded-full hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
                <div className="bg-white/10 p-2 rounded-full group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <CornerUpLeft size={20} />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-sm tracking-wide">EXIT ROOM</span>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider group-hover:text-zinc-300">Return to Canvas</span>
                </div>
            </button>
        </div>
    );
}

