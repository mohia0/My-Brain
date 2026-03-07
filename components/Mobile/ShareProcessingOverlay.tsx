"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import styles from './ShareProcessingOverlay.module.css';
import clsx from 'clsx';

interface ShareOverlayProps {
    status: 'saving' | 'saved' | 'capturing' | 'idle';
    isFadingOut?: boolean;
}

export default function ShareProcessingOverlay({ status, isFadingOut }: ShareOverlayProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || status === 'idle') return null;

    const isProcessing = status === 'capturing' || status === 'saving';

    return createPortal(
        <div className={clsx(styles.overlay, isFadingOut && styles.fadeOut)}>
            {/* Animated Orbs for Premium Look */}
            <div className={styles.orb} />
            <div className={styles.orb2} />

            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    {isProcessing ? (
                        <div className={styles.spinner} />
                    ) : (
                        <div className={styles.successIcon}>
                            <Check size={36} strokeWidth={3} />
                        </div>
                    )}
                </div>
                <div className={styles.text}>
                    {isProcessing ? 'Processing Idea...' : 'Saved to Brainia!'}
                </div>
                <div className={styles.hint}>
                    {isProcessing ? 'Capturing content' : 'Saved to Captures'}
                </div>
            </div>
        </div>,
        document.body
    );
}
