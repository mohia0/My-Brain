"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './AuthModal.module.css';
import { Eye, EyeOff } from 'lucide-react';

import Orb from '../Orb/Orb';

export default function AuthModal({ onLogin }: { onLogin: () => void }) {
    const [isSignUp, setIsSignUp] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('signup') === 'true';
        }
        return false;
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFading, setIsFading] = useState(false);

    const handleSuccess = () => {
        setIsFading(true);
        setTimeout(() => {
            onLogin();
        }, 800);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                if (password !== confirmPassword) {
                    setError("Passwords do not match");
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) {
                    setError(error.message);
                    setLoading(false);
                } else if (data.session) {
                    handleSuccess();
                } else {
                    setError("Please check your email to confirm signup!");
                    setLoading(false);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    setError(error.message);
                    setLoading(false);
                } else {
                    handleSuccess();
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(err.message || "An unexpected error occurred");
            setLoading(false);
        }
    };


    return (
        <div className={`${styles.overlay} ${isFading ? styles.overlayFading : ''}`}>
            <Orb hue={260} hoverIntensity={0.5} backgroundColor="#050505" />

            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>My Brain</h1>
                    <p className={styles.subtitle}>
                        {isSignUp ? "Create your infinite digital space." : "Welcome back to your second brain."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <input
                            type="email"
                            placeholder="Email address"
                            className={styles.input}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className={styles.input}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {isSignUp && (
                        <div className={styles.inputGroup} style={{ animation: 'fadeIn 0.3s ease' }}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                className={styles.input}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required={isSignUp}
                                minLength={6}
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    )}

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className={styles.footer}>
                    <div className={styles.toggleMeta}>
                        {isSignUp ? "Already have an account?" : "New to My Brain?"}
                        <span
                            className={styles.toggleLink}
                            onClick={() => { setError(null); setIsSignUp(!isSignUp); }}
                        >
                            {isSignUp ? "Sign In" : "Create Account"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

