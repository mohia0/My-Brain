import React from 'react';
import { Archive } from 'lucide-react';
import styles from './ArchiveZone.module.css';
import { useDroppable } from '@dnd-kit/core';
import { useItemsStore } from '@/lib/store/itemsStore';
import clsx from 'clsx';

export default function ArchiveZone() {
    const { isArchiveOpen, setArchiveOpen } = useItemsStore();
    const { setNodeRef, isOver } = useDroppable({
        id: 'archive-zone',
        data: { type: 'archive-drop-zone' }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(styles.archiveZone, isOver && styles.isOver)}
            onClick={() => setArchiveOpen(!isArchiveOpen)}
            title="Drag here to archive, or click to view all archives"
        >
            <div className={styles.iconWrapper}>
                <Archive size={24} color={isOver ? 'white' : 'var(--text-muted)'} />
            </div>
            {isOver && (
                <div className={styles.dropText}>
                    Drop to Archive
                </div>
            )}
        </div>
    );
}
