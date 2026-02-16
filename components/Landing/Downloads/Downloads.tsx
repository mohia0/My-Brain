"use client";

import styles from './Downloads.module.css';
import { Chrome, Apple, Smartphone, Layout } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Downloads() {
    const platforms = [
        {
            name: "Chrome Extension",
            icon: <Chrome size={20} />,
            status: "Available",
            link: "https://chromewebstore.google.com/detail/brainia/olebklhhlinlafohnefbacongnkpglea"
        },
        { name: "Desktop App", icon: <Layout size={20} />, status: "Coming Soon" },
        { name: "Mobile App", icon: <Smartphone size={20} />, status: "Beta" }
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
                            const CardContent = (
                                <motion.div
                                    whileHover={{ y: -5, background: "rgba(255,255,255,0.08)" }}
                                    className={styles.platformCard}
                                    style={{ cursor: p.link ? 'pointer' : 'default' }}
                                >
                                    <div className={styles.icon}>{p.icon}</div>
                                    <div className={styles.platformInfo}>
                                        <span className={styles.name}>{p.name}</span>
                                        <span className={styles.status}>{p.status}</span>
                                    </div>
                                </motion.div>
                            );

                            return p.link ? (
                                <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                    {CardContent}
                                </a>
                            ) : (
                                <div key={i}>{CardContent}</div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
