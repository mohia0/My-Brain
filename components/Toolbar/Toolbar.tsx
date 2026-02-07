import React, { useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import { generateId } from '@/lib/utils';
import styles from './Toolbar.module.css';
import { MousePointer2, Hand, Plus, FolderPlus, Image as ImageIcon, Link, Type, Undo, Redo } from 'lucide-react';
import clsx from 'clsx';
import InputModal from '@/components/InputModal/InputModal';

export default function Toolbar() {
    const { currentTool, setTool, position, scale } = useCanvasStore();
    const { addItem, addFolder, undo, redo, history } = useItemsStore();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'text' | 'link' | 'image' | 'folder' | null;
        title: string;
        placeholder: string;
        mode?: 'text' | 'file';
    }>({
        isOpen: false,
        type: null,
        title: '',
        placeholder: '',
        mode: 'text'
    });

    const toggleAddMenu = () => {
        setIsAddOpen(!isAddOpen);
    };

    const handleAddItemClick = (type: 'text' | 'link' | 'image' | 'folder') => {
        setIsAddOpen(false);

        setModalConfig({
            isOpen: true,
            type,
            title: type === 'folder' ? 'Create Folder' : `Add ${type === 'image' ? 'Image' : type === 'link' ? 'Link URL' : 'Idea'}`,
            placeholder: type === 'folder' ? 'Folder Name' : type === 'text' ? 'Idea Title' : 'example.com',
            mode: type === 'image' ? 'file' : 'text'
        });
    };

    const handleModalSubmit = (value: string) => {
        // ... previous logic remains unchanged ...
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
            let content = type === 'text' ? '' : value;
            if (type === 'link' && content && !/^https?:\/\//i.test(content)) {
                content = 'https://' + content;
            }
            const title = type === 'text' ? value : 'New Idea';

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
                <div className={styles.toolSection}>
                    <button
                        className={clsx(styles.toolBtn, currentTool === 'mouse' && styles.active)}
                        onClick={() => setTool('mouse')}
                        title="Select (V)"
                    >
                        <MousePointer2 size={18} />
                    </button>

                    <button
                        className={clsx(styles.toolBtn, currentTool === 'hand' && styles.active)}
                        onClick={() => setTool('hand')}
                        title="Pan (H)"
                    >
                        <Hand size={18} />
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.historySection}>
                    <button
                        className={styles.historyBtn}
                        onClick={undo}
                        disabled={history?.past.length === 0}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        className={styles.historyBtn}
                        onClick={redo}
                        disabled={history?.future.length === 0}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={16} />
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.addWrapper}>
                    <div className={clsx(styles.addMenu, isAddOpen && styles.addMenuOpen)}>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('folder')} title="Folder">
                            <FolderPlus size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('image')} title="Image">
                            <ImageIcon size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('link')} title="Link">
                            <Link size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('text')} title="Text">
                            <Type size={16} />
                        </button>
                    </div>
                    <button
                        className={clsx(styles.toolBtn, isAddOpen && styles.active)}
                        onClick={toggleAddMenu}
                        title="Add Idea"
                    >
                        <Plus size={18} style={{
                            transform: isAddOpen ? 'rotate(135deg)' : 'none',
                            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} />
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
