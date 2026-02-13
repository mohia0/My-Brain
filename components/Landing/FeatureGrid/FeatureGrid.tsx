"use client";

import styles from './FeatureGrid.module.css';
import { motion } from 'framer-motion';
import { Maximize2, Zap, LayoutGrid, Link, FileText, Image as ImageIcon, Archive, Copy, Trash2, X, Map, Folder } from 'lucide-react';

export default function FeatureGrid() {
    const features = [
        {
            title: "Spatial Canvas",
            desc: "Organize items on a persistent 2D plane. Move, zoom, and group thoughts without hierarchies.",
            icon: <Maximize2 size={24} />,
            size: "large",
            color: "var(--accent)",
            type: "canvas"
        },
        {
            title: "Smart Inbox",
            desc: "Capture links, images, and notes instantly from any device. Triage them when you're ready.",
            icon: <Zap size={24} />,
            size: "small",
            color: "#fbbf24",
            type: "inbox"
        },
        {
            title: "Spatial Minimap",
            desc: "Get an aerial view of your entire workspace. Navigate complex landscapes with a bird's-eye perspective.",
            icon: <Map size={24} />,
            size: "small",
            color: "#0090ff",
            type: "minimap"
        },
        {
            title: "Logical Containers",
            desc: "Group related items into Project Areas. Keep your workspace organized and focused.",
            icon: <LayoutGrid size={24} />,
            size: "large",
            color: "#30a46c",
            type: "projects"
        }
    ];

    const RenderSkeleton = ({ type }: { type: string }) => {
        if (type === 'canvas') {
            return (
                <div className={styles.canvasSkeleton}>
                    <div className={styles.skeletonGrid} />
                    <div className={styles.skeletonCard} style={{ top: '20%', left: '15%' }}>
                        <div className={styles.skelHeader}><Link size={10} /></div>
                    </div>
                    <div className={styles.skeletonCard} style={{ top: '45%', left: '45%' }}>
                        <div className={styles.skelHeader}><FileText size={10} /></div>
                    </div>
                </div>
            );
        }
        if (type === 'inbox') {
            return (
                <div className={styles.inboxSkeleton}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className={styles.inboxRow}>
                            <div className={styles.skelCircle} />
                            <div className={styles.skelLine} style={{ width: i === 1 ? '70%' : '50%' }} />
                        </div>
                    ))}
                </div>
            );
        }
        if (type === 'minimap') {
            return (
                <div className={styles.minimapSkeleton}>
                    <div className={styles.minimapActiveZone} />
                    <div className={styles.minimapDots}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className={styles.minimapDot}
                                style={{ top: `${Math.random() * 80}%`, left: `${Math.random() * 80}%` }}
                            />
                        ))}
                    </div>
                </div>
            );
        }
        if (type === 'projects') {
            return (
                <div className={styles.projectSkeleton}>
                    <div className={styles.projectArea}>
                        <div className={styles.projectLabel}>Research</div>
                        <div className={styles.skelCardContainer}>
                            <div className={styles.skelFolder}><Folder size={10} /></div>
                            <div className={styles.skelMiniCard}><Link size={8} /></div>
                            <div className={styles.skelMiniCard}><FileText size={8} /></div>
                            <div className={styles.skelMiniCard}><ImageIcon size={8} /></div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <section id="features" className={styles.section}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={styles.intro}
            >
                <div className={styles.badge}>Core Infrastructure</div>
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
                        <div className={styles.cardVisual}>
                            <RenderSkeleton type={f.type} />
                        </div>
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
