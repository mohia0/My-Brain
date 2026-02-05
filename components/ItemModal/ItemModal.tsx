"use client";

import React, { useState, useEffect } from 'react';
import styles from './ItemModal.module.css';
import { Item, Tag } from '@/types';
import { useItemsStore } from '@/lib/store/itemsStore';
import { X, Save, Trash2, Plus, ExternalLink, Image as ImageIcon, Link, Copy, Check, Archive } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

const BlockEditor = dynamic(() => import('@/components/BlockEditor/BlockEditor'), { ssr: false });

interface ItemModalProps {
    itemId: string | null;
    onClose: () => void;
}

export default function ItemModal({ itemId, onClose }: ItemModalProps) {
    const { items, fetchData, updateItemContent, removeItem, archiveItem } = useItemsStore();
    const item = items.find(i => i.id === itemId);
    const isLink = item?.type === 'link';
    const screenshotUrl = item?.metadata?.image;
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState(''); // New state for link editing
    const [tags, setTags] = useState<Tag[]>([]);
    const [existingTags, setExistingTags] = useState<Tag[]>([]); // User's available tags
    const [isTypingTag, setIsTypingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isOverflowingHeader, setIsOverflowingHeader] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleRef = React.useRef<HTMLDivElement>(null);
    const headerTitleRef = React.useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        if (item) {
            setContent(item.content);
            setTitle(item.metadata?.title || '');
            setDescription(item.metadata?.description || '');
            if (item.type === 'link') setUrl(item.content); // Link URL
            fetchItemTags();
        }
    }, [item]);

    // Check for title overflow
    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current) {
                const isOver = titleRef.current.scrollWidth > titleRef.current.clientWidth;
                setIsOverflowing(isOver);
            }
            if (headerTitleRef.current) {
                const isOver = headerTitleRef.current.scrollWidth > headerTitleRef.current.clientWidth;
                setIsOverflowingHeader(isOver);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [title, isLink, isEditingTitle]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Fetch User Tags (Taxonomy)
    useEffect(() => {
        const fetchTags = async () => {
            const { data } = await supabase.from('tags').select('*');
            if (data) setExistingTags(data as Tag[]);
        };
        fetchTags();
    }, []);

    const fetchItemTags = async () => {
        if (!item) return;
        const { data } = await supabase
            .from('item_tags')
            .select('tag_id, tags(*)')
            .eq('item_id', item.id);

        if (data) {
            const tags = data.map((t: any) => t.tags).filter(Boolean) as Tag[];
            setTags(tags);
        }
    };

    if (!item) return null;

    const handleSave = () => {
        const finalContent = isLink ? url : content;
        updateItemContent(item.id, {
            content: finalContent,
            metadata: { ...item.metadata, title, description }
        });
        onClose();
    };

    const handleAddTag = async () => {
        if (!newTagName.trim()) {
            setIsTypingTag(false);
            return;
        }

        const tagName = newTagName.trim();
        let tag = existingTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

        // Create new tag if doesn't exist
        if (!tag) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.from('tags').insert({
                user_id: user.id,
                name: tagName,
                color: 'var(--accent)' // Default purple
            }).select().single();

            if (data) {
                tag = data as Tag;
                setExistingTags([...existingTags, tag]);
            }
        }

        if (tag) {
            // Link tag to item
            const { error } = await supabase.from('item_tags').insert({
                item_id: item.id,
                tag_id: tag.id
            });
            if (!error) {
                setTags([...tags, tag]);
            }
        }

        setNewTagName('');
        setIsTypingTag(false);
    };

    const handleRemoveTag = async (tagId: string) => {
        await supabase.from('item_tags').delete().match({ item_id: item.id, tag_id: tagId });
        setTags(tags.filter(t => t.id !== tagId));
    };

    const handleConvertToNote = () => {
        updateItemContent(item.id, {
            type: 'text',
            // Default content for note can be empty or the URL
            content: `Origin: ${item.content} \n\n${item.metadata?.description || ''} `
        });
        onClose();
    };

    const handleDelete = async () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        await removeItem(item!.id);
        onClose();
    };

    const handleArchive = async () => {
        await archiveItem(item!.id);
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
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (isLink) {
                    updateItemContent(item.id, {
                        metadata: { ...item.metadata, image: result }
                    });
                } else {
                    updateItemContent(item.id, { content: result });
                    setContent(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Render Logic
    // isLink moved up

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={clsx(styles.modal, isLink && styles.compactModal)} onClick={e => e.stopPropagation()}>
                <div className={clsx(styles.modalContent, isLink && styles.compactContent)}>

                    {/* LEFT COLUMN: PREVIEW */}
                    <div className={styles.leftColumn}>
                        {(isLink || item.type === 'image') && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleImageReplace}
                                />
                                <button
                                    className={styles.replaceImageBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Replace Image"
                                >
                                    <ImageIcon size={10} />
                                </button>
                            </>
                        )}
                        {isLink && screenshotUrl ? (
                            <img src={screenshotUrl || undefined} className={styles.previewImage} alt="Preview" />
                        ) : isLink ? (
                            <div className={styles.previewPlaceholder}>
                                <ExternalLink size={48} />
                                <span>No Screenshot</span>
                            </div>
                        ) : (item.type === 'image' && content) ? (
                            <img src={content || undefined} className={styles.previewImage} alt="Image" />
                        ) : (
                            // Text Editor for Notes
                            <div style={{ width: '100%', height: '100%', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
                                <BlockEditor initialContent={content} onChange={setContent} />
                            </div>
                        )}

                        {/* Metadata Overlay for Links */}
                        {isLink && (
                            <div className={styles.imageOverlay}>
                                <div className={styles.titleWrapper}>
                                    <div
                                        ref={titleRef}
                                        className={clsx(styles.overlayTitle, isOverflowing && styles.canAnimate)}
                                    >
                                        {title || 'Untitled Link'}
                                    </div>
                                </div>
                                <div className={styles.overlayDomain}>
                                    {url && <img src={`https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`} className={styles.favicon} alt="" />}
                                    {url ? new URL(url).hostname : 'No Source'}
                                </div >
                            </div >
                        )}
                    </div >

                    {/* RIGHT COLUMN: METADATA */}
                    < div className={styles.rightColumn} >
                        {/* Header */}
                        < div className={styles.header} >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {isEditingTitle ? (
                                    <input
                                        autoFocus
                                        className={styles.titleInputEdit}
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        onBlur={() => setIsEditingTitle(false)}
                                        onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                                        placeholder={isLink ? "Page Title" : "Note Title"}
                                    />
                                ) : (
                                    <div
                                        className={styles.titleDisplayWrapper}
                                        onClick={() => setIsEditingTitle(true)}
                                    >
                                        <div
                                            ref={headerTitleRef}
                                            className={clsx(styles.titleDisplayText, isOverflowingHeader && styles.canAnimate)}
                                        >
                                            {title || (isLink ? "Page Title" : "Note Title")}
                                        </div>
                                    </div>
                                )}
                                <div className={styles.timestamp}>
                                    {new Date(item.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                        </div >

                        {/* Body */}
                        < div className={styles.scrollBody} >



                            {/* URL Link Section */}
                            {
                                isLink && (
                                    <div className={styles.section}>
                                        <div className={styles.labelRow}>
                                            <span className={styles.label}>Source Link</span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className={styles.copyBtn} onClick={handleCopy} title="Copy Link">
                                                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                                                </button>
                                                <a href={url} target="_blank" className={styles.externalLinkIcon} title="Open in New Tab">
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                        <div className={styles.linkInputWrapper}>
                                            <Link size={16} className={styles.inputIcon} />
                                            <input
                                                className={styles.linkInput}
                                                value={url}
                                                onChange={e => setUrl(e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                )
                            }
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
                                        <input
                                            className={styles.tagInput}
                                            autoFocus
                                            value={newTagName}
                                            onChange={e => setNewTagName(e.target.value)}
                                            onBlur={handleAddTag}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                            placeholder="Tag name"
                                        />
                                    ) : (
                                        <button className={styles.addTagBtn} onClick={() => setIsTypingTag(true)}>
                                            + Add
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className={styles.section}>
                                <span className={styles.label}>Description</span>
                                <textarea
                                    className={styles.descriptionInput}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add a description or observation..."
                                />
                            </div>

                        </div >

                        {/* Footer */}
                        < div className={styles.footer} >
                            <div className={styles.footerLeft}>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={handleDelete}
                                    onMouseLeave={() => setIsDeleting(false)}
                                >
                                    {isDeleting ? "Confirm Delete?" : <Trash2 size={16} />}
                                </button>
                                <button
                                    className={styles.archiveBtn}
                                    onClick={handleArchive}
                                    title="Archive"
                                >
                                    <Archive size={16} />
                                </button>
                                {isLink && (
                                    <button className={styles.convertBtn} onClick={handleConvertToNote}>
                                        Turn to Note
                                    </button>
                                )}
                            </div>
                            <button className={styles.saveBtn} onClick={handleSave}>
                                <Save size={16} /> Save Changes
                            </button>
                        </div >
                    </div >

                </div >
            </div >
        </div >
    );
}
