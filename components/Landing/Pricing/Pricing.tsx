"use client";

import styles from './Pricing.module.css';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            name: "Free",
            price: "$0",
            period: "forever",
            desc: "Perfect for personal quick capture.",
            features: ["1,000 Items", "Infinite Canvas", "Browser Extension", "Standard Sync"],
            btnText: "Get Started",
            highlight: false
        },
        {
            name: "Pro",
            price: billingCycle === 'monthly' ? "$12" : "$10",
            period: "per month",
            desc: "For power users building deep knowledge.",
            features: ["Unlimited Items", "Nested Projects", "Advanced AI Extraction", "Priority Cloud Sync", "Custom Theme Engine"],
            btnText: "Start Free Trial",
            highlight: true,
            badge: billingCycle === 'yearly' ? "2 Months Free" : null
        },
        {
            name: "Lifetime",
            price: "$149",
            period: "one-time",
            desc: "Secure your legacy forever.",
            features: ["Everything in Pro", "Lifetime Updates", "Early Beta Access", "Exclusive Founder Badge"],
            btnText: "Buy Once",
            highlight: false
        }
    ];

    return (
        <section id="pricing" className={styles.section}>
            <div className={styles.container}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={styles.intro}
                >
                    <div className={styles.badge}>Pricing</div>
                    <h2 className={styles.title}>Invest in your Mind</h2>
                    <p className={styles.paragraph}>
                        Start for free and upgrade as your thoughts grow.
                    </p>

                    <div className={styles.toggleContainer}>
                        <span className={clsx(styles.toggleLabel, billingCycle === 'monthly' && styles.activeLabel)}>Monthly</span>
                        <div
                            className={styles.toggle}
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                        >
                            <motion.div
                                className={styles.toggleHandle}
                                animate={{ x: billingCycle === 'monthly' ? 4 : 28 }}
                            />
                        </div>
                        <span className={clsx(styles.toggleLabel, billingCycle === 'yearly' && styles.activeLabel)}>Yearly</span>
                        <motion.span
                            animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1, 0.95] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={styles.saveBadge}
                        >
                            2 MONTHS FREE ✨
                        </motion.span>
                    </div>
                </motion.div>

                <div className={styles.grid}>
                    {plans.map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={clsx(styles.card, plan.highlight && styles.highlight)}
                        >
                            {plan.badge && <div className={styles.cardBadge}>{plan.badge}</div>}
                            <div className={styles.cardHeader}>
                                <h3 className={styles.planName}>{plan.name}</h3>
                                <div className={styles.priceContainer}>
                                    <span className={styles.priceSymbol}>$</span>
                                    <span className={styles.priceValue}>{plan.price.replace('$', '')}</span>
                                    <span className={styles.pricePeriod}>/{plan.period}</span>
                                </div>
                                <p className={styles.planDesc}>{plan.desc}</p>
                            </div>

                            <div className={styles.featuresList}>
                                {plan.features.map((feature, fi) => (
                                    <div key={fi} className={styles.featureItem}>
                                        <Check size={18} className="text-accent" strokeWidth={3} />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Link
                                href="https://app.brainia.space"
                                className={clsx(styles.cta, plan.highlight ? styles.ctaPrimary : styles.ctaSecondary)}
                            >
                                {plan.btnText}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
