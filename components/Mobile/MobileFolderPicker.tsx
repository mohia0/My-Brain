"use client";

import React from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { Folder, X, Search, ChevronRight, Inbox, FolderPlus } from 'lucide-react';
import styles from './MobileFolderPicker.module.css';
import { generateId } from '@/lib/utils';
import clsx from 'clsx';

interface MobileFolderPickerProps {
    onClose: () => void;
    onSelect: (folderId: string | null) => void;
    title?: string;
}

export default function MobileFolderPicker({ onClose, onSelect, title = 'Move to Folder' }: MobileFolderPickerProps) {
    const { folders, selectedIds, addFolder } = useItemsStore();
    const [search, setSearch] = React.useState('');

    const handleCreateFolder = async () => {
        const name = prompt('Folder name:');
        if (!name) return;

        const newFolder = {
            id: generateId(),
            user_id: '', // Will be set by store
            name,
            position_x: 0,
            position_y: 0,
            created_at: new Date().toISOString(),
            status: 'active' as const
        };
        addFolder(newFolder);
    };

    // Helper to check if a folder is a descendant of another
    const isDescendant = (folderId: string, potentialParentId: string): boolean => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder || !folder.parent_id) return false;
        if (folder.parent_id === potentialParentId) return true;
        return isDescendant(folder.parent_id, potentialParentId);
    };

    // Filter out folders that are currently selected OR are descendants of selected folders
    const availableFolders = folders.filter(f => {
        const isSelected = selectedIds.includes(f.id);
        const isSelectedDescendant = selectedIds.some(sid => isDescendant(f.id, sid));

        return !isSelected &&
            !isSelectedDescendant &&
            f.status !== 'archived' &&
            (search === '' || f.name.toLowerCase().includes(search.toLowerCase()))
    }).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.swipeHandle} />

                <header className={styles.header}>
                    <div className={styles.titleArea}>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                        <h2>{title}</h2>
                    </div>
                    <button className={styles.createFolderBtn} onClick={handleCreateFolder}>
                        <FolderPlus size={20} />
                    </button>
                </header>

                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search folders..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className={styles.folderList}>
                    {!search && (
                        <button
                            className={styles.folderItem}
                            onClick={() => onSelect(null)}
                        >
                            <div className={styles.folderIcon} style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <Inbox size={20} />
                            </div>
                            <div className={styles.folderInfo}>
                                <span className={styles.folderName}>Brains / Root</span>
                                <span className={styles.folderPath}>Top level library</span>
                            </div>
                            <ChevronRight size={18} className={styles.chevron} />
                        </button>
                    )}

                    {availableFolders.map(folder => (
                        <button
                            key={folder.id}
                            className={styles.folderItem}
                            onClick={() => onSelect(folder.id)}
                        >
                            <div className={styles.folderIcon} style={{ background: folder.color ? `${folder.color}15` : 'rgba(110, 86, 207, 0.1)', color: folder.color || 'var(--accent)' }}>
                                <Folder size={20} />
                            </div>
                            <div className={styles.folderInfo}>
                                <span className={styles.folderName}>{folder.name}</span>
                                <span className={styles.folderPath}>Inside Brainia</span>
                            </div>
                            <ChevronRight size={18} className={styles.chevron} />
                        </button>
                    ))}

                    {availableFolders.length === 0 && search && (
                        <div className={styles.empty}>
                            <p>No folders found matching "{search}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
