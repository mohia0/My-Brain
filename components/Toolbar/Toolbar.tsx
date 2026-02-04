"use client";

import React from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import styles from './Toolbar.module.css';
import { MousePointer2, Hand } from 'lucide-react';
import clsx from 'clsx';

export default function Toolbar() {
    const { currentTool, setTool } = useCanvasStore();

    return (
        <div className={styles.toolbar}>
            <button
                className={clsx(styles.toolBtn, currentTool === 'mouse' && styles.active)}
                onClick={() => setTool('mouse')}
                title="Select (V)"
            >
                <MousePointer2 size={20} />
            </button>

            <div className={styles.divider} />

            <button
                className={clsx(styles.toolBtn, currentTool === 'hand' && styles.active)}
                onClick={() => setTool('hand')}
                title="Pan (H)"
            >
                <Hand size={20} />
            </button>
        </div>
    );
}
