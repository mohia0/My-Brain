"use client";

import Hero from '@/components/Landing/Hero/Hero';
import FeatureGrid from '@/components/Landing/FeatureGrid/FeatureGrid';
import WorkflowShowcase from '@/components/Landing/WorkflowShowcase/WorkflowShowcase';
import SearchMind from '@/components/Landing/SearchMind/SearchMind';
import Pricing from '@/components/Landing/Pricing/Pricing';
import Downloads from '@/components/Landing/Downloads/Downloads';
import CtaSection from '@/components/Landing/CtaSection/CtaSection';
import styles from './page.module.css';

export default function LandingPage() {
    return (
        <div className={styles.container}>
            {/* 
               The Hero now contains the Massive Orb background natively (under the text)
               matching the premium sign-in experience.
            */}
            <Hero />

            {/* 
               The Concept: From Capture to Canvas. 
               This section shows how the messy mind gets organized.
            */}
            <WorkflowShowcase />

            {/* The Features: Detailed Bento Grid */}
            <FeatureGrid />

            {/* Retrieval: Spatial Search */}
            <SearchMind />

            {/* Pricing & Downloads */}
            <Pricing />
            <Downloads />
            <CtaSection />

            {/* Subtle background context */}
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent pointer-events-none -z-10" />
        </div>
    );
}
