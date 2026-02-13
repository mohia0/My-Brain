import styles from './FeatureGrid.module.css';
import { Network, Zap, FolderTree, Layout, Smartphone } from 'lucide-react';
import clsx from 'clsx';

export default function FeatureGrid() {
    const features = [
        {
            title: "Spatial Engine",
            desc: "An infinite 2D workspace that lets you organize without boundaries. Think outside the list.",
            Icon: Layout,
            className: styles.cardLarge
        },
        {
            title: "Real-time Sync",
            desc: "Your brain, available everywhere instantly. Seamlessly sync across desktop and mobile.",
            Icon: Zap,
            className: ""
        },
        {
            title: "Deep Organization",
            desc: "Nested folders, project areas, and visual grouping for complex knowledge management.",
            Icon: FolderTree,
            className: ""
        },
        {
            title: "Smart Connect",
            desc: "Our engine automatically detects relationships between your notes and links.",
            Icon: Network,
            className: styles.cardWide
        },
    ];

    return (
        <section id="features" className={styles.section}>
            <div className={styles.intro}>
                <h2 className={styles.title}>Core Systems</h2>
                <p className={styles.desc}>
                    Built on four architectural pillars designed to enhance how you think.
                </p>
            </div>

            <div className={styles.grid}>
                {features.map((feature, i) => (
                    <div
                        key={i}
                        className={clsx(styles.card, feature.className)}
                    >
                        <div className={styles.icon}>
                            <feature.Icon size={48} color="var(--accent)" />
                        </div>

                        <h3 className={styles.cardTitle}>{feature.title}</h3>
                        <p className={styles.cardDesc}>
                            {feature.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
