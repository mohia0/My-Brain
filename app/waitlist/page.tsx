"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Orb from '@/components/Orb/Orb';
import styles from './page.module.css';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function WaitlistPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Basic validation
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address.');
            setLoading(false);
            return;
        }

        try {
            // Insert into Supabase
            // We assume a 'waitlist' table exists with an 'email' column.
            const { error: dbError } = await supabase
                .from('waitlist')
                .insert([{ email, created_at: new Date().toISOString() }]);

            if (dbError) {
                // If the error code indicates duplicate key (23505), we can treat it as success or specific message
                if (dbError.code === '23505') {
                    setSuccess(true); // "You're already on the list!" effectively
                } else {
                    console.error('Waitlist error:', dbError);
                    setError('Something went wrong. Please try again.');
                }
            } else {
                setSuccess(true);
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to submit. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Background Orb */}
            <motion.div
                className={styles.orbWrapper}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            >
                <Orb
                    hue={280}
                    hoverIntensity={0.6}
                    rotateOnHover={true}
                    forceHoverState={false}
                    backgroundColor="transparent"
                />
            </motion.div>

            {/* Content */}
            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            >
                <div className={styles.card}>
                    <div className={styles.header}>
                        <motion.h1
                            className={styles.title}
                            initial={{ backgroundPosition: "0% 50%" }}
                            animate={{ backgroundPosition: "100% 50%" }}
                            transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
                        >
                            Brainia
                        </motion.h1>
                        <p className={styles.description}>
                            The second brain you've always wanted.<br />
                            Join the waitlist for early access.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                className={styles.successMessage}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <CheckCircle2 size={24} />
                                <div>
                                    <strong style={{ display: 'block', color: '#fff' }}>You're on the list!</strong>
                                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>We'll be in touch soon.</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                onSubmit={handleSubmit}
                                className={styles.form}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={styles.button}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className={styles.spinner} />
                                    ) : (
                                        <>
                                            Join Waitlist <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>

                                {error && (
                                    <motion.p
                                        className={styles.error}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
