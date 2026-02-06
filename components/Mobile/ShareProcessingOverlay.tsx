import React from 'react';
import { Check } from 'lucide-react';
import styles from './MobileInbox.module.css';

interface ShareOverlayProps {
    status: 'saving' | 'saved' | 'error';
    message?: string;
}

export default function ShareProcessingOverlay({ status, message }: ShareOverlayProps) {
    if (status === 'error') return null; // Or handle error UI

    return (
        <div className={styles.overlay}>
            <div className={styles.overlayIcon}>
                <Check size={32} />
            </div>
            <div className={styles.overlayText}>
                {status === 'saving' ? 'Saving to Brainia...' : 'Saved!'}
            </div>
        </div>
    );
}
