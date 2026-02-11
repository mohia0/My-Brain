"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './ItemModal.module.css';
import { Item, Tag } from '@/types';
import { useItemsStore } from '@/lib/store/itemsStore';
import { X, Save, Trash2, Plus, ExternalLink, Image as ImageIcon, Link, Copy, Check, Archive, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';

const BlockEditor = dynamic(() => import('@/components/BlockEditor/BlockEditor'), { ssr: false });

interface ItemModalProps {
    itemId: string | null;
    onClose: () => void;
}

export default function ItemModal({ itemId, onClose }: ItemModalProps) {
    const { items, fetchData, updateItemContent, removeItem, archiveItem } = useItemsStore();
    const item = items.find(i => i.id === itemId);
    const isLink = item?.type === 'link';
    const isNote = item?.type === 'text';
    const screenshotUrl = item?.metadata?.image;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [existingTags, setExistingTags] = useState<Tag[]>([]);
    const [isTypingTag, setIsTypingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isOverflowingHeader, setIsOverflowingHeader] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const headerTitleRef = useRef<HTMLDivElement>(null);
    const scrollBodyRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(onClose, 150, scrollBodyRef);

    useEffect(() => {
        if (item) {
            // Update title if:
            // 1. Local state is empty OR
            // 2. Local state is just a 'Capturing' placeholder but store has a real title
            const isLocalPlaceholder = !title || /capturing|shared link|sharedlink/i.test(title);
            const isStoreBetter = item.metadata?.title && !/capturing|shared link|sharedlink/i.test(item.metadata.title);

            if (!isEditingTitle && (isLocalPlaceholder || title === '')) {
                if (item.metadata?.title) {
                    setTitle(item.metadata.title);
                } else if (item.type === 'text') {
                    // Deriving title from content
                    let displayContent = item.content;
                    if (displayContent.startsWith('[') || displayContent.startsWith('{')) {
                        try {
                            const blocks = JSON.parse(displayContent);
                            displayContent = Array.isArray(blocks)
                                ? blocks.map((b: any) => Array.isArray(b.content) ? b.content.map((c: any) => c.text).join('') : b.content || '').join(' ')
                                : displayContent;
                        } catch { }
                    }
                    const clean = displayContent.trim();
                    if (clean) {
                        setTitle(clean.length > 50 ? clean.substring(0, 50) + '...' : clean);
                    }
                }
            } else if (!isEditingTitle && isLocalPlaceholder && isStoreBetter) {
                setTitle(item.metadata?.title || '');
            }

            // Sync description similarly
            if (!description || description === '' || (description.startsWith('http') && item.metadata?.description && !item.metadata.description.startsWith('http'))) {
                setDescription(item.metadata?.description || '');
            }

            if (content !== item.content) {
                setContent(item.content);
            }
            if (item.type === 'link') setUrl(item.content);
            fetchItemTags();

            // Polling for metadata if it's a fresh capture missing images/titles
            if (item.type === 'link' && (!item.metadata?.image || item.metadata?.title === 'Capturing...' || item.metadata?.title === 'Shared Link')) {
                let attempts = 0;
                const poll = setInterval(async () => {
                    attempts++;
                    if (attempts > 20) { clearInterval(poll); return; }
                    if (attempts > 25) { clearInterval(poll); return; }

                    const { data } = await supabase.from('items').select('metadata').eq('id', item.id).single();
                    const newMeta = data?.metadata;

                    if (newMeta) {
                        const hasImage = !!newMeta.image;
                        const isPlaceholder = !newMeta.title || /capturing|shared link|sharedlink/i.test(newMeta.title);

                        // Always update local state if we found something new or better
                        if (!isPlaceholder || hasImage || newMeta.author !== item.metadata?.author) {
                            updateItemContent(item.id, { metadata: newMeta });
                        }

                        // ONLY stop polling if we have the image OR we've exhausted all attempts
                        if (hasImage) {
                            clearInterval(poll);
                        }
                    }
                }, 3000);
                return () => clearInterval(poll);
            }
        }
    }, [item?.id, item?.metadata?.image, item?.metadata?.title, item?.content]);

    // Live Auto-save Effect
    useEffect(() => {
        if (!item) return;

        // Check if anything has actually changed
        const hasTitleChanged = title !== (item.metadata?.title || '');
        const hasDescChanged = description !== (item.metadata?.description || '');
        const hasContentChanged = content !== item.content;

        if (!hasTitleChanged && !hasDescChanged && !hasContentChanged) {
            return;
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await updateItemContent(item.id, {
                    content: content,
                    metadata: { ...item.metadata, title, description }
                });
            } catch (err) {
                console.error("[LiveSync] Save failed:", err);
            } finally {
                setTimeout(() => setIsSaving(false), 500);

            }
        }, 1000); // 1s debounce for better responsiveness

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [title, description, content]);

    const hasChanged = item && (
        title !== (item.metadata?.title || '') ||
        description !== (item.metadata?.description || '') ||
        content !== item.content
    );

    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current) {
                const overflowing = titleRef.current.scrollWidth > titleRef.current.clientWidth;
                setIsOverflowing(overflowing);
                if (overflowing) {
                    const dist = titleRef.current.clientWidth - titleRef.current.scrollWidth;
                    titleRef.current.style.setProperty('--scroll-dist-overlay', `${dist}px`);
                }
            }
            if (headerTitleRef.current) {
                const overflowing = headerTitleRef.current.scrollWidth > headerTitleRef.current.clientWidth;
                setIsOverflowingHeader(overflowing);
                if (overflowing) {
                    const dist = headerTitleRef.current.clientWidth - headerTitleRef.current.scrollWidth - 20;
                    headerTitleRef.current.style.setProperty('--scroll-dist-header', `${dist}px`);
                }
            }
        };
        checkOverflow();
        // Set a small timeout to ensure layout has settled
        const timer = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => {
            window.removeEventListener('resize', checkOverflow);
            clearTimeout(timer);
        };
    }, [title, isLink, isEditingTitle]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);

        const onSystemBack = (e: Event) => {
            e.preventDefault();
            onClose();
        };
        window.addEventListener('systemBack', onSystemBack);

        return () => {
            window.removeEventListener('keydown', handleEsc);
            window.removeEventListener('systemBack', onSystemBack);
        };
    }, [onClose]);

    useEffect(() => {
        const fetchAllTags = async () => {
            try {
                const { data } = await supabase.from('tags').select('*');
                if (data) setExistingTags(data as Tag[]);
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error("Failed to fetch all tags:", err);
            }
        };
        fetchAllTags();
    }, []);

    const fetchItemTags = async () => {
        if (!item) return;
        try {
            const { data } = await supabase.from('item_tags').select('tag_id, tags(*)').eq('item_id', item.id);
            if (data) setTags(data.map((t: any) => t.tags).filter(Boolean) as Tag[]);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error("Failed to fetch item tags:", err);
        }
    };

    if (!item) return null;

    const handleSave = () => {
        // Final explicit save if any pending
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            updateItemContent(item.id, {
                content: isLink ? url : content,
                metadata: { ...item.metadata, title, description }
            });
        }
        onClose();
    };

    const handleAddTag = async () => {
        if (!newTagName.trim()) { setIsTypingTag(false); return; }
        const tagName = newTagName.trim();
        let tag = existingTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (!tag) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from('tags').insert({ user_id: user.id, name: tagName, color: 'var(--accent)' }).select().single();
            if (data) { tag = data as Tag; setExistingTags([...existingTags, tag]); }
        }
        if (tag) {
            const { error } = await supabase.from('item_tags').insert({ item_id: item.id, tag_id: tag.id });
            if (!error) setTags([...tags, tag]);
        }
        setNewTagName('');
        setIsTypingTag(false);
    };

    const handleRemoveTag = async (tagId: string) => {
        await supabase.from('item_tags').delete().match({ item_id: item.id, tag_id: tagId });
        setTags(tags.filter(t => t.id !== tagId));
    };


    const handleDelete = async () => {
        if (!isDeleting) { setIsDeleting(true); return; }
        await removeItem(item.id);
        onClose();
    };

    const handleArchive = async () => {
        await archiveItem(item.id);
        onClose();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImageReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const result = re.target?.result as string;
                if (isLink) updateItemContent(item.id, { metadata: { ...item.metadata, image: result } });
                else { updateItemContent(item.id, { content: result }); setContent(result); }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                className={clsx(
                    styles.modal,
                    isLink && styles.compactModal,
                    isNote && styles.noteModal,
                    ((item.type === 'image' || item.type === 'video') || item.metadata?.isVideo) && styles.imageModal
                )}
                onClick={e => e.stopPropagation()}
                style={{
                    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
                    transition: offset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                }}
            >
                <div className={styles.swipeHandle} />
                <div className={clsx(styles.modalContent, isLink && styles.compactContent)}>

                    {/* LEFT COLUMN: PRIMARY VIEW */}
                    <div className={styles.leftColumn}>
                        {isNote ? (
                            <div className={styles.noteLayout}>
                                <div className={styles.noteTitleSection}>
                                    {isEditingTitle ? (
                                        <input
                                            ref={titleInputRef}
                                            autoFocus
                                            className={styles.noteTitleInput}
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            onBlur={() => setIsEditingTitle(false)}
                                            onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                                            placeholder="Idea Title"
                                        />
                                    ) : (
                                        <div className={styles.noteTitleDisplay} onClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }}>
                                            {title || "Idea Title"}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.editorWrapper}>
                                    <BlockEditor initialContent={content} onChange={setContent} />
                                </div>
                            </div>
                        ) : (
                            <div className={styles.visualContainer}>
                                {item.type !== 'video' && !item.metadata?.isVideo && (
                                    <>
                                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageReplace} />
                                        <button className={styles.replaceImageBtn} onClick={() => fileInputRef.current?.click()}>
                                            <ImageIcon size={18} />
                                            <span>Replace Image</span>
                                        </button>
                                    </>
                                )}

                                {isLink ? (
                                    <>
                                        {screenshotUrl ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.imageLinkWrapper}>
                                                <img src={screenshotUrl} className={styles.previewImage} alt="Snapshot" />
                                            </a>
                                        ) : (
                                            <div className={styles.previewPlaceholder}>
                                                <div className={styles.captureSpinner}>
                                                    <ExternalLink size={32} className={styles.pulseIcon} />
                                                </div>
                                                <span className={styles.loadingText}>
                                                    {isSaving || item.syncStatus === 'syncing' ? 'Analyzing Link...' : 'Capturing Snapshot...'}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (item.type === 'video' || item.metadata?.isVideo) ? (
                                    <video
                                        src={content}
                                        controls
                                        autoPlay
                                        className={styles.previewVideo}
                                        poster={item.metadata?.thumbnail}
                                    />
                                ) : item.type === 'image' ? (
                                    content ? (
                                        item.metadata?.url ? (
                                            <a href={item.metadata.url} target="_blank" rel="noopener noreferrer">
                                                <img src={content} className={styles.previewImage} alt="Idea" />
                                            </a>
                                        ) : (
                                            <img src={content} className={styles.previewImage} alt="Idea" />
                                        )
                                    ) : (
                                        <div className={styles.previewPlaceholder}>
                                            <ImageIcon size={48} />
                                            <span>Image Missing</span>
                                        </div>
                                    )
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: METADATA */}
                    <div className={clsx(styles.rightColumn, (isNote || item.type === 'image') && styles.compactMetadata)}>
                        <div className={styles.header}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={styles.timestamp}>
                                    {item.metadata?.siteName || 'Shared'} • {new Date(item.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {(isSaving || item.syncStatus === 'syncing') && <div className={styles.savingIndicator}>Saving...</div>}
                                {item.metadata?.author && <div className={styles.authorBadge}>by {item.metadata.author}</div>}
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                        </div>

                        <div className={styles.scrollBody} ref={scrollBodyRef}>
                            {!isNote && (
                                <div className={styles.captureTitleSection}>
                                    {isEditingTitle ? (
                                        <input
                                            ref={titleInputRef}
                                            autoFocus
                                            className={styles.titleInputEdit}
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            onBlur={() => setIsEditingTitle(false)}
                                            onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                                            placeholder="Capture Title"
                                        />
                                    ) : (
                                        <div
                                            className={styles.captureTitleWrapper}
                                            onClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }}
                                        >
                                            <h1
                                                className={clsx(
                                                    styles.captureTitle,
                                                    title.split(' ').length > 7 && styles.titleLong
                                                )}
                                            >
                                                {title || "Untitled Capture"}
                                            </h1>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isLink && (
                                <div className={styles.section}>
                                    <div className={styles.labelRow}>
                                        <span className={styles.label}>Source</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className={styles.copyBtn} onClick={handleCopy}>{copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}</button>
                                            <a href={url} target="_blank" className={styles.externalLinkIcon}><ExternalLink size={14} /></a>
                                        </div>
                                    </div>
                                    <div className={styles.linkInputWrapper}>
                                        <Link size={16} className={styles.inputIcon} />
                                        <input className={styles.linkInput} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                                    </div>
                                </div>
                            )}

                            <div className={styles.section}>
                                <span className={styles.label}>Tags</span>
                                <div className={styles.tagsWrapper}>
                                    {tags.map(tag => (
                                        <div key={tag.id} className={styles.tag}>
                                            <div className={styles.tagDot} style={{ background: tag.color }} />
                                            {tag.name}
                                            <button className={styles.removeTag} onClick={() => handleRemoveTag(tag.id)}>×</button>
                                        </div>
                                    ))}
                                    {isTypingTag ? (
                                        <input className={styles.tagInput} autoFocus value={newTagName} onChange={e => setNewTagName(e.target.value)} onBlur={handleAddTag} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Tag..." />
                                    ) : (
                                        <button className={styles.addTagBtn} onClick={() => setIsTypingTag(true)}>+ Add</button>
                                    )}
                                </div>
                            </div>

                            <div className={clsx(styles.section, styles.descriptionSection)}>
                                <div className={styles.labelRow}>
                                    <span className={styles.label}>Notes</span>
                                    <button
                                        className={styles.expandEditorBtn}
                                        onClick={() => {
                                            const textarea = document.querySelector(`.${styles.descriptionInput}`) as HTMLTextAreaElement;
                                            if (textarea) textarea.focus();
                                        }}
                                    >
                                        <Maximize2 size={12} />
                                    </button>
                                </div>
                                <textarea
                                    className={styles.descriptionInput}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add thoughts..."
                                />
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button className={styles.archiveBtn} onClick={handleArchive}>
                                <Archive size={18} />
                                <span>Archive</span>
                            </button>
                            <button
                                className={clsx(styles.deleteBtn, isDeleting && styles.confirmDelete)}
                                onClick={handleDelete}
                                onMouseLeave={() => setIsDeleting(false)}
                            >
                                <Trash2 size={18} />
                                <span>{isDeleting ? "Confirm?" : "Delete"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
