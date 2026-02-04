"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './AccountMenu.module.css';
import { LogOut, User } from 'lucide-react';

export default function AccountMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch initial user
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        // Page triggers auth modal naturally via listener
    };

    if (!user) return null;

    const initial = user.email ? user.email[0].toUpperCase() : 'G';

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.avatar} onClick={() => setIsOpen(!isOpen)}>
                {initial}
            </div>

            {isOpen && (
                <div className={styles.menu}>
                    <div className={styles.userInfo}>
                        <div className={styles.email}>{user.email}</div>
                        <div className={styles.role}>{user.email?.includes('guest') ? 'Guest Account' : 'Synced Brain'}</div>
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
