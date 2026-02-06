"use client";

import React, { useState } from 'react';
import { Plus, Type, Link, Image as ImageIcon, FolderPlus, X } from 'lucide-react';
import styles from './MobileAddButton.module.css';
import clsx from 'clsx';

interface MobileAddButtonProps {
    onAdd: (type: 'text' | 'link' | 'image' | 'folder') => void;
}

export default function MobileAddButton({ onAdd }: MobileAddButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (type: 'text' | 'link' | 'image' | 'folder') => {
        onAdd(type);
        setIsOpen(false);
    };

    return (
        <div className={styles.container}>
            {isOpen && (
                <div className={styles.options}>
                    <button className={styles.optionBtn} onClick={() => handleAction('folder')} title="Folder">
                        <FolderPlus size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('image')} title="Image">
                        <ImageIcon size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('link')} title="Link">
                        <Link size={20} />
                    </button>
                    <button className={styles.optionBtn} onClick={() => handleAction('text')} title="Text">
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
