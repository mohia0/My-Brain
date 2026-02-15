"use client";

import React, { useState } from 'react';
import styles from './Header.module.css';
import { Search, Folder as FolderIcon, DoorClosed, Lock, Unlock, ShieldAlert, Link, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useVaultStore } from '@/components/Vault/VaultAuthModal';
import Orb from '../Orb/Orb';
import clsx from 'clsx';

// Helper to extract text from rich JSON content (TipTap format)
const getPlainText = (content: string) => {
    if (!content) return '';
    if (!content.startsWith('[')) return content;
    try {
        const blocks = JSON.parse(content);
        if (Array.isArray(blocks)) {
            return blocks.map((b: any) => {
                if (Array.isArray(b.content)) {
                    return b.content.map((c: any) => c.text).join('');
                }
                return b.content || '';
            }).join(' ');
        }
        return content;
    } catch {
        return content;
    }
};

import { HighlightText } from '../ui/HighlightText';

export default function Header() {
    const { items, folders, setSelection, vaultedItemsRevealed } = useItemsStore();
    const { setPosition, setScale, setOpenFolderId } = useCanvasStore();
    const { isVaultLocked, unlockedIds } = useVaultStore();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    React.useEffect(() => {
        const savedTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
        setTheme(savedTheme);

        // Optional: observe attribute changes
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
            setTheme(currentTheme);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const searchTokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);

    const filteredFolders = folders.filter(folder => {
        if (searchTokens.length === 0) return false;
        const name = folder.name.toLowerCase();
        return searchTokens.every(token => name.includes(token));
    });

    const filteredItems = items.filter(item => {
        if (searchTokens.length === 0) return false;

        const title = (item.metadata?.title || '').toString().toLowerCase();
        const rawContent = (item.content || '').toString();
        const plainText = getPlainText(rawContent).toLowerCase();
        const description = (item.metadata?.description || '').toString().toLowerCase();

        const tags = Array.isArray(item.metadata?.tags)
            ? item.metadata.tags.map((t: any) => (typeof t === 'string' ? t : t.name).toLowerCase())
            : [];

        // Smart AND logic: every token must match at least one field
        return searchTokens.every(token =>
            title.includes(token) ||
            plainText.includes(token) ||
            description.includes(token) ||
            tags.some((t: string) => t.includes(token))
        );
    });

    const getScore = (result: any) => {
        const q = query.toLowerCase().trim();
        const title = (result.resultType === 'folder' ? result.name : (result.metadata?.title || '')).toString().toLowerCase();
        const description = (result.metadata?.description || '').toString().toLowerCase();

        let score = 0;
        // Exact title match is highest
        if (title === q) score += 1000;
        // Title starts with query
        else if (title.startsWith(q)) score += 500;
        // Title contains all words in order
        else if (title.includes(q)) score += 300;
        // Individual word matches in title
        searchTokens.forEach(token => {
            if (title.includes(token)) score += 50;
        });

        // Content/Description matches
        if (description.includes(q)) score += 100;

        // Prefer folders if searching for a short string that matches many things
        if (result.resultType === 'folder' && title.includes(q)) score += 50;

        return score;
    };

    const allResults = [
        ...filteredFolders.map(f => ({ ...f, resultType: 'folder' })),
        ...filteredItems.map(i => ({ ...i, resultType: 'item' }))
    ].sort((a, b) => getScore(b) - getScore(a));

    const handleResultClick = (result: any) => {
        // Center on item at target zoom level
        const targetScale = 1.105;
        // setScale(targetScale); // WIll do conditionally later

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        let targetX = result.position_x;
        let targetY = result.position_y;
        let isInsideFolder = false;

        // Correct position if inside a folder
        if (result.resultType === 'item' && result.folder_id) {
            const folder = folders.find(f => f.id === result.folder_id);
            if (folder) {
                targetX = folder.position_x;
                targetY = folder.position_y;
                isInsideFolder = true;
                setOpenFolderId(folder.id);
            }
        }

        // Width/Height offsets to center the card (or folder)
        let itemW = 200;
        let itemH = 130;

        if (result.resultType === 'folder' || isInsideFolder) {
            itemW = 280; // Folder width
            itemH = 120; // Folder height
        } else if (result.type === 'link' && result.metadata?.image) {
            itemW = 300;
            itemH = 100;
        } else if (result.type === 'link') {
            itemW = 200;
            itemH = 40;
        }

        if (!isInsideFolder) {
            const newX = (viewportW / 2) - (targetX + itemW / 2) * targetScale;
            const newY = (viewportH / 2) - (targetY + itemH / 2) * targetScale;
            setPosition(newX, newY);
            // Only zoom if on canvas
            setScale(targetScale);
        } else {
            // Just open selector. Folder highlights automatically via openFolderId
        }

        // Focus mode: Select the item/folder
        setSelection([result.id]);

        setShowResults(false);
        setQuery('');
    };

    return (
        <header className={styles.header}>
            <div className={styles.logo} onClick={() => {
                setPosition(window.innerWidth / 2, window.innerHeight / 2);
                setScale(0.65);
            }}>
                <div className={styles.logoDotWrapper}>
                    <Orb
                        hue={280}
                        hoverIntensity={0.8}
                        forceHoverState={true}
                        backgroundColor="transparent"
                    />
                </div>
                <h1>Brainia</h1>
            </div>

            <div className={styles.searchWrapper}>

                <Search size={16} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search your brain..."
                    className={styles.searchInput}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 400)}
                />

                <div className={clsx(styles.searchResults, (showResults && query.trim()) && styles.resultsOpen)}>
                    {allResults.length === 0 ? (
                        <div className={styles.noResults}>No matches found. Try searching for tags or text.</div>
                    ) : (
                        allResults.map((result: any) => {
                            const projectAreas = items.filter(i => i.type === 'project');
                            let insideProject = null;

                            if (result.resultType === 'item' && result.type !== 'project') {
                                // Calculate center of item
                                const iW = result.metadata?.width || 200;
                                const iH = result.metadata?.height || 130;
                                const cx = result.position_x + iW / 2;
                                const cy = result.position_y + iH / 2;

                                insideProject = projectAreas.find(p => {
                                    const pW = p.metadata?.width || 300;
                                    const pH = p.metadata?.height || 200;
                                    return cx > p.position_x && cx < p.position_x + pW &&
                                        cy > p.position_y && cy < p.position_y + pH;
                                });
                            }

                            const isObscured = result.is_vaulted && isVaultLocked && !unlockedIds.includes(result.id) && !vaultedItemsRevealed.includes(result.id);

                            return (
                                <div key={result.id} className={clsx(styles.searchResultItem, isObscured && styles.resultObscured)} onClick={() => handleResultClick(result)}>
                                    {result.resultType === 'folder' ? (
                                        <div className={styles.resultIcon}>
                                            <FolderIcon
                                                size={16}
                                                fill={result.color ? `${result.color}22` : undefined}
                                                color={result.color || "var(--accent)"}
                                            />
                                        </div>
                                    ) : (
                                        (result.type === 'image' || (result.type === 'link' && result.metadata?.image)) ? (
                                            <div className={styles.resultImgWrapper}>
                                                <img
                                                    src={result.type === 'image' ? result.content : result.metadata?.image}
                                                    alt=""
                                                    className={clsx(styles.resultImg, isObscured && styles.blurred)}
                                                />
                                            </div>
                                        ) : (
                                            <div className={styles.resultIcon}>
                                                {result.type === 'room' ? <DoorClosed size={16} /> :
                                                    (result.type === 'video' || result.metadata?.isVideo) ? <Video size={16} /> :
                                                        (result.type === 'link' ? <Link size={16} /> : <FileText size={16} />)}
                                            </div>
                                        )
                                    )}
                                    <div className={styles.resultText}>
                                        <div className={styles.resultTitleRow}>
                                            <div className={styles.resultTitle}>
                                                {result.resultType === 'folder' ? (
                                                    <HighlightText text={result.name} query={query} />
                                                ) : (
                                                    <HighlightText text={result.metadata?.title || 'Untitled'} query={query} />
                                                )}
                                                {isObscured && <Lock size={12} className={styles.lockIconInline} />}
                                            </div>
                                            <div className={styles.resultDate}>
                                                {result.updated_at ? 'Ed: ' : ''}
                                                {new Date(result.updated_at || result.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className={styles.resultBadges}>
                                            <span className={clsx(styles.typeBadge, result.resultType === 'folder' ? styles.badgeFolder : styles.badgeItem)}>
                                                {result.resultType === 'folder' ? 'Folder' : (result.type === 'room' ? 'Mind Room' : (result.type === 'link' ? 'Link' : result.type === 'image' ? 'Image' : 'Idea'))}
                                            </span>
                                            {isObscured && <span className={clsx(styles.typeBadge, styles.badgeLocked)}>Locked</span>}
                                            {insideProject && !isObscured && (
                                                <span className={clsx(styles.typeBadge, styles.badgeProject)}>
                                                    in {insideProject.metadata?.title || 'Project'}
                                                </span>
                                            )}
                                        </div>
                                        <div className={clsx(styles.resultDescription, isObscured && styles.blurredText)}>
                                            {result.resultType !== 'folder' && (
                                                <HighlightText
                                                    text={result.metadata?.description || (result.type === 'image' ? '' : getPlainText(result.content).substring(0, 80))}
                                                    query={query}
                                                />
                                            )}
                                            {result.resultType === 'item' && result.type !== 'image' && (result.metadata?.description?.length > 80 || result.content?.length > 80) && '...'}
                                        </div>
                                        {result.resultType === 'item' && !isObscured && result.metadata?.tags && Array.isArray(result.metadata.tags) && result.metadata.tags.length > 0 && (
                                            <div className={styles.resultTags}>
                                                {result.metadata.tags.map((tag: any, i: number) => {
                                                    const tagName = typeof tag === 'string' ? tag : tag.name;
                                                    return (
                                                        <span key={i} className={styles.resultTag}>
                                                            #<HighlightText text={tagName} query={query} />
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </header>
    );
}
