import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.orb} />

            <div className={styles.content}>
                <div className={styles.badge}>
                    v1.0 is Live
                </div>

                <h1 className={styles.title}>
                    Stop Forgetting.<br />
                    Start Connecting.
                </h1>

                <p className={styles.subtitle}>
                    Brainia is a spatial workspace that mimics your mind. Capture, organize, and retrieve ideas on an infinite canvas, not a linear list.
                </p>

                <div className={styles.actions}>
                    <Link href="https://app.brainia.space" className={styles.primary}>
                        Get Started for Free
                    </Link>
                    <button className={styles.secondary}>
                        Watch Demo
                    </button>
                </div>
            </div>

            <div className={styles.preview}>
                <div className={styles.previewLabel}>Interactive Canvas Preview</div>
            </div>
        </section>
    );
}
