"use client";

import React, { useState, useEffect } from 'react';
import styles from './ItemModal.module.css';
import { Item, Tag } from '@/types';
import { useItemsStore } from '@/lib/store/itemsStore';
import { X, Save, Trash2, Plus, ExternalLink, Image as ImageIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

const BlockEditor = dynamic(() => import('@/components/BlockEditor/BlockEditor'), { ssr: false });

interface ItemModalProps {
    itemId: string | null;
    onClose: () => void;
}

export default function ItemModal({ itemId, onClose }: ItemModalProps) {
    const { items, updateItemContent, removeItem } = useItemsStore();
    const item = items.find(i => i.id === itemId);

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [existingTags, setExistingTags] = useState<Tag[]>([]); // User's available tags
    const [isTypingTag, setIsTypingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial Load
    useEffect(() => {
        if (item) {
            setContent(item.content);
            setTitle(item.metadata?.title || '');
            setDescription(item.metadata?.description || '');
            fetchItemTags();
        }
    }, [item]);

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
        updateItemContent(item.id, {
            content,
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
            content: `Origin: ${item.content}\n\n${item.metadata?.description || ''}`
        });
        onClose();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        removeItem(item.id);
        onClose();
    };

    // Render Logic
    const isLink = item.type === 'link';
    const screenshotUrl = item.metadata?.image;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={clsx(styles.modal, isLink && styles.compactModal)} onClick={e => e.stopPropagation()}>
                <div className={clsx(styles.modalContent, isLink && styles.compactContent)}>

                    {/* LEFT COLUMN: PREVIEW */}
                    <div className={styles.leftColumn}>
                        {isLink && screenshotUrl ? (
                            <img src={screenshotUrl} className={styles.previewImage} alt="Preview" />
                        ) : isLink ? (
                            <div className={styles.previewPlaceholder}>
                                <ExternalLink size={48} />
                                <span>No Screenshot</span>
                            </div>
                        ) : item.type === 'image' ? (
                            <img src={content} className={styles.previewImage} alt="Image" />
                        ) : (
                            // Text Editor for Notes
                            <div style={{ width: '100%', height: '100%', padding: '0 0 20px 0', background: 'transparent' }}>
                                <BlockEditor initialContent={content} onChange={setContent} />
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: METADATA */}
                    <div className={styles.rightColumn}>
                        {/* Header */}
                        <div className={styles.header}>
                            <div style={{ flex: 1 }}>
                                <input
                                    className={styles.titleInput}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder={isLink ? "Page Title" : "Note Title"}
                                />
                                <div className={styles.timestamp}>
                                    {new Date(item.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                        </div>

                        {/* Body */}
                        <div className={styles.scrollBody}>

                            {/* URL Link */}
                            {isLink && (
                                <div className={styles.section}>
                                    <span className={styles.label}>Source</span>
                                    <a href={item.content} target="_blank" className={styles.urlLink}>
                                        {item.content} <ExternalLink size={12} style={{ display: 'inline' }} />
                                    </a>
                                </div>
                            )}

                            {/* Tags */}
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

                        </div>

                        {/* Footer */}
                        <div className={styles.footer}>
                            <div className={styles.footerLeft}>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={handleDelete}
                                    onMouseLeave={() => setIsDeleting(false)}
                                >
                                    {isDeleting ? "Confirm Delete?" : <Trash2 size={16} />}
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
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
