"use client";

import styles from './Pricing.module.css';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';

export default function Pricing() {
    const plans = [
        {
            name: "Starter",
            price: "$0",
            features: ["500 Items", "Infinite Canvas", "Chrome Extension", "Basic Sync"],
            popular: false
        },
        {
            name: "Brainia+",
            price: "$8",
            features: ["Unlimited Items", "Nested Projects", "Advanced AI Capture", "Real-time Mobile Sync"],
            popular: true
        },
        {
            name: "Team",
            price: "$20",
            features: ["Shared Canvases", "Role Permissions", "Admin Console", "Priority Support"],
            popular: false
        }
    ];

    return (
        <section id="pricing" className={styles.section}>
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-bold mb-4"
            >
                Simple, transparent pricing
            </motion.h2>
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-dim max-w-lg mx-auto mb-16"
            >
                Choose the plan that fits your mental workspace.
            </motion.p>

            <div className={styles.grid}>
                {plans.map((plan, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className={clsx(styles.card, plan.popular && styles.popular)}
                    >
                        <div className={styles.planTitle}>{plan.name}</div>
                        <div className={styles.price}>{plan.price}<span>/mo</span></div>

                        <div className={styles.features}>
                            {plan.features.map((f, fi) => (
                                <div key={fi} className={styles.feature}>
                                    <Check size={16} className="text-accent" />
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="https://app.brainia.space"
                            className={clsx(styles.btn, plan.popular ? styles.btnPrimary : styles.btnSecondary)}
                        >
                            Get Started
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
