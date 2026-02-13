"use client";

import styles from './FeatureGrid.module.css';
import { Smartphone, Zap, Map as MapIcon, Maximize2, Sparkles, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeatureGrid() {
    const features = [
        {
            title: "Spatial Engine",
            desc: "Items are placed on a persistent 2D plane. Organize with gravity, not hierarchies.",
            icon: <Maximize2 size={24} />,
            size: "large",
            color: "var(--accent)"
        },
        {
            title: "Neural Search",
            desc: "Instant fuzzy search across your whole history.",
            icon: <Sparkles size={24} />,
            size: "small",
            color: "#fbbf24"
        },
        {
            title: "MiniMap",
            desc: "One click to see the big picture. Zoom to any context instantly.",
            icon: <MapIcon size={24} />,
            size: "small",
            color: "#30a46c"
        },
        {
            title: "Cross-Platform",
            desc: "Your second brain stays in your pocket with our mobile companion app.",
            icon: <Smartphone size={24} />,
            size: "large",
            color: "#0090ff"
        },
        {
            title: "Live Collaboration",
            desc: "Work in shared spaces with teams in real-time.",
            icon: <Share2 size={24} />,
            size: "large",
            color: "#ff4444"
        }
    ];

    return (
        <section id="features" className={styles.section}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={styles.intro}
            >
                <div className={styles.badge}>Next-Gen Infrastructure</div>
                <h2 className={styles.introTitle}>A Workspace That Thinks Like You</h2>
                <p className={styles.introDesc}>Brainia removes the friction of hierarchical folders. Organize spatially, find intuitively, and build your knowledge base without boundaries.</p>
            </motion.div>

            <div className={styles.grid}>
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className={`${styles.card} ${styles[f.size]}`}
                    >
                        <div className={styles.cardGlow} style={{ background: f.color }} />
                        <div className={styles.cardContent}>
                            <div className={styles.icon} style={{ color: f.color }}>{f.icon}</div>
                            <h3 className={styles.cardTitle}>{f.title}</h3>
                            <p className={styles.cardDesc}>{f.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
