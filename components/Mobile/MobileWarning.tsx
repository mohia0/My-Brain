"use client";

import React, { useState, useEffect } from 'react';
import { Monitor, X } from 'lucide-react';
import styles from './MobileWarning.module.css';

export default function MobileWarning() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Detect if web mobile (not native app)
        const isNative = typeof window !== 'undefined' && (
            (window as any).Capacitor?.isNativePlatform() ||
            (window as any).Capacitor?.isNative
        );

        if (!isNative) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={styles.warningBanner}>
            <div className={styles.content}>
                <Monitor size={14} className={styles.icon} />
                <p>For the full Brainia experience, open on a desktop or larger screen.</p>
            </div>
            <button onClick={handleDismiss} className={styles.closeBtn} aria-label="Dismiss">
                <X size={14} />
            </button>
        </div>
    );
}
