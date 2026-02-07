import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import styles from './ShareProcessingOverlay.module.css';

interface ShareOverlayProps {
    status: 'saving' | 'saved' | 'error' | 'capturing';
}

export default function ShareProcessingOverlay({ status }: ShareOverlayProps) {
    if (status === 'error' || status === 'idle' as any) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.iconWrapper}>
                {status === 'saved' ? (
                    <Check size={32} strokeWidth={3} />
                ) : (
                    <Loader2 size={32} className={styles.spinner} />
                )}
            </div>
            <div className={styles.text}>
                {status === 'saving' ? 'Syncing...' :
                    status === 'capturing' ? 'Capturing...' :
                        'Saved to Brainia'}
            </div>
        </div>
    );
}
