import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>

                <div className={styles.brandColumn}>
                    <div className={styles.brand}>
                        <div className={styles.brandIcon} />
                        <span>Brainia</span>
                    </div>
                    <p>
                        Your second brain, spatially organized. Built for thinkers, creators, and builders.
                    </p>
                    <div className={styles.copy}>
                        © {new Date().getFullYear()} Brainia Labs. All rights reserved.
                    </div>
                </div>

                <div className={styles.linksColumn}>
                    <span className={styles.columnTitle}>Product</span>
                    <Link href="#" className={styles.link}>Features</Link>
                    <Link href="#" className={styles.link}>Pricing</Link>
                    <Link href="#" className={styles.link}>Download Extension</Link>
                </div>

                <div className={styles.linksColumn}>
                    <span className={styles.columnTitle}>Company</span>
                    <Link href="#" className={styles.link}>About</Link>
                    <Link href="#" className={styles.link}>Blog</Link>
                    <Link href="#" className={styles.link}>Careers</Link>
                </div>

                <div className={styles.linksColumn}>
                    <span className={styles.columnTitle}>Legal</span>
                    <Link href="#" className={styles.link}>Privacy Policy</Link>
                    <Link href="#" className={styles.link}>Terms of Service</Link>
                </div>

            </div>
        </footer>
    );
}
