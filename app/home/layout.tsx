import type { Metadata } from 'next';
import React from 'react';
import Navbar from '@/components/Landing/Navbar/Navbar';
import Footer from '@/components/Landing/Footer/Footer';
import "../globals.css"; // Reuse global styles (variables, fonts)
import styles from './layout.module.css';

export const metadata: Metadata = {
    title: "Brainia - Your Second Brain, Spatially Organized",
    description: "Stop forgetting. Start connecting. Brainia is a spatial workspace that mimics your mind with an infinite canvas for thoughts, links, and media.",
};

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.layout}>
            <Navbar />
            <main className={styles.main}>
                {children}
            </main>
            <Footer />
        </div>
    );
}
