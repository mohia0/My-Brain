"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './AccountMenu.module.css';
import { LogOut, User, Sun, Moon } from 'lucide-react';

export default function AccountMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Theme initialization
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Fetch initial user
        supabase.auth.getUser().then(({ data: { user } }: any) => {
            setUser(user);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        // Click outside to close
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            subscription.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
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
        setIsOpen(false);
        // Page triggers auth modal naturally via listener
    };

    if (!user) return null;

    const initial = user.email ? user.email[0].toUpperCase() : 'G';

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.controls}>
                <button
                    className={styles.themeToggle}
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
                    data-tooltip={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    data-tooltip-pos="left"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div
                    className={styles.avatar}
                    onClick={() => setIsOpen(!isOpen)}
                    style={user.user_metadata?.avatar_url ? {
                        backgroundImage: `url(${user.user_metadata.avatar_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: 'transparent'
                    } : {}}
                >
                    {!user.user_metadata?.avatar_url && initial}
                </div>
            </div>

            {isOpen && (
                <div className={styles.menu}>
                    <div className={styles.userInfo}>
                        <div className={styles.email}>{user.email}</div>
                        <div className={styles.role}>{user.email?.includes('guest') ? 'Guest Account' : 'Synced Brainia'}</div>
                    </div>

                    <Link href="/account" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                        <User size={16} />
                        <span>Account Settings</span>
                    </Link>

                    <div className={styles.menuItem + ' ' + styles.logout} onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </div>
                </div>
            )}
        </div>
    );
}
