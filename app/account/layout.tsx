"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, ArrowLeft, Brain, Chrome } from 'lucide-react';
import styles from './layout.module.css';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Profile', href: '/account/profile', icon: User },
        { name: 'Security', href: '/account/security', icon: Shield },
        { name: 'Apps & Extensions', href: '/account/extensions', icon: Chrome },
    ];

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.backLink}>
                        <ArrowLeft size={16} /> Back to Brainia
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: 32, height: 32,
                            background: 'var(--accent)',
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Brain size={18} color="white" />
                        </div>
                        <h1 className={styles.title}>Account</h1>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            >
                                <Icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <main className={styles.content}>
                {children}
            </main>
        </div>
    );
}
