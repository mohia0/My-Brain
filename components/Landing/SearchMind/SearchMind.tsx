"use client";

import styles from './SearchMind.module.css';
import { Search, FileText, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function SearchMind() {
    return (
        <section id="search" className={styles.section}>
            <div className="mb-16">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-bold mb-4"
                >
                    Search Your Mind
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-dim max-w-xl mx-auto text-lg leading-relaxed"
                >
                    Never lose a thought again. Instant, global fuzzy search that finds items
                    across projects, folders, and browser clips in milliseconds.
                </motion.p>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={styles.wrapper}
            >
                <motion.div
                    className={styles.searchBar}
                    animate={{
                        boxShadow: ["0 0 20px -10px var(--accent-glow)", "0 0 40px -10px var(--accent-glow)", "0 0 20px -10px var(--accent-glow)"]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                >
                    <Search size={28} className="text-accent" />
                    <motion.div className="flex gap-0">
                        {["a", "r", "c", "h"].map((char, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </motion.div>
                    <motion.div
                        className={styles.cursor}
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                </motion.div>

                <div className={styles.results}>
                    {[
                        { icon: <Bookmark size={20} className="text-accent" />, title: "My Archive 2024", path: "Collections / Research / Personal", active: true },
                        { icon: <FileText size={20} className="text-dim" />, title: "System Architecture", path: "Projects / Brainia / Core", active: false }
                    ].map((result, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 1 + i * 0.2 }}
                            className={clsx(styles.resultItem, result.active && styles.active)}
                        >
                            <div className={styles.icon}>{result.icon}</div>
                            <div className={styles.details}>
                                <div className="font-semibold">{result.title.split('Arch')[0]}<span className={styles.highlight}>Arch</span>{result.title.split('Arch')[1]}</div>
                                <div className={styles.meta}>{result.path}</div>
                            </div>
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className={styles.resultItem}
                    >
                        <div className={styles.icon} />
                        <div className={styles.details}>
                            <div className="w-32 h-2 bg-white/5 rounded" />
                            <div className="w-20 h-1 bg-white/5 rounded mt-1" />
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
}
