"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';
import Orb from '@/components/Orb/Orb';
import clsx from 'clsx';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll();

    // Smooth scroll-based transforms
    const navWidth = useTransform(scrollY, [0, 100], ["100%", "fit-content"]);
    const navMarginTop = useTransform(scrollY, [0, 100], ["0rem", "1rem"]);
    const navPadding = useTransform(scrollY, [0, 100], ["1.25rem 3rem", "0.75rem 2rem"]);
    const logoScale = useTransform(scrollY, [0, 100], [1, 0.9]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
            const offset = 80; // Account for fixed navbar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className={clsx(styles.navWrapper, scrolled && styles.scrolledWrapper)}>
            <motion.div
                className={clsx(styles.topFade, scrolled && styles.visible)}
                animate={{ opacity: scrolled ? 1 : 0 }}
                transition={{ duration: 0.3 }}
            />
            <motion.nav
                className={styles.nav}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                style={{
                    width: navWidth,
                    marginTop: navMarginTop,
                    padding: navPadding
                }}
                transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    mass: 0.8
                }}
            >
                <div className={styles.container}>
                    {/* Brand */}
                    <Link href="/home" className={styles.brand}>
                        <motion.h1
                            className={styles.logoText}
                            style={{ scale: logoScale }}
                        >
                            Brainia
                        </motion.h1>
                    </Link>

                    {/* Navigation */}
                    <div className={styles.links}>
                        {[
                            { label: 'Capture', id: '#capture' },
                            { label: 'Workflow', id: '#workflow' },
                            { label: 'Features', id: '#features' },
                            { label: 'Search', id: '#search' },
                            { label: 'Pricing', id: '#pricing' }
                        ].map((item) => (
                            <motion.a
                                key={item.id}
                                href={item.id}
                                onClick={(e) => handleNavClick(e, item.id)}
                                className={styles.link}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {item.label}
                            </motion.a>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <motion.button
                            disabled
                            className={styles.cta}
                            title="Easy there, tiger! 🐅"
                            whileHover={{
                                scale: 1.05,
                                boxShadow: "0 0 30px rgba(110, 86, 207, 0.6)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <motion.span
                                animate={{
                                    fontSize: scrolled ? "0.75rem" : "0.875rem"
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                Launch App
                            </motion.span>
                            <motion.div
                                className={styles.ctaGlow}
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                            />
                        </motion.button>
                    </div>
                </div>
            </motion.nav>
        </div>
    );
}
