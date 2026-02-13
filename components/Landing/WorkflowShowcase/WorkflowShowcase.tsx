"use client";

import styles from './WorkflowShowcase.module.css';
import { MousePointer2, Inbox, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function WorkflowShowcase() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev === 0 ? 1 : 0));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const inboxItems = [
        { id: 1, type: "link", title: "Quantum Physics Research", date: "Oct 12", color: "var(--accent)" },
        { id: 2, type: "text", title: "Newsletter Draft v2", date: "Oct 11", color: "#3296fa" },
        { id: 3, type: "image", title: "Product Moodboard", date: "Oct 10", color: "#fa6464" },
    ];

    return (
        <section id="workflow" className={styles.section}>
            <div className={styles.content}>
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-2 text-accent font-semibold mb-2"
                >
                    <LayoutGrid size={20} />
                    <span>Spatial Workflow</span>
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className={styles.title}
                >
                    Capture to Canvas.<br />
                    <span className={styles.accentText}>Simple as that.</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className={styles.desc}
                >
                    Brainia turns your cluttered links and notes into a visual mind map.
                    Just save, drag, and organize your thoughts in space.
                </motion.p>

                <div className={styles.steps}>
                    <div className={clsx(styles.stepItem, step === 0 && styles.active)}>
                        <strong>1. Capture</strong>
                        <p>Save anything instantly into your Inbox.</p>
                    </div>
                    <div className={clsx(styles.stepItem, step === 1 && styles.active)}>
                        <strong>2. Organize</strong>
                        <p>Drag items onto the canvas to create your map.</p>
                    </div>
                </div>
            </div>

            <div className={styles.visualContainer}>
                {/* Inbox Area (Skeleton Sidebar) */}
                <div className={styles.inboxWrapper}>
                    <div className={styles.inboxHeader}>
                        <div className="flex items-center gap-2">
                            <Inbox size={14} />
                            <span>Inbox</span>
                        </div>
                        <span className={styles.count}>3</span>
                    </div>
                    <div className={styles.inboxList}>
                        {inboxItems.map((item, i) => (
                            <motion.div
                                key={item.id}
                                className={styles.inboxItem}
                                animate={{
                                    opacity: step === 1 && i === 0 ? 0 : 1,
                                    x: step === 1 && i === 0 ? 50 : 0
                                }}
                            >
                                <div className={styles.itemIcon}>
                                    {item.type === 'link' && <Link size={12} />}
                                    {item.type === 'text' && <FileText size={12} />}
                                    {item.type === 'image' && <ImageIcon size={12} />}
                                </div>
                                <div className={styles.itemMeta}>
                                    <div className={styles.itemTitle}>{item.title}</div>
                                    <div className={styles.itemDate}>{item.date}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Canvas Area (Skeleton Board) */}
                <div className={styles.canvasWrapper}>
                    <div className={styles.canvasGrid} />

                    <AnimatePresence>
                        {step === 1 && (
                            <motion.div
                                initial={{ x: -150, y: -50, scale: 0.8, opacity: 0 }}
                                animate={{ x: 60, y: 60, scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.canvasCard}
                            >
                                <div className={styles.cardHeader}>
                                    <Link size={12} className="text-accent" />
                                    <span className={styles.cardTitle}>Physics Research</span>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.skeletonImage} />
                                    <div className={styles.skeletonLine} />
                                    <div className={styles.skeletonLine} style={{ width: '60%' }} />
                                </div>
                                <div className={styles.cardActions}>
                                    <div className={styles.actionCircle} />
                                    <div className={styles.actionCircle} />
                                    <div className={styles.actionCircle} />
                                </div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={styles.cursor}
                                >
                                    <MousePointer2 size={16} fill="var(--accent)" />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Background nodes already on canvas */}
                    <div className={styles.staticCard} style={{ top: '25%', right: '15%' }}>
                        <div className={styles.cardHeader}>
                            <FileText size={12} />
                            <span className={styles.cardTitle}>Notes</span>
                        </div>
                    </div>

                    <div className={styles.staticCard} style={{ bottom: '25%', right: '35%' }}>
                        <div className={styles.cardHeader}>
                            <ImageIcon size={12} />
                            <span className={styles.cardTitle}>Reference</span>
                        </div>
                    </div>

                    <svg className={styles.connection}>
                        <line x1="100%" y1="0%" x2="0%" y2="100%" />
                    </svg>

                    {/* App Toolbar Skeleton */}
                    <div className={styles.mockToolbar}>
                        <div className={styles.toolbarSection}>
                            <div className={styles.mockTool}><MousePointer2 size={12} /></div>
                            <div className={styles.mockTool}><Hand size={12} /></div>
                        </div>
                        <div className={styles.mockDivider} />
                        <div className={styles.toolbarSection}>
                            <div className={styles.mockTool}><Plus size={12} /></div>
                        </div>
                    </div>

                    {/* Zoom Wheel Skeleton */}
                    <div className={styles.mockWheel}>
                        <div className={styles.wheelInner}>
                            <div className={styles.wheelHinge} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

import { Plus, Hand, FileText, Link, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';
