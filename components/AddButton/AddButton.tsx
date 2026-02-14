"use client";

import React, { useState } from 'react';
import styles from './AddButton.module.css';
import { Plus, FileText, Link, Image as ImageIcon, FolderPlus, X } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { supabase } from '@/lib/supabase';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { generateId } from '@/lib/utils';

import InputModal from '@/components/InputModal/InputModal';

export default function AddButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'text' | 'link' | 'image' | 'folder' | null;
        placeholder: string;
        title: string;
        mode: 'text' | 'file';
    }>({ isOpen: false, type: null, placeholder: '', title: '', mode: 'text' });

    const { addItem, addFolder } = useItemsStore();
    const { position, scale } = useCanvasStore();

    const handleAddItemClick = (type: 'text' | 'link' | 'image' | 'folder') => {
        setIsOpen(false);
        setModalConfig({
            isOpen: true,
            type,
            title: type === 'folder' ? 'Create Folder' : `Add ${type === 'image' ? 'Image' : type === 'link' ? 'Link URL' : 'Note'}`,
            placeholder: type === 'folder' ? 'Folder Name' : type === 'text' ? 'Note Title' : 'example.com',
            mode: type === 'image' ? 'file' : 'text'
        });
    };

    const handleModalSubmit = (value: string) => {
        const { type } = modalConfig;
        if (!type) return;

        // Calculate center of screen
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const centerX = ((viewportW / 2) - position.x) / scale;
        const centerY = ((viewportH / 2) - position.y) / scale;
        const id = generateId();

        if (type === 'folder') {
            addFolder({
                id, name: value,
                status: 'active',
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString()
            } as any);
        } else {
            // For text, value is title. For link/image, value is content
            let content = type === 'text' ? '' : value;

            // Auto-prefix URL if link
            if (type === 'link' && content && !/^https?:\/\//i.test(content)) {
                content = 'https://' + content;
            }

            const title = type === 'text' ? value : type === 'link' ? 'Capturing...' : 'New Item';

            addItem({
                id, type: type as any,
                content: content,
                status: 'active',
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString(),
                metadata: { title }
            } as any);

            if (type === 'link') {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s Timeout

                // Get current user for background API sync (Directly from Supabase for efficiency)
                supabase.auth.getSession().then(({ data: { session } }: any) => {
                    const userId = session?.user?.id || 'unknown';

                    fetch('/api/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: content, itemId: id, userId, skipCapture: true }),
                        signal: controller.signal
                    })
                        .then(res => {
                            clearTimeout(timeoutId);
                            if (!res.ok) throw new Error('API Error');
                            return res.json();
                        })
                        .then(data => {
                            if (data.error) throw new Error(`${data.error}: ${data.details || 'Unknown error'}`);
                            useItemsStore.getState().updateItemContent(id, { metadata: data, syncStatus: 'synced' });
                        })
                        .catch(err => {
                            clearTimeout(timeoutId);
                            if (err.name === 'AbortError') return; // Silent for timeouts
                            console.error('Metadata fetch failed:', err);

                            let fallbackTitle = 'Link';
                            try {
                                const urlObj = new URL(content);
                                fallbackTitle = urlObj.hostname.replace('www.', '');
                            } catch (e) { }

                            useItemsStore.getState().updateItemContent(id, {
                                metadata: { title: fallbackTitle, description: '', image: '' },
                                syncStatus: 'synced'
                            });
                        });
                });
            }
        }
        setModalConfig({ ...modalConfig, isOpen: false });
    };

    return (
        <div className={styles.container}>
            {isOpen && (
                <div className={styles.options}>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('folder')} data-tooltip="Folder" data-tooltip-pos="top">
                        <FolderPlus size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('image')} data-tooltip="Image" data-tooltip-pos="top">
                        <ImageIcon size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('link')} data-tooltip="Link" data-tooltip-pos="top">
                        <Link size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('text')} data-tooltip="Text" data-tooltip-pos="top">
                        <FileText size={20} />
                    </button>
                </div>
            )}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.title}
                placeholder={modalConfig.placeholder}
                mode={modalConfig.mode}
            />
            <button
                className={`${styles.fab} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                data-tooltip={isOpen ? "Close Menu" : "Add Idea"}
                data-tooltip-pos="top"
            >
                <Plus size={24} className={styles.icon} />
            </button>
        </div>
    );
}
