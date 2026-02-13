"use client";

import Hero from '@/components/Landing/Hero/Hero';
import FeatureGrid from '@/components/Landing/FeatureGrid/FeatureGrid';
import CtaSection from '@/components/Landing/CtaSection/CtaSection';
import styles from './page.module.css';

export default function LandingPage() {
    return (
        <div className={styles.container}>
            <Hero />
            <FeatureGrid />
            <CtaSection />
        </div>
    );
}
