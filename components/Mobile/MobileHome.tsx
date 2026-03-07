"use client";

import React from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileCard from './MobileCard';
import styles from './MobileHome.module.css';
import { Folder, Inbox, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    TouchSensor,
    MouseSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MobileHomeProps {
    onItemClick: (id: string) => void;
    onFolderClick: (id: string) => void;
}

const MobileFolderSortableItem = ({ folder, items, onFolderClick }: { folder: any, items: any[], onFolderClick: (id: string) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: folder.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: 'calc(50% - 6px)',
        position: 'relative' as any,
        zIndex: isDragging ? 30000 : 1,
        ...(isDragging ? {
            opacity: 0
        } : {})
    };

    const itemCount = items.filter(i => i.folder_id === folder.id && i.status !== 'archived').length;

    return (
        <div ref={setNodeRef} style={style}>
            <MobileCard
                item={{ ...folder, type: 'folder', itemCount } as any}
                onClick={() => onFolderClick(folder.id)}
                isDragging={isDragging}
                dragHandleProps={{ ...listeners, ...attributes }}
            />
        </div>
    );
};

export default function MobileHome({ onItemClick, onFolderClick }: MobileHomeProps) {
    const { items, folders, selectedIds } = useItemsStore();
    const [isFoldersCollapsed, setIsFoldersCollapsed] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mobile_folders_collapsed') === 'true';
        }
        return false;
    });

    const toggleFoldersCollapsed = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isFoldersCollapsed;
        setIsFoldersCollapsed(newState);
        localStorage.setItem('mobile_folders_collapsed', String(newState));
    };

    const visibleItems = items.filter(i => i.status !== 'inbox' && i.status !== 'archived' && !i.folder_id && (i as any).type !== 'room' && (i as any).type !== 'project')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const visibleFolders = React.useMemo(() => {
        return folders.filter(f => f.status !== 'archived' && !f.parent_id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [folders]);

    const [orderedFolders, setOrderedFolders] = React.useState(visibleFolders);

    React.useEffect(() => {
        const savedString = localStorage.getItem('mobile_folder_order');
        if (savedString) {
            try {
                const savedOrder = JSON.parse(savedString) as string[];
                const newOrdered = [...visibleFolders].sort((a, b) => {
                    const aIndex = savedOrder.indexOf(a.id);
                    const bIndex = savedOrder.indexOf(b.id);
                    if (aIndex === -1 && bIndex === -1) return 0;
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                });
                setOrderedFolders(newOrdered);
            } catch (e) {
                setOrderedFolders(visibleFolders);
            }
        } else {
            setOrderedFolders(visibleFolders);
        }
    }, [visibleFolders]);

    const handleReorder = (newOrder: typeof visibleFolders) => {
        setOrderedFolders(newOrder);
        localStorage.setItem('mobile_folder_order', JSON.stringify(newOrder.map(f => f.id)));
    };

    const [activeId, setActiveId] = React.useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = orderedFolders.findIndex(f => f.id === active.id);
            const newIndex = orderedFolders.findIndex(f => f.id === over.id);
            handleReorder(arrayMove(orderedFolders, oldIndex, newIndex));
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 10 } })
    );

    const hasContent = visibleItems.length > 0 || orderedFolders.length > 0;

    return (
        <div className={styles.container}>
            {!hasContent ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><Inbox size={48} /></div>
                    <h3>Start your digital library</h3>
                    <p>Your library is empty. Tap the + button to capture links, ideas, or images.</p>
                </div>
            ) : (
                <div className={styles.content}>
                    {visibleFolders.length > 0 && (
                        <section className={styles.section}>
                            <div
                                className={styles.sectionHeader}
                                onClick={toggleFoldersCollapsed}
                                style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: '4px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Folder size={16} />
                                    <span>Folders</span>
                                </div>
                                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>
                                    {isFoldersCollapsed ? (
                                        <><span>EXPAND</span><ChevronDown size={14} /></>
                                    ) : (
                                        <><span>COLLAPSE</span><ChevronUp size={14} /></>
                                    )}
                                </div>
                            </div>
                            {!isFoldersCollapsed && (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDragCancel={handleDragCancel}
                                >
                                    <div className={styles.folderGrid} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', width: '100%', position: 'relative' }}>
                                        <SortableContext
                                            items={orderedFolders.map(f => f.id)}
                                            strategy={rectSortingStrategy}
                                        >
                                            {orderedFolders.map(folder => (
                                                <MobileFolderSortableItem
                                                    key={folder.id}
                                                    folder={folder}
                                                    items={items}
                                                    onFolderClick={onFolderClick}
                                                />
                                            ))}
                                        </SortableContext>
                                    </div>
                                    <DragOverlay dropAnimation={null}>
                                        {activeId ? (() => {
                                            const folder = orderedFolders.find(f => f.id === activeId);
                                            if (!folder) return null;
                                            const itemCount = items.filter(i => i.folder_id === folder.id && i.status !== 'archived').length;
                                            return (
                                                <div style={{
                                                    width: 'calc(50vw - 23px)', // roughly matches the 50% width inside the grid container on mobile
                                                    transform: 'rotate(-2deg) scale(1.05)',
                                                    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                                                    filter: 'brightness(1.15)',
                                                    opacity: 0.95,
                                                    borderRadius: 16
                                                }}>
                                                    <MobileCard
                                                        item={{ ...folder, type: 'folder', itemCount } as any}
                                                        isDragging={true}
                                                    />
                                                </div>
                                            );
                                        })() : null}
                                    </DragOverlay>
                                </DndContext>
                            )}
                        </section>
                    )}

                    {visibleItems.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <LayoutGrid size={16} />
                                <span>Canvas Ideas</span>
                            </div>
                            <div className={styles.list}>
                                {visibleItems.map(item => (
                                    <MobileCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => onItemClick(item.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
