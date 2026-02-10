"use client";

import React, { useState, useEffect } from 'react';
import styles from './MobileHeader.module.css';
import Orb from '../Orb/Orb';
import { Search, X, Folder, LogOut, Sun, Moon, User, Archive } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

interface MobileHeaderProps {
    onResultClick: (id: string, type: 'item' | 'folder') => void;
    onArchiveClick: () => void;
}

export default function MobileHeader({ onResultClick, onArchiveClick }: MobileHeaderProps) {
    const { items, folders } = useItemsStore();
    const [isSearching, setIsSearching] = useState(false);
    const [query, setQuery] = useState('');
    const [user, setUser] = useState<any>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [showAccountMenu, setShowAccountMenu] = useState(false);

    useEffect(() => {
        // Initial theme from document or localStorage
        const docTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light';
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
        const initialTheme = docTheme || savedTheme || 'dark';

        setTheme(initialTheme);
        if (!docTheme) document.documentElement.setAttribute('data-theme', initialTheme);

        // Sync with any changes to the data-theme attribute (e.g. from desktop toggle)
        const observer = new MutationObserver(() => {
            const newTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
            setTheme(newTheme);
        });

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => setUser(user));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => {
            observer.disconnect();
            subscription.unsubscribe();
        };
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    const searchResults = [
        ...folders.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).map(f => ({ ...f, resultType: 'folder' })),
        ...items.filter(i => {
            const q = query.toLowerCase();
            return (i.metadata?.title || '').toLowerCase().includes(q) ||
                (i.content || '').toLowerCase().includes(q);
        }).map(i => ({ ...i, resultType: 'item' }))
    ];

    if (isSearching) {
        return (
            <div className={styles.searchOverlay}>
                <div className={styles.searchBar}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        autoFocus
                        placeholder="Search your ideas..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button onClick={() => { setIsSearching(false); setQuery(''); }} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.resultsList}>
                    {query && searchResults.map((res: any) => (
                        <div
                            key={res.id}
                            className={styles.resultItem}
                            onClick={() => {
                                onResultClick(res.id, res.resultType as any);
                                setIsSearching(false);
                                setQuery('');
                            }}
                        >
                            <div className={styles.resultIcon}>
                                {res.resultType === 'folder' ? <Folder size={16} /> : (res.type === 'link' ? '🔗' : '📄')}
                            </div>
                            <div className={styles.resultInfo}>
                                <div className={styles.resultTitle}>{res.resultType === 'folder' ? res.name : (res.metadata?.title || 'Untitled')}</div>
                                <div className={styles.resultSub}>{res.resultType === 'folder' ? 'Folder' : res.content.slice(0, 40)}</div>
                            </div>
                        </div>
                    ))}
                    {query && searchResults.length === 0 && (
                        <div className={styles.noResults}>No matches found</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            <header className={styles.header}>
                <div className={styles.actionBtn} onClick={() => setIsSearching(true)}>
                    <Search size={22} />
                </div>

                <div className={styles.logo}>
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

                {user && (
                    <div
                        className={styles.avatar}
                        onClick={() => setShowAccountMenu(true)}
                        style={user.user_metadata?.avatar_url ? {
                            backgroundImage: `url(${user.user_metadata.avatar_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            color: 'transparent'
                        } : {}}
                    >
                        {!user.user_metadata?.avatar_url && user.email?.[0].toUpperCase()}
                    </div>
                )}
            </header>

            {showAccountMenu && (
                <div className={styles.menuOverlay} onClick={() => setShowAccountMenu(false)}>
                    <div className={styles.menuContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.menuHeader}>
                            <div
                                className={styles.menuAvatar}
                                style={user.user_metadata?.avatar_url ? {
                                    backgroundImage: `url(${user.user_metadata.avatar_url})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    color: 'transparent'
                                } : {}}
                            >
                                {!user.user_metadata?.avatar_url && user.email?.[0].toUpperCase()}
                            </div>
                            <div className={styles.menuEmail}>{user.email}</div>
                        </div>

                        <div className={styles.menuItems}>
                            <div className={styles.menuItem} onClick={() => { onArchiveClick(); setShowAccountMenu(false); }}>
                                <Archive size={18} />
                                <span>View Archive</span>
                            </div>
                            <div className={styles.menuItem} onClick={toggleTheme}>
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                            </div>
                            <div className={styles.menuItem} onClick={handleLogout}>
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

