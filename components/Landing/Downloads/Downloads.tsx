"use client";

import styles from './Downloads.module.css';
import { Chrome, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Downloads() {
    return (
        <section id="download" className={styles.section}>
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                <h2 className="text-4xl font-bold mb-4">Your Mind, Everywhere</h2>
                <p className="text-dim">Brainia syncs across all your devices so your second brain is always with you.</p>
            </motion.div>

            <div className={styles.grid}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -8, backgroundColor: "rgba(255,255,255,0.06)" }}
                    className={styles.box}
                >
                    <div className={styles.icon}>
                        <Chrome size={40} className="text-accent" />
                    </div>
                    <h3 className={styles.title}>Browser Extension</h3>
                    <p className={styles.desc}>Capture links and snippets instantly from Chrome, Edge, and Brave.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ y: -8, backgroundColor: "rgba(255,255,255,0.06)" }}
                    className={styles.box}
                >
                    <div className={styles.icon}>
                        <Smartphone size={40} className="text-accent" />
                    </div>
                    <h3 className={styles.title}>Mobile App</h3>
                    <p className={styles.desc}>Native experience for iOS and Android. View and capture on the go.</p>
                </motion.div>
            </div>
        </section>
    );
}
