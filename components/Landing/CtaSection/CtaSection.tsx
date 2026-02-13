import Link from 'next/link';
import styles from './CtaSection.module.css';

export default function CtaSection() {
    return (
        <section className={styles.ctaSection}>
            <div className={styles.box}>
                <div className={styles.glow} />

                <div className={styles.content}>
                    <h2 className={styles.title}>
                        Ready to upgrade your mind?
                    </h2>
                    <p className={styles.subtitle}>
                        Join thousands of thinkers who have switched to a spatial workflow.
                        Free to start, powerful enough to grow with you.
                    </p>

                    <Link
                        href="https://app.brainia.space"
                        className={styles.button}
                    >
                        Get Started Now
                    </Link>

                    <p className={styles.note}>
                        No credit card required • Free plan available
                    </p>
                </div>

            </div>
        </section>
    );
}
