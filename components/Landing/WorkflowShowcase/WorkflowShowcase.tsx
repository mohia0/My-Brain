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
        { id: 1, title: "Quantum Physics Notes", color: "var(--accent)" },
        { id: 2, title: "Newsletter Design", color: "#3296fa" },
        { id: 3, title: "Investment Strategy", color: "#fa6464" },
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
                {/* Inbox Area */}
                <div className={styles.inboxWrapper}>
                    <div className={styles.inboxHeader}>
                        <Inbox size={14} /> Inbox
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
                                <div className={styles.dot} style={{ background: item.color }} />
                                <div className={styles.line} />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Canvas Area */}
                <div className={styles.canvasWrapper}>
                    <div className={styles.canvasGrid} />

                    <AnimatePresence>
                        {step === 1 && (
                            <motion.div
                                initial={{ x: -100, y: 0, scale: 0.8, opacity: 0 }}
                                animate={{ x: 40, y: 40, scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.canvasNode}
                            >
                                <div className={styles.nodeHeader} />
                                <div className={styles.nodeBody}>
                                    <div className={styles.nodeLine} />
                                    <div className={styles.nodeLine} style={{ width: '60%' }} />
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
                    <div className={styles.staticNode} style={{ top: '20%', right: '20%' }} />
                    <div className={styles.staticNode} style={{ bottom: '30%', right: '40%' }} />
                    <svg className={styles.connection}>
                        <line x1="100%" y1="0%" x2="0%" y2="100%" />
                    </svg>

                    {/* Mock App UI Elements */}
                    <div className={styles.mockToolbar}>
                        <div className={styles.mockTool}><MousePointer2 size={12} /></div>
                        <div className={styles.mockTool}><Plus size={12} /></div>
                        <div className={styles.mockTool}><LayoutGrid size={12} /></div>
                    </div>

                    <div className={styles.mockWheel}>
                        <div className={styles.wheelInner}>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

import { Plus } from 'lucide-react';
import clsx from 'clsx';
