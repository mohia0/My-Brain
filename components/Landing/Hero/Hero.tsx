"use client";

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import styles from './Hero.module.css';
import Orb from '@/components/Orb/Orb';
import TextType from '@/components/ui/TextType';

export default function Hero() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const orbY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
    const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

    return (
        <section ref={containerRef} className={styles.hero}>
            {/* THE HUGE ORB - Acting as the soul of the hero, like the sign-in page */}
            <motion.div
                style={{ y: orbY, scale: orbScale, opacity }}
                className={styles.orbWrapper}
            >
                <Orb
                    hue={280}
                    hoverIntensity={0.6}
                    rotateOnHover={true}
                    forceHoverState={true}
                    backgroundColor="transparent"
                />
            </motion.div>

            <motion.div style={{ y: textY, opacity }} className={styles.content}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className={styles.badge}
                >
                    <span className={styles.badgeDot} />
                    Digital Second Brain
                </motion.div>

                <div className={styles.titleWrapper}>
                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={styles.title}
                    >
                        Capture Now.<br />
                        <span className={styles.gradientText}>
                            <TextType
                                text={["Find Anytime.", "Organize Brain.", "Map Thoughts."]}
                                as="span"
                                typingSpeed={75}
                                pauseDuration={1500}
                                showCursor
                                cursorCharacter="|"
                                deletingSpeed={50}
                                loop={true}
                            />
                        </span>
                    </motion.h1>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={styles.subtitle}
                >
                    Save links, notes, and ideas instantly. Everything organized. Always searchable.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={styles.actions}
                >
                    <Link href="/" className={styles.primary}>
                        Open Your Brainia
                    </Link>
                    <a
                        href="#workflow"
                        className={styles.secondary}
                        onClick={(e) => {
                            e.preventDefault();
                            document.querySelector('#workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        See the Workflow
                    </a>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={styles.previewContainer}
            >
                <div className={styles.glassCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.dots}>
                            <span /><span /><span />
                        </div>
                        <div className={styles.addressBar}>app.brainia.space</div>
                    </div>
                    <div className={styles.previewContent}>
                        <div className={styles.previewPlaceholder}>
                            <div className={styles.previewText}>Interactive Spatial Workspace</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
