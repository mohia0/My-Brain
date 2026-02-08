"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '@/components/AuthModal/AuthModal.module.css';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Orb from '@/components/Orb/Orb';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if we have a session (the link should have established one)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, they shouldn't be here or the link is expired
                // However, sometimes the token is in the hash and not yet processed
                // We'll give it a moment or just let the update call fail
            }
        };
        checkSession();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    setIsFading(true);
                    setTimeout(() => {
                        router.push('/');
                    }, 800);
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${styles.overlay} ${isFading ? styles.overlayFading : ''}`}>
            <Orb hue={260} hoverIntensity={0.5} backgroundColor="transparent" />

            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>Brainia</h1>
                    <p className={styles.subtitle}>
                        Secure your account with a new password.
                    </p>
                </div>

                {success ? (
                    <div className={styles.success} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '24px 0'
                    }}>
                        <CheckCircle2 size={48} className={styles.successIcon} style={{ color: 'var(--accent)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Password Updated!</strong>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Redirecting you to home...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="New Password"
                                className={styles.input}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className={styles.inputGroup}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm New Password"
                                className={styles.input}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <button type="submit" className={styles.button} disabled={loading}>
                            {loading ? 'Updating...' : 'Set New Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
