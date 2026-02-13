"use client";

import styles from './WorkflowShowcase.module.css';
import { MousePointer2, Inbox, LayoutGrid, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function WorkflowShowcase() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % 3);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const inboxItems = [
        { id: 1, type: "link", title: "Summer Fashion Trends", date: "Oct 12", color: "var(--accent)" },
        { id: 2, type: "text", title: "Favorite Quotes Collection", date: "Oct 11", color: "#3296fa" },
        { id: 3, type: "image", title: "Travel Inspiration Board", date: "Oct 10", color: "#fa6464" },
    ];

    return (
        <section id="workflow" className={styles.section}>
            <div className={styles.content}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={styles.workflowBadge}
                >
                    <LayoutGrid size={16} />
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
                <div className={styles.steps}>
                    <div
                        className={clsx(styles.stepItem, step === 0 && styles.active)}
                        onClick={() => setStep(0)}
                    >
                        <strong>1. Capture</strong>
                        <p>Save anything instantly into your Inbox.</p>
                    </div>
                    <div
                        className={clsx(styles.stepItem, step === 1 && styles.active)}
                        onClick={() => setStep(1)}
                    >
                        <strong>2. Organize</strong>
                        <p>Drag items onto the canvas to create your map.</p>
                    </div>
                    <div
                        className={clsx(styles.stepItem, step === 2 && styles.active)}
                        onClick={() => setStep(2)}
                    >
                        <strong>3. Search</strong>
                        <p>Find anything across your workspace instantly.</p>
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
                                initial={step === 0 && i === 0 ? { opacity: 0, x: -20, scale: 0.95 } : {}}
                                animate={{
                                    opacity: step >= 1 && i === 0 ? 0 : 1,
                                    x: step >= 1 && i === 0 ? 50 : 0,
                                    y: step >= 1 && i > 0 ? -60 : 0,
                                    scale: 1,
                                    backgroundColor: step === 0 && i === 0 ?
                                        ['rgba(110, 86, 207, 0)', 'rgba(110, 86, 207, 0.15)', 'rgba(110, 86, 207, 0)'] :
                                        'rgba(110, 86, 207, 0)'
                                }}
                                transition={{
                                    duration: 0.5,
                                    ease: [0.22, 1, 0.36, 1],
                                    backgroundColor: {
                                        duration: 1.5,
                                        times: [0, 0.5, 1]
                                    }
                                }}
                            >
                                <div className={styles.itemIcon} style={{
                                    background: item.type === 'link' ? 'rgba(50, 150, 250, 0.1)' :
                                        item.type === 'text' ? 'rgba(110, 86, 207, 0.1)' :
                                            'rgba(250, 100, 100, 0.1)',
                                    color: item.type === 'link' ? '#3296fa' :
                                        item.type === 'text' ? 'var(--accent)' :
                                            '#fa6464'
                                }}>
                                    {item.type === 'link' && <Link size={14} />}
                                    {item.type === 'text' && <FileText size={14} />}
                                    {item.type === 'image' && <ImageIcon size={14} />}
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
                        {(step === 1 || step === 2) && (
                            <motion.div
                                initial={{ x: -150, y: -50, scale: 0.8, opacity: 0 }}
                                animate={{ x: 60, y: 60, scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.canvasCard}
                            >
                                <div className={styles.cardHeader}>
                                    <Link size={12} className="text-accent" />
                                    <span className={styles.cardTitle}>Summer Fashion Trends</span>
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
                                {/* Cursor was moved outside to be globally on top */}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Global Canvas Cursor */}
                    <AnimatePresence>
                        {(step === 1 || step === 2) && (
                            <motion.div
                                key="cursor"
                                initial={{ opacity: 0, x: 50, y: 50 }}
                                animate={{
                                    opacity: 1,
                                    x: step === 1 ? [50, 180, 250] : [250, 320, 400],
                                    y: step === 1 ? [50, 140, 180] : [180, 120, 100]
                                }}
                                exit={{
                                    opacity: 0,
                                    x: 80,
                                    y: 70,
                                    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                                }}
                                transition={{
                                    duration: 1.2,
                                    ease: [0.16, 1, 0.3, 1],
                                    times: [0, 0.5, 1]
                                }}
                                className={styles.cursor}
                            >
                                <MousePointer2 size={18} fill="var(--accent)" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Background nodes already on canvas */}
                    <motion.div
                        className={styles.staticCard}
                        style={{ top: '22%', right: '12%' }}
                        animate={{ opacity: step === 2 ? 0.8 : 0.4 }}
                    >
                        <div className={styles.cardHeader}>
                            <FileText size={12} style={{ color: '#3296fa' }} />
                            <span className={styles.cardTitle}>Abstract Logic</span>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.skeletonLine} />
                            <div className={styles.skeletonLine} style={{ width: '80%' }} />
                        </div>
                    </motion.div>

                    <motion.div
                        className={styles.staticCard}
                        style={{ bottom: '25%', right: '35%' }}
                        animate={{ opacity: step === 2 ? 0.8 : 0.4 }}
                    >
                        <div className={styles.cardHeader}>
                            <ImageIcon size={12} style={{ color: '#fa6464' }} />
                            <span className={styles.cardTitle}>Reference 01</span>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.skeletonImage} style={{ height: '40px' }} />
                        </div>
                    </motion.div>

                    {/* Step 3: Search Interaction */}
                    {step === 2 && (
                        <motion.div
                            className={styles.mockSearchOverlay}
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                        >
                            <div className={styles.mockSearchBar}>
                                <Search size={10} className="text-accent" />
                                <span>outfit</span>
                                <div className={styles.mockSearchCursor} />
                            </div>
                            <div className={styles.mockSearchResults}>
                                <div className={styles.mockResult}>Casual Outfit Ideas...</div>
                                <div className={styles.mockResult}>Winter Style Guide...</div>
                            </div>
                        </motion.div>
                    )}

                    {/* App Toolbar Skeleton */}
                    <div className={styles.mockToolbar}>
                        <div className={styles.toolbarSection}>
                            <div className={clsx(styles.mockTool, step !== 0 && styles.toolActive)}><MousePointer2 size={12} /></div>
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
                            <motion.div
                                className={styles.wheelHinge}
                                animate={{ rotate: step === 1 ? 45 : 0 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

import { Plus, Hand, FileText, Link, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';
