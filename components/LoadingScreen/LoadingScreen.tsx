"use client";

import React, { useEffect, useState } from 'react';
import styles from './LoadingScreen.module.css';
import Orb from '../Orb/Orb';

export default function LoadingScreen({ isFading }: { isFading: boolean }) {
    const [status, setStatus] = useState('Initializing quantum sync');
    const [dots, setDots] = useState('');

    const statuses = [
        'Syncing Brainia',
        'Retrieving digital nodes',
        'Mapping neural pathways',
        'Optimizing canvas reality',
        'Finalizing consciousness link'
    ];

    useEffect(() => {
        let i = 0;
        const statusInterval = setInterval(() => {
            i = (i + 1) % statuses.length;
            setStatus(statuses[i]);
        }, 800);

        const dotsInterval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 300);

        return () => {
            clearInterval(statusInterval);
            clearInterval(dotsInterval);
        };
    }, []);

    return (
        <div className={`${styles.container} ${isFading ? styles.fading : ''}`}>
            <Orb hue={280} hoverIntensity={0.5} forceHoverState={true} backgroundColor="transparent" />
            <div className={styles.content}>
                <h1 className={styles.logo}>Brainia</h1>
                <div className={styles.status}>
                    <span>{status}{dots}</span>
                </div>
                <div className={styles.loaderBar}>
                    <div className={styles.loaderProgress}></div>
                </div>
            </div>
            <div className={styles.versionText}>VER 1.7</div>
        </div>
    );
}
