"use client";

import { useState, useEffect } from 'react';
import styles from './CaptureShowcase.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, Smartphone, Link, FileText, Image as ImageIcon, Check } from 'lucide-react';

export default function CaptureShowcase() {
    const [activeDemo, setActiveDemo] = useState<'extension' | 'mobile'>('extension');
    const [captureStep, setCaptureStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCaptureStep((prev) => {
                if (prev >= 2) {
                    // Reset and potentially switch demo
                    setTimeout(() => {
                        setActiveDemo(current => current === 'extension' ? 'mobile' : 'extension');
                    }, 1000);
                    return 0;
                }
                return prev + 1;
            });
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <section id="capture" className={styles.section}>
            <div className={styles.container}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={styles.intro}
                >
                    <div className={styles.badge}>Universal Capture</div>
                    <h2 className={styles.title}>Capture from Anywhere</h2>
                    <p className={styles.paragraph}>
                        Browser extension and mobile app work seamlessly to capture your thoughts, links, and ideas instantly.
                    </p>
                </motion.div>

                <div className={styles.demoContainer}>
                    {/* Toggle Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeDemo === 'extension' ? styles.active : ''}`}
                            onClick={() => {
                                setActiveDemo('extension');
                                setCaptureStep(0);
                            }}
                        >
                            <Chrome size={18} />
                            <span>Browser Extension</span>
                        </button>
                        <button
                            className={`${styles.tab} ${activeDemo === 'mobile' ? styles.active : ''}`}
                            onClick={() => {
                                setActiveDemo('mobile');
                                setCaptureStep(0);
                            }}
                        >
                            <Smartphone size={18} />
                            <span>Mobile App</span>
                        </button>
                    </div>

                    {/* Demo Visual */}
                    <div className={styles.visual}>
                        <AnimatePresence mode="wait">
                            {activeDemo === 'extension' ? (
                                <ExtensionDemo key="extension" step={captureStep} />
                            ) : (
                                <MobileDemo key="mobile" step={captureStep} />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Step Indicators */}
                    <div className={styles.steps}>
                        {['Select', 'Capture', 'Saved'].map((label, i) => (
                            <div
                                key={i}
                                className={`${styles.stepIndicator} ${i <= captureStep ? styles.stepActive : ''}`}
                            >
                                <div className={styles.stepNumber}>{i + 1}</div>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function ExtensionDemo({ step }: { step: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={styles.extensionDemo}
        >
            {/* Browser Window */}
            <div className={styles.browserWindow}>
                <div className={styles.browserChrome}>
                    <div className={styles.browserDots}>
                        <div /><div /><div />
                    </div>
                    <div className={styles.browserUrl}>https://example.com/article</div>
                    <div className={styles.browserExtension}>
                        <FileText size={16} className="text-accent" />
                    </div>
                </div>
                <div className={styles.browserContent}>
                    <div className={styles.articleMock}>
                        <div className={styles.articleTitle}>
                            <motion.div
                                className={styles.highlight}
                                initial={{ width: 0 }}
                                animate={{ width: step >= 0 ? '100%' : 0 }}
                            />
                            10 Minimalist Wardrobe Essentials
                        </div>
                        <div className={styles.articleText}>
                            Build a versatile capsule wardrobe with these timeless pieces that work for any season...
                        </div>
                    </div>

                    {/* Context Menu */}
                    <AnimatePresence>
                        {step >= 1 && (
                            <motion.div
                                className={styles.contextMenu}
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <div className={styles.menuItem}>
                                    <ImageIcon size={14} />
                                    <span>Save to Brainia</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Toast */}
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                className={styles.toast}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Check size={16} className="text-accent" />
                                <span>Saved to Inbox</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Animated Cursor */}
                    <motion.div
                        className={styles.handCursor}
                        animate={{
                            x: step === 0 ? [50, 100, 150] : step === 1 ? [150, 180] : [180, 200],
                            y: step === 0 ? [80, 95, 110] : step === 1 ? [110, 140] : [140, 30],
                            opacity: step <= 1 ? 1 : 0
                        }}
                        transition={{
                            duration: step === 0 ? 1.8 : step === 1 ? 0.8 : 0.6,
                            ease: [0.22, 1, 0.36, 1],
                            times: step === 0 ? [0, 0.5, 1] : undefined
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3V10H19C19.5523 10 20 10.4477 20 11C20 11.5523 19.5523 12 19 12H12V19C12 19.5523 11.5523 20 11 20C10.4477 20 10 19.5523 10 19V12H3C2.44772 12 2 11.5523 2 11C2 10.4477 2.44772 10 3 10H10V3Z" fill="var(--accent)" />
                            <circle cx="11" cy="11" r="2" fill="white" />
                        </svg>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

function MobileDemo({ step }: { step: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={styles.mobileDemo}
        >
            {/* Mobile Device Frame */}
            <div className={styles.mobileFrame}>
                <div className={styles.mobileNotch} />
                <div className={styles.mobileScreen}>
                    {/* Simplified Mobile Content */}
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="content"
                                className={styles.mobileContent}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className={styles.mobileCard}>
                                    <div className={styles.cardImage} />
                                    <div className={styles.cardTitle}>Weekend Style Guide</div>
                                    <div className={styles.cardMeta}>3 min read</div>
                                </div>
                            </motion.div>
                        )}

                        {step >= 1 && (
                            <motion.div
                                key="sheet"
                                className={styles.shareSheet}
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            >
                                <div className={styles.sheetHandle} />
                                <div className={styles.sheetTitle}>Save to</div>
                                <div className={styles.sheetApps}>
                                    <motion.div
                                        className={styles.appIconWrapper}
                                        animate={{
                                            scale: step === 1 ? [1, 0.9, 1] : 1
                                        }}
                                        transition={{
                                            duration: 0.3,
                                            times: [0, 0.5, 1],
                                            delay: 0.5
                                        }}
                                    >
                                        <div className={`${styles.appIcon} ${styles.brainiaIcon}`}>
                                            <FileText size={28} />
                                        </div>
                                        <span>Brainia</span>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Indicator */}
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                className={styles.mobileToast}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Check size={16} />
                                <span>Saved to Brainia</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Animated Hand Cursor */}
                    <motion.div
                        className={styles.handCursor}
                        animate={{
                            x: step === 0 ? [80, 60] : step === 1 ? [60, 50] : [50, 50],
                            y: step === 0 ? [300, 200] : step === 1 ? [200, 420] : [420, 440],
                            opacity: step <= 1 ? 1 : 0
                        }}
                        transition={{
                            duration: step === 0 ? 1.5 : 1.2,
                            ease: [0.22, 1, 0.36, 1],
                            times: step === 0 ? [0, 1] : undefined
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3V10H19C19.5523 10 20 10.4477 20 11C20 11.5523 19.5523 12 19 12H12V19C12 19.5523 11.5523 20 11 20C10.4477 20 10 19.5523 10 19V12H3C2.44772 12 2 11.5523 2 11C2 10.4477 2.44772 10 3 10H10V3Z" fill="var(--accent)" />
                            <circle cx="11" cy="11" r="2" fill="white" />
                        </svg>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
