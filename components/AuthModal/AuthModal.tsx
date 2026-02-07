"use client";

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import styles from './AuthModal.module.css';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

import Orb from '../Orb/Orb';

export default function AuthModal({ onLogin }: { onLogin: () => void }) {
    const [isSignUp, setIsSignUp] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSignUp(new URLSearchParams(window.location.search).get('signup') === 'true');
        }
    }, []);

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

        if (!isSupabaseConfigured) {
            setError("Configuration Error: NEXT_PUBLIC_SUPABASE_URL or ANAL_KEY is missing. Authentication is disabled.");
            console.error("Supabase is not configured. Check your environment variables.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`Attempting ${isSignUp ? 'signup' : 'signin'} for ${email}...`);

            if (isSignUp) {
                if (password !== confirmPassword) {
                    setError("Passwords do not match");
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) {
                    console.error("Signup error details:", error);
                    setError(error.message);
                    setLoading(false);
                } else if (data.session) {
                    console.log("Signup successful, session created.");
                    handleSuccess();
                } else {
                    console.log("Signup successful, confirmation email sent.");
                    setError("Please check your email to confirm signup!");
                    setLoading(false);
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    console.error("Signin error details:", error);
                    setError(error.message);
                    setLoading(false);
                } else if (data.session) {
                    console.log("Signin successful.");
                    handleSuccess();
                } else {
                    // This case shouldn't really happen with signInWithPassword if error is null, 
                    // unless session is missing for some reason.
                    console.warn("Signin returned no error but no session either.");
                    handleSuccess();
                }
            }
        } catch (err: any) {
            console.error("Critical Auth error catch:", err);
            setError(err.message || "An unexpected error occurred during authentication.");
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
                        {isSignUp ? "Create your infinite digital space." : "Welcome back to your second brain."}
                    </p>
                </div>

                {!isSupabaseConfigured && (
                    <div className={styles.error} style={{
                        background: 'rgba(255, 100, 100, 0.1)',
                        border: '1px solid #ff4444',
                        color: '#ff4444',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px'
                    }}>
                        <AlertTriangle size={18} />
                        <div>
                            <strong>Configuration Missing</strong><br />
                            {!process.env.NEXT_PUBLIC_SUPABASE_URL && <span style={{ display: 'block' }}>• NEXT_PUBLIC_SUPABASE_URL is missing</span>}
                            {!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && <span style={{ display: 'block' }}>• NEXT_PUBLIC_SUPABASE_ANON_KEY is missing</span>}
                            <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
                                Note: You must <strong>Redeploy</strong> in Vercel after adding keys.
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <input
                            type="email"
                            placeholder="Email address"
                            className={styles.input}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
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
                            autoComplete={isSignUp ? "new-password" : "current-password"}
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
                    )}

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.button} disabled={loading || !isSupabaseConfigured}>
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className={styles.footer}>
                    <div className={styles.toggleMeta}>
                        {isSignUp ? "Already have an account?" : "New to Brainia?"}
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

