"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';
import Orb from '@/components/Orb/Orb';
import clsx from 'clsx';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={clsx(styles.navWrapper, scrolled && styles.scrolledWrapper)}>
            <div className={clsx(styles.topFade, scrolled && styles.visible)} />
            <motion.nav
                className={styles.nav}
                initial={{ y: -100 }}
                animate={{
                    y: 0,
                    width: scrolled ? "fit-content" : "100%",
                    marginTop: scrolled ? "1rem" : "0px",
                }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className={styles.container}>
                    {/* Brand */}
                    <Link href="/" className={styles.brand}>
                        <h1 className={styles.logoText}>
                            Brainia
                        </h1>
                    </Link>

                    {/* Navigation */}
                    <div className={styles.links}>
                        {['Features', 'Workflow', 'Search', 'Pricing'].map((item) => (
                            <Link
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className={styles.link}
                            >
                                {item}
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <Link
                            href="https://app.brainia.space"
                            className={styles.cta}
                        >
                            <motion.span
                                animate={{
                                    padding: scrolled ? "0.4rem 1.25rem" : "0.5rem 1.75rem",
                                    fontSize: scrolled ? "0.75rem" : "0.875rem"
                                }}
                            >
                                Launch
                            </motion.span>
                        </Link>
                    </div>
                </div>
            </motion.nav>
        </div>
    );
}
