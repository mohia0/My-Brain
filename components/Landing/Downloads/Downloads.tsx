"use client";
import React from 'react';

import styles from './Downloads.module.css';
import { Chrome, Apple, Smartphone, Layout, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function Downloads() {
    const platforms = [
        {
            name: "Chrome Extension",
            icon: <Chrome size={20} />,
            status: "Available",
            link: "https://chromewebstore.google.com/detail/brainia/olebklhhlinlafohnefbacongnkpglea"
        },
        { name: "Desktop App", icon: <Layout size={20} />, status: "Coming Soon" },
        {
            name: "Mobile App (Android)",
            icon: <Smartphone size={20} />,
            status: "Download APK",
            link: "https://github.com/mohia0/My-Brain/raw/main/Brainia_v1.7.apk"
        }
    ];

    return (
        <section id="download" className={styles.section}>
            <div className={styles.container}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className={styles.banner}
                >
                    <div className={styles.textContent}>
                        <h2 className={styles.title}>Take your mind with you</h2>
                        <p className={styles.desc}>
                            Brainia is everywhere you are. Syncing in real-time across all platforms.
                        </p>
                    </div>

                    <div className={styles.platforms}>
                        {platforms.map((p, i) => {
                            return <PlatformCard key={i} platform={p} />;
                        })}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function PlatformCard({ platform }: { platform: any }) {
    const [isHovered, setIsHovered] = React.useState(false);

    const CardContent = (
        <motion.div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ y: -5, background: "rgba(255,255,255,0.08)" }}
            className={styles.platformCard}
            style={{
                cursor: platform.link ? 'pointer' : 'default',
                position: 'relative'
            }}
        >
            <div className={styles.icon}>{platform.icon}</div>
            <div className={styles.platformInfo}>
                <span className={styles.name}>{platform.name}</span>
                <span className={styles.status}>{platform.status}</span>
            </div>

            <AnimatePresence>
                {isHovered && platform.name.includes('Mobile') && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '10px',
                            background: 'white',
                            padding: '10px',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <QRCodeSVG
                            value={platform.link}
                            size={120}
                            level="H"
                        />
                        <div style={{ fontSize: '10px', color: '#000', fontWeight: 800, whiteSpace: 'nowrap' }}>SCAN TO DOWNLOAD</div>
                        <div style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '12px',
                            height: '12px',
                            background: 'white'
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    return platform.link ? (
        <a href={platform.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            {CardContent}
        </a>
    ) : (
        <div>{CardContent}</div>
    );
}
