import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            {/* Brand */}
            <Link href="/" className={styles.brand}>
                <div className={styles.brandIcon} />
                <span>Brainia</span>
            </Link>

            {/* Navigation (Hidden on Mobile) */}
            <div className={styles.links}>
                <Link href="#features" className={styles.link}>Features</Link>
                <Link href="#use-cases" className={styles.link}>Use Cases</Link>
                <Link href="#" className={styles.link}>Pricing</Link>
            </div>

            {/* Actions */}
            <Link
                href="https://app.brainia.space"
                className={styles.cta}
            >
                Launch App
            </Link>
        </nav>
    );
}
