"use client";

import React, { forwardRef } from 'react';
import styles from './ItemCard.module.css';
import { Item } from '@/types';
import { FileText, Link, Image as ImageIcon, Copy, Trash2, Archive, Video, Play, Lock as LockIcon, DoorClosed, ArrowRight, Unlock, Edit3, Check } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { supabase } from '@/lib/supabase';
import { useVaultStore } from '@/components/Vault/VaultAuthModal';
import { toast } from 'sonner';
import clsx from 'clsx';
import ActionMoveMenu from '@/components/ActionMoveMenu/ActionMoveMenu';

interface ItemCardProps {
    item: Item;
    isLocked?: boolean;
    onClick?: () => void;
}

interface ItemCardViewProps {
    item: Item;
    isSelected?: boolean;
    isDimmed?: boolean;
    isDragging?: boolean;
    isOverlay?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onDuplicate: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onArchive: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
}

export const ItemCardView = forwardRef<HTMLDivElement, ItemCardViewProps>(({
    item,
    isSelected,
    isDimmed,
    isDragging,
    isOverlay,
    onClick,
    onDuplicate,
    onDelete,
    onArchive,
    style,
    attributes,
    listeners
}, ref) => {
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [tempTitle, setTempTitle] = React.useState(item.metadata?.title || '');
    const [imageError, setImageError] = React.useState(false);
    const [localItem, setLocalItem] = React.useState(item);
    const pollTimer = React.useRef<any>(null);
    const { isVaultLocked, setModalOpen, hasPassword, lock, unlockedIds, lockItem } = useVaultStore();
    const { toggleVaultItem, duplicateItem, removeItem, archiveItem, vaultedItemsRevealed, reLockVaulted } = useItemsStore();
    const { scale } = useCanvasStore();

    React.useEffect(() => {
        setLocalItem(item);
    }, [item]);

    // Metadata polling for links (like Instagram) that take time to capture
    React.useEffect(() => {
        const isPlaceholder = !localItem.metadata?.title || /capturing|shared|moment/i.test(localItem.metadata.title);
        const needsUpdate = localItem.type === 'link' && (!localItem.metadata?.image || isPlaceholder) && localItem.status === 'active';
        if (!needsUpdate) return;

        let attempts = 0;
        pollTimer.current = setInterval(async () => {
            attempts++;
            if (attempts > 10) {
                clearInterval(pollTimer.current!);
                // Fallback if still capturing
                if (isPlaceholder) {
                    let fb = 'Link';
                    try { fb = new URL(localItem.content).hostname.replace('www.', ''); } catch { }
                    useItemsStore.getState().updateItemContent(localItem.id, { metadata: { ...localItem.metadata, title: fb } });
                }
                return;
            }

            const { data } = await supabase.from('items').select('metadata').eq('id', localItem.id).single();
            if (data?.metadata?.image || (data?.metadata?.title && !/capturing|shared|moment/i.test(data.metadata.title))) {
                useItemsStore.getState().updateItemContent(localItem.id, { metadata: data.metadata });
                setLocalItem(prev => ({ ...prev, metadata: data.metadata }));
                clearInterval(pollTimer.current!);
            }
        }, 3000);

        return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    }, [localItem.id, localItem.type, localItem.metadata?.image, localItem.metadata?.title]);

    const isVideo = localItem.type === 'video' || localItem.metadata?.isVideo;
    const isCapture = localItem.type === 'link' && localItem.metadata?.image;
    const isImage = localItem.type === 'image';

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        onDelete(e);
    };

    const getIcon = () => {
        if (isVideo) return <Video size={16} />;
        switch (localItem.type) {
            case 'link': return <Link size={16} />;
            case 'image': return <ImageIcon size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const SyncIndicator = () => {
        if (!localItem.syncStatus || localItem.syncStatus === 'synced') return null;
        return (
            <div className={clsx(styles.syncStatus, styles[localItem.syncStatus])}>
                {localItem.syncStatus === 'syncing' ? '...' : '!'}
            </div>
        );
    };

    const isVaulted = localItem.is_vaulted;
    const isObscured = isVaulted && isVaultLocked && !unlockedIds.includes(localItem.id) && !vaultedItemsRevealed.includes(localItem.id);

    const handleVaultToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // If no password is set, open modal to set it up (Targeting this item)
        if (hasPassword === false) {
            setModalOpen(true, localItem.id);
            return;
        }

        if (hasPassword !== true && !isVaulted) {
            // Checking state or other weird state
            setModalOpen(true, localItem.id);
            return;
        }

        await toggleVaultItem(localItem.id);

        if (!isVaulted) {
            // If we just vaulted it, make sure it stays blurred (locked) 
            // for the individual view. The state change triggers a re-render.
        }
    };

    const handleLockItem = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (hasPassword === false) {
            setModalOpen(true, localItem.id);
            return;
        }

        if (!isVaultLocked) {
            lock(); // Re-lock the vault globally if it's currently open
        } else {
            lockItem(localItem.id); // Otherwise just re-lock this specific item
        }
        reLockVaulted(localItem.id);
    };

    const handleTitleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (tempTitle.trim()) {
            useItemsStore.getState().updateItemContent(item.id, {
                metadata: { ...item.metadata, title: tempTitle.trim() }
            });
        }
        setIsEditingTitle(false);
    };

    const renderActions = () => (
        <div className={styles.actions} onPointerDown={e => e.stopPropagation()}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault(); // Add preventDefault
                    if (isVaulted && !isObscured) {
                        handleLockItem(e);
                    } else if (isObscured) {
                        setModalOpen(true, localItem.id);
                    } else if (!isVaulted) {
                        handleVaultToggle(e);
                    }
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    // Don't stop immediate prop as it might need to bubble for some React events, but stopping propagation is usually key for dnd-kit
                }}
                onMouseDown={(e) => e.stopPropagation()}
                data-tooltip={isObscured ? "Hidden - Tap to Unlock" : (isVaulted ? "Re-Lock Item" : "Lock in Vault")}
                data-tooltip-pos="bottom"
                style={{ color: 'inherit' }}
            >
                <LockIcon size={12} />
            </button>
            <ActionMoveMenu itemId={localItem.id} />
            <button onClick={onArchive} data-tooltip="Archive" data-tooltip-pos="bottom-left"><Archive size={12} /></button>
            <button onClick={onDuplicate} data-tooltip="Duplicate" data-tooltip-pos="bottom-left"><Copy size={12} /></button>
            <button
                onClick={handleDeleteClick}
                data-tooltip={isDeleting ? "Confirm Delete" : "Delete"}
                data-tooltip-pos="bottom-left"
                className={clsx(styles.deleteAction, isDeleting && styles.confirmDelete)}
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? "Sure?" : <Trash2 size={12} />}
            </button>
        </div>
    );

    const renderRoomActions = () => (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                }}
                data-tooltip="Rename"
                data-tooltip-pos="bottom"
            >
                <Edit3 size={12} />
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (isVaulted && !isObscured) {
                        handleLockItem(e);
                    } else if (isObscured) {
                        setModalOpen(true, localItem.id);
                    } else if (!isVaulted) {
                        handleVaultToggle(e); // This now opens the modal if needed
                    }
                }}
                onPointerDown={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                data-tooltip={isObscured ? "Protected by Vault" : (isVaulted ? "Lock Item" : "Lock in Vault")}
                data-tooltip-pos="bottom"
            >
                <LockIcon size={12} />
            </button>
            <ActionMoveMenu itemId={localItem.id} />
            <button
                onClick={handleDeleteClick}
                data-tooltip={isDeleting ? "Confirm Delete" : "Delete"}
                data-tooltip-pos="bottom-left"
                className={clsx(styles.deleteAction, isDeleting && styles.confirmDelete)}
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? "Sure?" : <Trash2 size={12} />}
            </button>
        </>
    );


    const safeHostname = (url: string) => {
        if (!url || !url.startsWith('http')) return null;
        try { return new URL(url).hostname; } catch { return null; }
    };

    const baseClassName = clsx(
        styles.card,
        isSelected && styles.selected,
        isDimmed && styles.dimmed,
        isObscured && styles.obscured
    );

    const finalStyle = isOverlay ? {
        ...style,
        position: 'relative' as const,
        top: 0,
        left: 0,
        transform: 'none'
    } : style;

    // Video Handling
    if (isVideo) {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.videoCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
                onContextMenu={isObscured ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
            >
                <div className={styles.innerCard}>
                    <div className={styles.videoHeader}>
                        <Video size={14} className={styles.videoTagIcon} />
                        <span>Video</span>
                    </div>
                    <video src={localItem.content} className={styles.videoPreview} muted />
                    <div className={styles.videoOverlay}>
                        <Play size={24} fill="white" />
                    </div>
                    <div className={styles.captureInfo}>
                        <div className={styles.captureTitle}>{localItem.metadata?.title || 'Video Idea'}</div>
                        <div className={styles.captureFooter}>
                            <span className={styles.cardDate}>{new Date(localItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <SyncIndicator />
                        </div>
                    </div>
                </div>
                {isObscured && (
                    <button
                        className={styles.revealButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true, localItem.id);
                        }}
                    >
                        <Unlock size={14} /> UNLOCK
                    </button>
                )}
                {!isObscured && renderActions()}
            </div>
        );
    }

    // Capture (Link with image)
    if (isCapture) {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.captureCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
                onContextMenu={isObscured ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
            >
                <div className={styles.innerCard}>
                    <div className={styles.captureThumbWrapper}>
                        {!imageError ? (
                            <img
                                src={localItem.metadata.image}
                                className={styles.captureThumb}
                                draggable={false}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className={styles.noSnapshot}>No Snapshot</div>
                        )}
                    </div>
                    <div className={styles.captureInfo}>
                        <div className={styles.captureTitle}>{localItem.metadata.title}</div>
                        <div className={styles.captureDomain}>{safeHostname(localItem.content)}</div>
                        <div className={styles.captureDesc}>{localItem.metadata.description || "No description"}</div>
                        <div className={styles.captureFooter}>
                            <span className={styles.cardDate}>{new Date(localItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <SyncIndicator />
                        </div>
                    </div>
                </div>
                {isObscured && (
                    <button
                        className={styles.revealButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true, localItem.id);
                        }}
                    >
                        <Unlock size={14} /> UNLOCK
                    </button>
                )}
                {!isObscured && renderActions()}
            </div>
        );
    }

    // Room Portal (Grid)

    // Vault Locked State
    // We assume useVaultStore usage will be passed down or accessed via component but since ItemCardView is pure UI mostly,
    // let's just handle visual blurring if is_vaulted prop is true (we will update ItemCard properties)

    // Simple Link (No Image)
    if (localItem.type === 'link') {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={baseClassName}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
                onContextMenu={isObscured ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
            >
                <div className={styles.innerCard}>
                    <div className={styles.header}>
                        {safeHostname(localItem.content) && (
                            <img
                                src={`https://www.google.com/s2/favicons?domain=${safeHostname(localItem.content)}`}
                                alt=""
                                width={16}
                                height={16}
                                onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                        )}
                        <span className={styles.title}>{localItem.metadata?.title || localItem.content}</span>
                    </div>
                    <div className={styles.content}>
                        <div className={styles.captureDomain} style={{ marginBottom: 4 }}>
                            {safeHostname(localItem.content)}
                        </div>
                        <div className={styles.captureDesc} style={{ WebkitLineClamp: 3 }}>
                            {localItem.metadata?.description || "No description"}
                        </div>
                        <div className={styles.captureFooter}>
                            <span className={styles.cardDate}>
                                {localItem.updated_at
                                    ? `Edited ${new Date(localItem.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                    : new Date(localItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                }
                            </span>
                            <SyncIndicator />
                        </div>
                    </div>
                </div>
                {isObscured && (
                    <button
                        className={styles.revealButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true, localItem.id);
                        }}
                    >
                        <Unlock size={14} /> UNLOCK
                    </button>
                )}
                {!isObscured && renderActions()}
            </div>
        );
    }

    // Default (Image or Text Idea) or Room Door Visual
    if ((localItem.type as string) === 'room') {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.roomCardOuter, isEditingTitle && styles.isEditing)}
                style={finalStyle}
                {...listeners}
                {...attributes}
                onContextMenu={isObscured ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
            >
                <div
                    className={styles.portalCard}
                    onPointerDown={e => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // If it's locked (obscured), do NOTHING on the card click itself.
                        // The user must click the dedicated Unlock button or context menu.
                        if (isObscured) return;

                        // Enter Room
                        useItemsStore.getState().enterRoom(localItem.id, localItem.metadata?.title || 'Mind Room');
                        // Reset view for new room - CENTER IT
                        useCanvasStore.getState().setPosition(window.innerWidth / 2, window.innerHeight / 2);
                        useCanvasStore.getState().setScale(1);
                    }}
                >
                    {/* The Inside (Revealed when door opens) */}
                    <div className={styles.roomInside}>
                        <div className={styles.roomInsideGlow}>
                            <DoorClosed size={32} className="mb-2" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Enter Room</span>
                        </div>

                        {!isObscured && (
                            <div
                                className={styles.roomInsideActions}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => e.stopPropagation()}
                            >
                                {renderRoomActions()}
                            </div>
                        )}
                    </div>

                    {/* The Door (Rotates) */}
                    <div className={styles.roomDoor}>
                        <div className={styles.doorPanel}>
                            <div className={styles.doorFrameDesign} />
                            <div className={styles.doorHandle} />

                            {isEditingTitle ? (
                                <form onSubmit={handleTitleSave} onClick={e => e.stopPropagation()} className="w-full">
                                    <input
                                        autoFocus
                                        className={styles.renameInput}
                                        value={tempTitle}
                                        onChange={e => setTempTitle(e.target.value)}
                                        onBlur={() => handleTitleSave()}
                                    />
                                </form>
                            ) : (
                                <h3
                                    className={styles.doorTitle}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingTitle(true);
                                    }}
                                >
                                    {localItem.metadata?.title || 'Mind Room'}
                                </h3>
                            )}
                            <p className={styles.doorSubtitle}>MIND ROOM</p>
                        </div>
                    </div>
                </div>

                {isObscured && (
                    <button
                        className={styles.revealButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true, localItem.id);
                        }}
                    >
                        <Unlock size={14} /> UNLOCK
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            id={`draggable-item-${localItem.id}`}
            ref={ref}
            className={baseClassName}
            style={finalStyle}
            {...listeners}
            {...attributes}
            onPointerDown={(e) => {
                e.stopPropagation();
                listeners?.onPointerDown?.(e);
            }}
            onClick={onClick}
            onContextMenu={isObscured ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
        >
            <div className={styles.innerCard}>
                <div className={styles.header}>
                    {getIcon()}
                    <span className={styles.title}>
                        {(() => {
                            if (localItem.metadata?.title) return localItem.metadata.title;
                            if (localItem.type === 'image') return 'Image';

                            // Fallback: derive title from content
                            let displayContent = localItem.content;
                            if (displayContent.startsWith('[') || displayContent.startsWith('{')) {
                                try {
                                    const blocks = JSON.parse(displayContent);
                                    displayContent = Array.isArray(blocks)
                                        ? blocks.map((b: any) => Array.isArray(b.content) ? b.content.map((c: any) => c.text).join('') : b.content || '').join(' ')
                                        : displayContent;
                                } catch { }
                            }

                            // Clean up derived title
                            const clean = displayContent.trim();
                            if (!clean) return 'Untitled Idea';
                            return clean.length > 40 ? clean.substring(0, 40) + '...' : clean;
                        })()}
                    </span>
                </div>
                <div className={isImage ? styles.imageContentWrapper : styles.content}>
                    {isImage ? (
                        !imageError ? (
                            <img
                                src={localItem.content}
                                alt="preview"
                                className={styles.imageContent}
                                draggable={false}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className={styles.noSnapshot}>No Snapshot</div>
                        )
                    ) : (
                        <div className={clsx(styles.textContent, isObscured && "select-none")}>
                            {(() => {
                                if (!localItem.content) return <span className="opacity-30">No content yet</span>;

                                if (localItem.content.startsWith('[')) {
                                    try {
                                        const blocks = JSON.parse(localItem.content);
                                        // Richer preview
                                        return <div className={styles.richPreview}>
                                            {blocks.slice(0, 3).map((b: any, i: number) => {
                                                let text = '';
                                                if (Array.isArray(b.content)) {
                                                    text = b.content.map((c: any) => c.text || '').join('');
                                                } else if (typeof b.content === 'string') {
                                                    text = b.content;
                                                } else {
                                                    // Fallback for complex blocks like tables
                                                    text = `[${b.type || 'Object'}]`;
                                                }

                                                const isCheckList = b.type === 'checkListItem';
                                                if (!text && !isCheckList) return null;

                                                return <div key={i} className={clsx(
                                                    styles.previewLine,
                                                    b.type === 'heading' && styles.previewHeading
                                                )}>
                                                    {isCheckList && (
                                                        <div className={clsx(
                                                            styles.previewCheckbox,
                                                            b.props?.checked && styles.previewCheckboxChecked
                                                        )}>
                                                            {b.props?.checked && <Check size={8} color="white" strokeWidth={4} />}
                                                        </div>
                                                    )}
                                                    <p className={styles.previewText}>{text}</p>
                                                </div>
                                            })}
                                            {blocks.length > 3 && <div className="text-[10px] text-zinc-600 mt-1 italic">... more</div>}
                                        </div>
                                    } catch {
                                        return localItem.content; // Fallback to raw text if it's not JSON
                                    }
                                }
                                return localItem.content;
                            })()}
                        </div>
                    )}


                    <div className={styles.captureFooter} style={{ padding: isImage ? '8px 12px' : '4px 0 0 0' }}>
                        <span className={styles.cardDate}>
                            {localItem.updated_at && localItem.updated_at !== localItem.created_at ? 'Edited ' : 'Created '}
                            {new Date(localItem.updated_at || localItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <SyncIndicator />
                    </div>
                </div>
            </div>
            {isObscured && (
                <button
                    className={styles.revealButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        setModalOpen(true, localItem.id);
                    }}
                >
                    <Unlock size={14} /> UNLOCK
                </button>
            )}
            {!isObscured && renderActions()}
        </div>
    );
});

ItemCardView.displayName = 'ItemCardView';

export default function ItemCard({ item, isLocked, onClick }: ItemCardProps) {
    const { duplicateItem, removeItem, archiveItem, selectedIds } = useItemsStore();
    const { scale } = useCanvasStore();

    const isSelected = selectedIds.includes(item.id);
    const isDimmed = selectedIds.length > 1 && !isSelected;

    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: item.id,
        data: { ...item, type: 'item', itemType: item.type },
        disabled: isLocked
    });

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateItem(item.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        removeItem(item.id);
    };

    const handleArchive = (e: React.MouseEvent) => {
        archiveItem(item.id);
    };

    const dragStyle: React.CSSProperties = {
        left: item.position_x,
        top: item.position_y,
        opacity: 1,
        zIndex: isDragging ? 1000 : undefined,
        transform: transform ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` : undefined,
        cursor: isLocked ? 'default' : (isDragging ? 'grabbing' : 'grab')
    };

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            useItemsStore.getState().toggleSelection(item.id);
        } else {
            useItemsStore.getState().selectItem(item.id);
            onClick?.();
        }
    };

    return (
        <ItemCardView
            ref={setNodeRef}
            item={item}
            isSelected={isSelected}
            isDimmed={isDimmed}
            isDragging={isDragging}
            onClick={handleClick}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onArchive={handleArchive}
            attributes={attributes}
            listeners={listeners}
            style={dragStyle}
        />
    );
}
