import React from 'react';
import { Check } from 'lucide-react';
import styles from './ShareProcessingOverlay.module.css';
import clsx from 'clsx';

interface ShareOverlayProps {
    status: 'saving' | 'saved' | 'capturing' | 'idle';
    isFadingOut?: boolean;
}

export default function ShareProcessingOverlay({ status, isFadingOut }: ShareOverlayProps) {
    if (status === 'idle') return null;

    return (
        <div className={clsx(styles.overlay, isFadingOut && styles.fadeOut)}>
            {/* Animated Orbs for Premium Look */}
            <div className={styles.orb} />
            <div className={styles.orb2} />

            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    {status === 'saving' || status === 'capturing' ? (
                        <div className={styles.spinner}></div>
                    ) : (
                        <div className={styles.successIcon}>
                            <Check size={36} strokeWidth={3} />
                        </div>
                    )}
                </div>
                <div className={styles.text}>
                    {status === 'saving' ? 'Capturing to Brainia...' :
                        status === 'capturing' ? 'Processing Link...' :
                            'Captured to your Brain!'}
                </div>
                {status === 'saved' && (
                    <div className={styles.hint}>Saved to Inbox</div>
                )}
            </div>
        </div>
    );

}
