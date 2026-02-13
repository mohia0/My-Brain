"use client";

import styles from './SearchMind.module.css';
import { Search, FileText, Bookmark, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

export default function SearchMind() {
    const [searchTerm, setSearchTerm] = useState("");
    const [termIndex, setTermIndex] = useState(0);
    const [isTypingComplete, setIsTypingComplete] = useState(false);
    const searchTerms = ["outfit ideas", "book quotes", "healthy recipes", "workout routine"];

    const allData = [
        {
            title: "Casual Outfit Ideas for Fall",
            meta: "Fashion / Wardrobe",
            keyword: "outfit ideas",
            icon: <Bookmark size={20} />
        },
        {
            title: "Inspiring Book Quotes",
            meta: "Reading / Collection",
            keyword: "book quotes",
            icon: <FileText size={20} />
        },
        {
            title: "Healthy Breakfast Recipes",
            meta: "Cooking / Meal Prep",
            keyword: "healthy recipes",
            icon: <LinkIcon size={20} />
        },
        {
            title: "Morning Workout Routine",
            meta: "Fitness / Daily",
            keyword: "workout routine",
            icon: <ImageIcon size={20} />
        },
        {
            title: "Winter Style Guide",
            meta: "Fashion / 2024",
            keyword: "outfit ideas",
            icon: <Bookmark size={20} />
        },
        {
            title: "Motivational Quotes",
            meta: "Personal / Inspiration",
            keyword: "book quotes",
            icon: <FileText size={20} />
        },
        {
            title: "Quick Dinner Ideas",
            meta: "Cooking / Weeknight",
            keyword: "healthy recipes",
            icon: <LinkIcon size={20} />
        }
    ];

    useEffect(() => {
        let currentTerm = searchTerms[termIndex];
        let charIndex = 0;
        let isDeleting = false;

        const type = () => {
            if (!isDeleting && charIndex <= currentTerm.length) {
                setSearchTerm(currentTerm.substring(0, charIndex));
                if (charIndex === currentTerm.length) {
                    setIsTypingComplete(true);
                }
                charIndex++;
                setTimeout(type, 80);
            } else if (isDeleting && charIndex >= 0) {
                if (charIndex === currentTerm.length) {
                    setIsTypingComplete(false);
                }
                setSearchTerm(currentTerm.substring(0, charIndex));
                charIndex--;
                setTimeout(type, 40);
            } else if (!isDeleting && charIndex > currentTerm.length) {
                isDeleting = true;
                setTimeout(type, 4000); // Pause on full word with results visible
            } else {
                setTermIndex((prev) => (prev + 1) % searchTerms.length);
            }
        };

        const timeout = setTimeout(type, 500);
        return () => clearTimeout(timeout);
    }, [termIndex]);

    // Only show results when typing is complete
    const currentTargetTerm = searchTerms[termIndex];
    const filteredResults = isTypingComplete
        ? allData.filter(item => item.keyword === currentTargetTerm).slice(0, 3)
        : [];

    return (
        <section id="search" className={styles.section}>
            <div className={styles.container}>
                <div className={styles.textContent}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={styles.badge}
                    >
                        Spatial Retrieval
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={styles.title}
                    >
                        Search Your Mind
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className={styles.paragraph}
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
                    >
                        <Search size={28} className="text-accent" />
                        <div className="flex items-center">
                            <span>{searchTerm}</span>
                        </div>
                    </motion.div>

                    <div className={styles.results}>
                        <div className={styles.resultsInner}>
                            <AnimatePresence mode="sync" initial={false}>
                                {filteredResults.map((result, i) => (
                                    <motion.div
                                        key={result.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            transition: {
                                                delay: i * 0.1,
                                                duration: 0.3,
                                                ease: "easeOut"
                                            }
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: -10,
                                            transition: {
                                                duration: 0.2,
                                                ease: "easeIn"
                                            }
                                        }}
                                        className={clsx(styles.resultItem, i === 0 && styles.active)}
                                    >
                                        <div className={styles.resultIcon}>
                                            {result.icon}
                                        </div>
                                        <div className={styles.details}>
                                            <div className={styles.resultTitle}>
                                                {result.title}
                                            </div>
                                            <div className={styles.meta}>{result.meta}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
