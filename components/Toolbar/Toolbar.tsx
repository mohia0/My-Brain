import React, { useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './Toolbar.module.css';
import { MousePointer2, Hand, Plus, FolderPlus, Image as ImageIcon, Link, Type } from 'lucide-react';
import clsx from 'clsx';
import InputModal from '@/components/InputModal/InputModal';

export default function Toolbar() {
    const { currentTool, setTool, position, scale } = useCanvasStore();
    const { addItem, addFolder } = useItemsStore();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'text' | 'link' | 'image' | 'folder' | null;
        placeholder: string;
        title: string;
        mode: 'text' | 'file';
    }>({ isOpen: false, type: null, placeholder: '', title: '', mode: 'text' });

    const handleAddItemClick = (type: 'text' | 'link' | 'image' | 'folder') => {
        setIsAddOpen(false);
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
        const id = crypto.randomUUID();

        if (type === 'folder') {
            addFolder({
                id, user_id: 'user-1', name: value,
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString()
            });
        } else {
            let content = type === 'text' ? '' : value;
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
        <>
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

                <div className={styles.divider} />

                <div className={styles.addWrapper}>
                    {isAddOpen && (
                        <div className={styles.addMenu}>
                            <button className={styles.addOption} onClick={() => handleAddItemClick('folder')} title="Folder">
                                <FolderPlus size={18} />
                            </button>
                            <button className={styles.addOption} onClick={() => handleAddItemClick('image')} title="Image">
                                <ImageIcon size={18} />
                            </button>
                            <button className={styles.addOption} onClick={() => handleAddItemClick('link')} title="Link">
                                <Link size={18} />
                            </button>
                            <button className={styles.addOption} onClick={() => handleAddItemClick('text')} title="Text">
                                <Type size={18} />
                            </button>
                            <div className={styles.divider} />
                        </div>
                    )}
                    <button
                        className={clsx(styles.toolBtn, isAddOpen && styles.active)}
                        onClick={() => setIsAddOpen(!isAddOpen)}
                        title="Add Item"
                    >
                        <Plus size={20} style={{ transform: isAddOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                </div>
            </div>

            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.title}
                placeholder={modalConfig.placeholder}
                mode={modalConfig.mode}
            />
        </>
    );
}
