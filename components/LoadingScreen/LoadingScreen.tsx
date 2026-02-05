"use client";

import React, { useEffect, useState } from 'react';
import styles from './LoadingScreen.module.css';
import Orb from '../Orb/Orb';

export default function LoadingScreen() {
    const [text, setText] = useState('Syncing your brain');
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.container}>
            <Orb hue={280} hoverIntensity={0.5} forceHoverState={true} backgroundColor="#050505" />
            <div className={styles.content}>
                <h1 className={styles.logo}>My Brain</h1>
                <div className={styles.status}>
                    <span>{text}{dots}</span>
                </div>
                <div className={styles.loaderBar}>
                    <div className={styles.loaderProgress}></div>
                </div>
            </div>
        </div>
    );
}
