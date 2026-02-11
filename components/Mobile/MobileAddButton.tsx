"use client";

import React, { useState } from 'react';
import { Plus, Type, Link, Image as ImageIcon, Camera, FolderPlus, X } from 'lucide-react';
import styles from './MobileAddButton.module.css';
import clsx from 'clsx';

interface MobileAddButtonProps {
    onAdd: (type: 'text' | 'link' | 'image' | 'camera' | 'folder') => void;
}

export default function MobileAddButton({ onAdd }: MobileAddButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (type: 'text' | 'link' | 'image' | 'camera' | 'folder') => {
        onAdd(type);
        setIsOpen(false);
    };

    return (
        <div className={styles.container}>
            {isOpen && (
                <div className={styles.options}>
                    <button className={styles.optionBtn} onClick={() => handleAction('folder')} data-tooltip="Folder" data-tooltip-pos="top">
                        <FolderPlus size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('image')} data-tooltip="Gallery" data-tooltip-pos="top">
                        <ImageIcon size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('camera')} data-tooltip="Camera" data-tooltip-pos="top">
                        <Camera size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('link')} data-tooltip="Link" data-tooltip-pos="top">
                        <Link size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('text')} data-tooltip="Text" data-tooltip-pos="top">
                        <Type size={20} />
                    </button>
                </div>
            )}
            <button
                className={clsx(styles.addButton, isOpen && styles.open)}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Add Content"
            >
                {isOpen ? <X size={24} /> : <Plus size={24} />}
            </button>
        </div>
    );
}
