"use client";

import React, { useState } from 'react';
import { Item } from '@/types';
import { FileText, Link as LinkIcon, Image as ImageIcon, Copy, Trash2, Archive, Folder, Clock, RefreshCw, CheckCircle2, AlertCircle, Play, Video, Lock, Unlock, GripVertical, GripHorizontal } from 'lucide-react';
import styles from './MobileCard.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useVaultStore } from '@/components/Vault/VaultAuthModal';
import clsx from 'clsx';
import { getPlainText } from '@/lib/utils';
import { toast } from 'sonner';
interface MobileCardProps {
    item: Item;
    onClick?: () => void;
    style?: React.CSSProperties;
    onDragStartRequested?: (e: React.PointerEvent) => void;
    isDragging?: boolean;
    dragHandleProps?: any;
    isReordering?: boolean;
    onReorderModeChange?: (val: boolean) => void;
    dragControls?: any;
}

export default function MobileCard({ 
    item, 
    onClick, 
    style,
    onDragStartRequested, 
    isDragging, 
    dragHandleProps,
    isReordering,
    onReorderModeChange,
    dragControls
}: MobileCardProps) {
    const { items, duplicateItem, removeItem, archiveItem, removeFolder, selectedIds, toggleSelection, vaultedItemsRevealed, toggleVaultItem, toggleVaultFolder } = useItemsStore();
    const { isVaultLocked, unlockedIds, setModalOpen, lockItem, hasPassword } = useVaultStore();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const pointerStartPos = React.useRef<{ x: number, y: number } | null>(null);
    const isSelected = selectedIds.includes(item.id);
    const inSelectionMode = selectedIds.length > 0;

    // Vault Logic
    const isVaulted = item.is_vaulted;
    const isUnlockedLocally = unlockedIds.includes(item.id) || vaultedItemsRevealed?.includes(item.id);
    const isObscured = isVaulted && isVaultLocked && !isUnlockedLocally;

    const isFolder = 'type' in item && (item as any).type === 'folder';
    const folderItems = isFolder ? items.filter(i => i.folder_id === item.id && i.status !== 'archived') : [];

    const isVideo = item.type === 'video' || item.metadata?.isVideo;
    const isImage = (item.type === 'image' || (item.type === 'link' && item.metadata?.image)) && !isVideo;
    const imageUrl = item.type === 'image' ? item.content : item.metadata?.image;

    const hostname = (url: string) => {
        if (!url || !url.startsWith('http')) return null;
        try { return new URL(url).hostname; } catch { return null; }
    };

    const getRelativeTime = (dateStr: string) => {
        if (!dateStr) return 'unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };



    const handleCopyLink = async (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const doCopy = (text: string) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success("Link copied");
            } catch (err) {
                console.error("Fallback copy failed", err);
                toast.error("Failed to copy link");
            }
            document.body.removeChild(textArea);
        };

        if (navigator?.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(item.content);
                toast.success("Link copied");
            } catch (err) {
                doCopy(item.content);
            }
        } else {
            doCopy(item.content);
        }
    };

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        archiveItem(item.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRemoving) return;

        if (!isDeleting) {
            setIsDeleting(true);
            setTimeout(() => setIsDeleting(false), 3000);
            return;
        }

        setIsRemoving(true);
        setTimeout(() => {
            if (isFolder) {
                console.log('[MobileCard] Removing folder:', item.id);
                removeFolder(item.id);
            } else {
                console.log('[MobileCard] Removing item:', item.id);
                removeItem(item.id);
            }
        }, 500);
    };

    const handleLongPress = () => {
        if (isReordering) {
            onReorderModeChange?.(false);
        } else if (inSelectionMode) {
            toggleSelection(item.id);
        } else {
            if (onReorderModeChange) {
                onReorderModeChange(true);
                if (window.navigator.vibrate) window.navigator.vibrate(50);
            } else {
                toggleSelection(item.id);
            }
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only trigger on primary touch/mouse button
        if (e.button !== 0) return;

        pointerStartPos.current = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
        longPressTimer.current = setTimeout(handleLongPress, 500); 
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!pointerStartPos.current) return;
        const dx = Math.abs(Math.round(e.clientX) - pointerStartPos.current.x);
        const dy = Math.abs(Math.round(e.clientY) - pointerStartPos.current.y);

        // If they move significantly, cancel the long press
        if (dx > 10 || dy > 10) {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }
    };

    const handlePointerUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        pointerStartPos.current = null;
    };

    const handleClick = (e: React.MouseEvent) => {
        if (inSelectionMode) {
            e.stopPropagation();
            toggleSelection(item.id);
            return;
        }

        if (isObscured) {
            e.stopPropagation();
            setModalOpen(true, item.id);
            return;
        }

        onClick?.();
    };

    const SyncIndicator = () => {
        if (!item.syncStatus || item.syncStatus === 'synced') return null;

        return (
            <div className={clsx(styles.syncBadge, styles[item.syncStatus])}>
                {item.syncStatus === 'syncing' ? (
                    <RefreshCw size={10} className={styles.spin} />
                ) : (
                    <AlertCircle size={10} />
                )}
                <span>{item.syncStatus === 'syncing' ? 'Syncing...' : 'Error'}</span>
            </div>
        );
    };

    const [imageError, setImageError] = useState(false);

    if (isObscured) {
        return (
            <div
                className={clsx(
                    styles.card,
                    styles.obscuredCard,
                    isFolder && styles.gridCard,
                    isRemoving && styles.removing,
                    isSelected && styles.selected,
                    isDragging && styles.isDragging
                )}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={(e) => isReordering && e.preventDefault()}
                style={{
                    ...style,
                    zIndex: isReordering ? 10 : 1,
                }}
            >
                {isReordering && (
                    <div 
                        className={styles.reorderHandle}
                        onPointerDown={(e) => dragControls?.start(e)}
                        style={{ touchAction: 'none' }}
                    >
                        <GripVertical size={20} />
                    </div>
                )}
                <div className={styles.obscuredBlur} />
                <div className={styles.obscuredUI}>
                    <div className={styles.lockRing}>
                        <Lock size={18} />
                    </div>
                    <div className={styles.obscuredInfo}>
                        <div className={styles.vaultLabel}>
                            Vault Protected
                        </div>
                        <div className={styles.obscuredTitle}>
                            {isFolder ? (item as any).name : (item.metadata?.title || 'Private Idea')}
                        </div>
                    </div>
                    <button
                        className={styles.unlockBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true, item.id);
                        }}
                    >
                        <Unlock size={14} /> UNLOCK
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={clsx(
                styles.card,
                isFolder && styles.gridCard,
                isRemoving && styles.removing,
                isSelected && styles.selected,
                isSelected && selectedIds.length === 1 && styles.singleSelected,
                isDragging && styles.isDragging,
                isReordering && styles.reorderMode
            )}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => isReordering && e.preventDefault()}
            style={{
                ...style,
                zIndex: isReordering ? 10 : 1,
            }}
        >
            {isReordering && (
                <div 
                    className={styles.reorderHandle}
                    onPointerDown={(e) => dragControls?.start(e)}
                    style={{ touchAction: 'none' }}
                >
                    <GripVertical size={20} />
                </div>
            )}
            {isFolder && isSelected && selectedIds.length === 1 && (!!onDragStartRequested || dragHandleProps) && (
                <div
                    className={styles.dragHandle}
                    {...dragHandleProps}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        // For framer-motion compat
                        if (onDragStartRequested) {
                            onDragStartRequested(e.nativeEvent as any);
                        }
                        // For dnd-kit compat
                        if (dragHandleProps?.onPointerDown) {
                            dragHandleProps.onPointerDown(e);
                        }
                    }}
                    style={{
                        touchAction: 'none',
                        opacity: isDragging ? 0 : 1,
                        pointerEvents: isDragging ? 'none' : 'auto'
                    }}
                >
                    <GripHorizontal size={18} />
                </div>
            )}
            <div className={styles.mainContent}>
                {isVideo ? (
                    <div className={styles.imageLayout}>
                        <div className={styles.videoThumbnailWrapper}>
                            <video src={item.content} className={clsx(styles.thumb, styles.videoThumb)} />
                            <div className={styles.playOverlay}><Play size={24} fill="white" /></div>
                        </div>
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{item.metadata?.title || 'Video Idea'}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.metaRow}>
                                <span className={styles.sub}>Video</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                ) : isImage && imageUrl ? (
                    <div className={styles.imageLayout}>
                        {!imageError ? (
                            <img
                                src={imageUrl}
                                alt=""
                                className={clsx(
                                    styles.thumb,
                                    (item.metadata?.isSocial || item.metadata?.platform === 'instagram') && styles.socialThumb
                                )}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className={styles.noSnapshotThumb}>
                                <span>No Snapshot</span>
                            </div>
                        )}
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{item.metadata?.title || (item.type === 'image' ? 'Image Idea' : 'Shared Idea')}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.metaRow}>
                                <span className={styles.sub}>{item.type === 'link' ? hostname(item.content) : 'Image'}</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.simpleLayout}>
                        {!isFolder && (
                            <div
                                className={clsx(styles.iconBox, isFolder && styles.folderIconBox)}
                                style={isFolder && (item as any).color ? {
                                    backgroundColor: `${(item as any).color}25`,
                                    color: (item as any).color
                                } : {}}
                            >
                                {item.type === 'text' && (item.metadata?.emoji ? <span style={{ fontSize: '22px' }}>{item.metadata.emoji}</span> : <FileText size={20} />)}
                                {item.type === 'link' && !isFolder && (
                                    hostname(item.content) ? (
                                        <img
                                            src={`https://www.google.com/s2/favicons?domain=${hostname(item.content)}&sz=64`}
                                            className={styles.favicon}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <LinkIcon size={20} />
                                    )
                                )}
                                {item.type === 'image' && <ImageIcon size={20} />}
                                {item.type === 'video' && <Video size={20} />}
                            </div>
                        )}
                        <div className={styles.info}>
                            {isFolder && folderItems.length > 0 && (
                                <div className={clsx(
                                    styles.previewGrid,
                                    folderItems.length === 1 && styles.grid1,
                                    folderItems.length === 2 && styles.grid2,
                                    folderItems.length === 3 && styles.grid3,
                                    folderItems.length >= 4 && styles.grid4
                                )}>
                                    {folderItems.slice(0, 4).map(subItem => {
                                        if (subItem.type === 'image' || (subItem.type === 'link' && subItem.metadata?.image)) {
                                            return <img key={subItem.id} src={subItem.type === 'image' ? subItem.content : subItem.metadata?.image} className={styles.miniImage} alt="" />;
                                        }
                                        if (subItem.type === 'video' || subItem.metadata?.isVideo) {
                                            return <div key={subItem.id} className={styles.miniItem}><Video size={12} /></div>;
                                        }
                                        return (
                                            <div key={subItem.id} className={styles.miniItem}>
                                                {subItem.type === 'link' ? <LinkIcon size={12} /> : <FileText size={12} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className={styles.titleRow}>
                                <div className={styles.title}>
                                    {isFolder ? (item as any).name : (item.metadata?.title || getPlainText(item.content).slice(0, 50))}
                                </div>
                                <SyncIndicator />
                            </div>

                            {!isFolder && item.type === 'text' && (item.metadata?.title ? getPlainText(item.content).length > 0 : getPlainText(item.content).length > 50) && (
                                <div className={styles.bodyPreview}>
                                    {item.metadata?.title ? getPlainText(item.content).slice(0, 100) : getPlainText(item.content).slice(50, 150)}
                                </div>
                            )}

                            {isFolder ? null : (
                                <div className={styles.metaRow}>
                                    <span className={styles.sub}>
                                        {isVideo ? 'Video' : (item.type === 'link' ? (hostname(item.content) || 'Link') : (item.type === 'image' ? 'Image' : 'Idea'))}
                                    </span>
                                    <span className={styles.dot}>•</span>
                                    <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div
                className={styles.actions}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isVaulted && !isObscured) {
                            // If it's vaulted but revealed, clicking lock should re-lock it (hide it)
                            lockItem(item.id);
                        } else {
                            // First check if a master key exists
                            if (hasPassword === false) {
                                setModalOpen(true, item.id);
                                return;
                            }

                            // Otherwise toggle its vaulted status (Add to vault)
                            if (isFolder) toggleVaultFolder(item.id);
                            else toggleVaultItem(item.id);
                        }
                    }}
                    className={styles.actionBtn}
                    data-tooltip={isVaulted ? "Re-Lock Item" : "Lock in Vault"}
                    data-tooltip-pos="left"
                    style={{ color: 'inherit' }}
                >
                    <Lock size={14} />
                </button>
                <button onClick={handleArchive} className={styles.actionBtn} data-tooltip="Archive" data-tooltip-pos="left"><Archive size={14} /></button>
                {!isFolder && item.type === 'link' && <button onPointerDown={handleCopyLink} onClick={e => { e.stopPropagation(); e.preventDefault(); }} className={styles.actionBtn} data-tooltip="Copy Link" data-tooltip-pos="left"><LinkIcon size={14} /></button>}
                <button
                    onClick={handleDelete}
                    className={clsx(styles.actionBtn, styles.delete, isDeleting && styles.confirmDelete)}
                    data-tooltip={isDeleting ? "Confirm Delete" : "Delete"}
                    data-tooltip-pos="left"
                >
                    {isDeleting ? "Sure?" : <Trash2 size={14} />}
                </button>
            </div>
        </div >
    );
}
