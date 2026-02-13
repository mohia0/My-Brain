"use client";

import Link from 'next/link';
import styles from './Footer.module.css';
import { motion } from 'framer-motion';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={styles.container}
            >
                <div className={styles.topRow}>
                    <div className={styles.brand}>
                        <h1 className={styles.logoText}>Brainia</h1>
                    </div>
                    <div className={styles.links}>
                        <Link href="#features" className={styles.link}>Features</Link>
                        <Link href="#pricing" className={styles.link}>Pricing</Link>
                        <Link href="#download" className={styles.link}>Download</Link>
                        <Link href="#" className={styles.link}>Privacy</Link>
                        <Link href="#" className={styles.link}>Terms</Link>
                    </div>
                </div>
                <div className={styles.bottomRow}>
                    <div className={styles.copy}>
                        © {new Date().getFullYear()} Brainia Labs. All rights reserved.
                    </div>
                </div>
            </motion.div>
        </footer>
    );
}
