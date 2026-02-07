"use client";

import React, { useState } from 'react';
import styles from './AddButton.module.css';
import { Plus, Type, Link, Image as ImageIcon, FolderPlus, X } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
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
                id, user_id: 'user-1', name: value,
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString()
            });
        } else {
            // For text, value is title. For link/image, value is content
            let content = type === 'text' ? '' : value;

            // Auto-prefix URL if link
            if (type === 'link' && content && !/^https?:\/\//i.test(content)) {
                content = 'https://' + content;
            }

            const title = type === 'text' ? value : 'New Item';

            addItem({
                id, user_id: 'user-1', type: type as any,
                content: content,
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString(),
                metadata: { title }
            });

            if (type === 'link') {
                fetch('/api/metadata', { method: 'POST', body: JSON.stringify({ url: content }) })
                    .then(res => res.json())
                    .then(data => useItemsStore.getState().updateItemContent(id, { metadata: data }));
            }
        }
        setModalConfig({ ...modalConfig, isOpen: false });
    };

    return (
        <div className={styles.container}>
            {isOpen && (
                <div className={styles.options}>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('folder')} title="Folder">
                        <FolderPlus size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('image')} title="Image">
                        <ImageIcon size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('link')} title="Link">
                        <Link size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAddItemClick('text')} title="Text">
                        <Type size={20} />
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
            >
                <Plus size={24} className={styles.icon} />
            </button>
        </div>
    );
}
