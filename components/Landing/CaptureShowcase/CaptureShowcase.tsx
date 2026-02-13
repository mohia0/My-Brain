"use client";

import { useState, useEffect } from 'react';
import styles from './CaptureShowcase.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, Smartphone, Link, FileText, Image as ImageIcon, Check } from 'lucide-react';

// Animation Timing Constants
const UI_DELAY = 0.6;
const CLICK_DELAY = 0.3; // Time to wait after UI appears before clicking
const STEP_INTERVAL = 2500; // Total time per step in ms

export default function CaptureShowcase() {
    const [activeDemo, setActiveDemo] = useState<'extension' | 'mobile'>('extension');
    const [captureStep, setCaptureStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCaptureStep((prev) => {
                if (prev >= 3) { // 0: Idle, 1: Selection, 2: Action, 3: Saved
                    setActiveDemo(current => current === 'extension' ? 'mobile' : 'extension');
                    return 0;
                }
                return prev + 1;
            });
        }, STEP_INTERVAL);

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
                    <motion.button
                        className={styles.ctaButton}
                        onClick={() => {
                            document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Get the Extension
                    </motion.button>
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

                        {/* Realistic Hand Cursor */}
                        <HandCursor demo={activeDemo} step={captureStep} />
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
                    <div className={styles.browserUrl}>https://magazine.design/minimalist-essentials</div>
                    <div className={styles.browserExtensionRight}>
                        <img src="/Icon.png" alt="Brainia" className={styles.browserIconImg} />
                    </div>
                    <div className={styles.browserActions}>
                        <div className={styles.browserDot} />
                    </div>
                </div>
                <div className={styles.browserContent}>
                    {/* Skeleton Website Sidebar */}
                    <div className={styles.skeletonSidebar}>
                        <div className={styles.skeletonLogo} />
                        <div className={styles.skeletonNavItem} />
                        <div className={styles.skeletonNavItem} />
                        <div className={styles.skeletonNavItem} />
                        <div className={styles.skeletonNavItem} />
                    </div>

                    {/* Main Content Area */}
                    <div className={styles.skeletonMain}>
                        <div className={styles.skeletonBreadcrumbs} />
                        <div className={styles.articleMock}>
                            <div className={styles.articleTitle}>
                                <motion.div
                                    className={styles.highlight}
                                    initial={{ width: 0 }}
                                    animate={{ width: step >= 1 ? '100%' : 0 }}
                                    transition={{ delay: UI_DELAY }}
                                />
                                10 Minimalist Wardrobe Essentials
                            </div>

                            <div className={styles.skeletonAuthor} />

                            {/* Skeleton Image Area */}
                            <div className={styles.skeletonImageContainer}>
                                <div className={styles.skeletonImage}>
                                    <ImageIcon size={32} strokeWidth={1} />
                                </div>
                                <div className={styles.skeletonCaption} />
                            </div>

                            <div className={styles.articleText}>
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} style={{ width: '80%' }} />
                            </div>

                            <div className={styles.articleText} style={{ marginTop: '1rem' }}>
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} style={{ width: '90%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Context Menu */}
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                className={styles.contextMenu}
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{
                                    opacity: 1,
                                    scale: step === 2 ? [1, 0.95, 1] : 1,
                                    y: 0
                                }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{
                                    delay: UI_DELAY,
                                    duration: 0.2
                                }}
                            >
                                <div className={styles.menuItem}>
                                    <div className={styles.miniOrbSmall} />
                                    <span>Save to Brainia</span>
                                </div>
                                <div className={styles.menuDivider} />
                                <div className={styles.menuItemDisabled}>Copy link address</div>
                                <div className={styles.menuItemDisabled}>Search Google for image</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Toast - Top Right */}
                    <AnimatePresence>
                        {step >= 3 && (
                            <motion.div
                                className={styles.toast}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: UI_DELAY }}
                            >
                                <img src="/Icon.png" alt="" className={styles.miniOrbSmallImg} />
                                <span>Saved to Inbox</span>
                                <Check size={14} className="text-accent" style={{ marginLeft: 'auto' }} />
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                    <div className={styles.cardSkeletonText} />
                                    <div className={styles.cardSkeletonText} style={{ width: '60%' }} />
                                </div>
                            </motion.div>
                        )}

                        {step >= 2 && (
                            <motion.div
                                key="sheet"
                                className={styles.shareSheet}
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{
                                    type: 'spring', damping: 30, stiffness: 300,
                                    delay: UI_DELAY
                                }}
                            >
                                <div className={styles.sheetHandle} />
                                <div className={styles.sheetTitle}>Share to</div>
                                <div className={styles.sheetApps}>
                                    {/* Other Skeleton Apps */}
                                    <div className={styles.skeletonApp}>
                                        <div className={styles.skeletonAppIcon} style={{ background: '#34d399' }} />
                                        <span>Messages</span>
                                    </div>
                                    <div className={styles.skeletonApp}>
                                        <div className={styles.skeletonAppIcon} style={{ background: '#5bc0de' }} />
                                        <span>Mail</span>
                                    </div>

                                    <motion.div
                                        className={styles.appIconWrapper}
                                        animate={{
                                            scale: step === 1 ? [1, 0.9, 1] : 1
                                        }}
                                        transition={{
                                            duration: 0.3,
                                            times: [0, 0.5, 1],
                                            delay: UI_DELAY + CLICK_DELAY
                                        }}
                                    >
                                        <div className={`${styles.appIcon} ${styles.brainiaIcon}`}>
                                            <img src="/Icon.png" alt="Brainia" className={styles.miniOrbMobileImg} />
                                        </div>
                                        <span>Brainia</span>
                                    </motion.div>

                                    <div className={styles.skeletonApp}>
                                        <div className={styles.skeletonAppIcon} style={{ background: '#fb7185' }} />
                                        <span>Instagram</span>
                                    </div>
                                </div>
                                <div className={styles.sheetActionList}>
                                    <div className={styles.skeletonActionLine} />
                                    <div className={styles.skeletonActionLine} />
                                    <div className={styles.skeletonActionLine} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mobile Success Overlay - Matching app UI */}
                    <AnimatePresence>
                        {step >= 3 && (
                            <motion.div
                                className={styles.mobileFullOverlay}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: UI_DELAY }}
                            >
                                <div className={styles.overlayOrb} />
                                <div className={styles.overlayContent}>
                                    <motion.div
                                        className={styles.overlayIconWrapper}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                    >
                                        <Check size={36} strokeWidth={3} />
                                    </motion.div>
                                    <motion.div
                                        className={styles.overlayText}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        Saved to Brainia!
                                    </motion.div>
                                    <motion.div
                                        className={styles.overlayHint}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        Saved to Inbox
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
function HandCursor({ demo, step }: { demo: 'extension' | 'mobile', step: number }) {
    if (step === 0) return null;

    const getPos = () => {
        if (demo === 'extension') {
            if (step === 1) return { x: 310, y: 155 }; // Click article text
            if (step === 2) return { x: 342, y: 122 }; // Click "Save to Brainia"
            if (step === 3) return { x: 680, y: 55 };  // Point at success toast
            return { x: 400, y: 200 };
        } else {
            if (step === 1) return { x: 395, y: 240 }; // Click mobile card
            if (step === 2) return { x: 428, y: 445 }; // Click Brainia icon in sheet
            if (step === 3) return { x: 428, y: 300 }; // Hover over success
            return { x: 400, y: 300 };
        }
    };

    const pos = getPos();
    const isBrowserStep3 = demo === 'extension' && step === 3;

    // Logical Animation Timing
    const DURATION = 2.0;
    const tMove = UI_DELAY / DURATION; // Time to arrive at destination
    const tImpact = (UI_DELAY + CLICK_DELAY) / DURATION; // Time of the "press"
    const tRelease = (UI_DELAY + CLICK_DELAY + 0.2) / DURATION; // Time of the "release"

    return (
        <motion.div
            key={`${demo}-${step}`}
            className={styles.handCursor}
            initial={{ opacity: 0, x: pos.x + 80, y: pos.y + 80, scale: 1.2 }}
            animate={{
                opacity: (step <= 2 || isBrowserStep3) ? [0, 1, 1, 1, isBrowserStep3 ? 1 : 0] : 0,
                x: [pos.x + 80, pos.x, pos.x, pos.x, pos.x],
                y: [pos.y + 80, pos.y, pos.y, pos.y, pos.y],
                scale: [1.2, 1.05, 1.05, 0.8, 1.05],
                rotate: [0, -5, -5, -15, 0]
            }}
            transition={{
                duration: DURATION,
                times: [0, tMove, tImpact - 0.05, tImpact, tRelease],
                ease: "easeOut"
            }}
        >
            <motion.img
                src="/Hand.svg"
                alt=""
                style={{ originX: 0.1, originY: 0.1 }}
                animate={{
                    y: [0, -3, 0]
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </motion.div>
    );
}
