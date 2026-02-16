import React, { useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import { generateId, getApiUrl } from '@/lib/utils';
import styles from './Toolbar.module.css';
import { MousePointer2, Hand, Plus, FolderPlus, Image as ImageIcon, Link, FileText, Undo, Redo, Frame, DoorClosed } from 'lucide-react';
import clsx from 'clsx';
import InputModal from '@/components/InputModal/InputModal';

export default function Toolbar() {
    const { currentTool, setTool, position, scale } = useCanvasStore();
    const { addItem, addFolder, undo, redo, history } = useItemsStore();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'text' | 'link' | 'image' | 'folder' | 'room' | null;
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

    const handleAddItemClick = (type: 'text' | 'link' | 'image' | 'folder' | 'room') => {
        setIsAddOpen(false);

        setModalConfig({
            isOpen: true,
            type,
            title: type === 'folder' ? 'Create Folder' : type === 'room' ? 'New Mind Room' : `Add ${type === 'image' ? 'Image' : type === 'link' ? 'Link URL' : 'Idea'}`,
            placeholder: type === 'folder' ? 'Folder Name' : type === 'room' ? 'Room Name' : type === 'text' ? 'Idea Title' : 'example.com',
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
                id, user_id: 'unknown', name: value,
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString(),
                status: 'active'
            });
        } else if (type === 'room') {
            addItem({
                id, user_id: 'unknown', type: 'room',
                content: '',
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString(),
                status: 'active',
                metadata: { title: value }
            });
        } else {
            let content = type === 'text' ? '' : value;
            if (type === 'link' && content && !/^https?:\/\//i.test(content)) {
                content = 'https://' + content;
            }
            const title = type === 'text' ? value : type === 'link' ? 'Capturing Snapshot...' : 'New Idea';

            addItem({
                id, user_id: 'unknown', type: type as any,
                content: content,
                position_x: centerX, position_y: centerY,
                created_at: new Date().toISOString(),
                status: 'active',
                metadata: { title }
            });


            if (type === 'link') {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s Timeout

                fetch(getApiUrl('/api/metadata'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: content, itemId: id, skipCapture: true }),
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
                        data-tooltip="Select (V)"
                        data-tooltip-pos="top"
                    >
                        <MousePointer2 size={18} />
                    </button>

                    <button
                        className={clsx(styles.toolBtn, currentTool === 'hand' && styles.active)}
                        onClick={() => setTool('hand')}
                        data-tooltip="Pan (H)"
                        data-tooltip-pos="top"
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
                        data-tooltip="Undo (Ctrl+Z)"
                        data-tooltip-pos="top"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        className={styles.historyBtn}
                        onClick={redo}
                        disabled={history?.future.length === 0}
                        data-tooltip="Redo (Ctrl+Y)"
                        data-tooltip-pos="top"
                    >
                        <Redo size={16} />
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.addWrapper}>
                    <div className={clsx(styles.addMenu, isAddOpen && styles.addMenuOpen)}>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('room')} data-tooltip="Mind Room" data-tooltip-pos="top">
                            <DoorClosed size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('folder')} data-tooltip="Folder" data-tooltip-pos="top">
                            <FolderPlus size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => { setIsAddOpen(false); setTool('area'); }} data-tooltip="Project Area" data-tooltip-pos="top">
                            <Frame size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('image')} data-tooltip="Image" data-tooltip-pos="top">
                            <ImageIcon size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('link')} data-tooltip="Link" data-tooltip-pos="top">
                            <Link size={16} />
                        </button>
                        <button className={styles.addOption} onClick={() => handleAddItemClick('text')} data-tooltip="Text" data-tooltip-pos="top">
                            <FileText size={16} />
                        </button>
                    </div>
                    <button
                        className={clsx(styles.toolBtn, isAddOpen && styles.active)}
                        onClick={toggleAddMenu}
                        data-tooltip={isAddOpen ? undefined : "Add Idea"}
                        data-tooltip-pos="top"
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
