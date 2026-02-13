"use client";

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import styles from './CtaSection.module.css';
import Orb from '@/components/Orb/Orb';

export default function CtaSection() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const rotate = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 2]);
    const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

    return (
        <section ref={containerRef} className={styles.ctaSection}>
            <div className={styles.box}>
                {/* Huge scroll-driven Orb centerpiece */}
                <motion.div style={{ opacity }} className={styles.orbWrapper}>
                    <Orb
                        hue={280}
                        hoverIntensity={0.5}
                        externalRotate={rotate.get()}
                        forceHoverState={true}
                        backgroundColor="transparent"
                    />
                </motion.div>

                <div className={styles.content}>
                    <h2 className={styles.title}>
                        Ready to upgrade your mind?
                    </h2>
                    <p className={styles.subtitle}>
                        Join thousands of thinkers who have switched to a spatial workflow.
                        Free to start, powerful enough to grow with you.
                    </p>

                    <Link
                        href="https://app.brainia.space"
                        className={styles.button}
                    >
                        Get Started Now
                    </Link>

                    <p className={styles.note}>
                        No credit card required • Free plan available
                    </p>
                </div>
            </div>
        </section>
    );
}
