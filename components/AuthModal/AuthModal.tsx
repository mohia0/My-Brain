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
            const params = new URLSearchParams(window.location.search);
            setIsSignUp(params.get('signup') === 'true');

            // Detect if we landed here from a password recovery link
            // Supabase often puts this in the hash: #access_token=...&type=recovery
            if (window.location.hash.includes('type=recovery')) {
                setRecoveringPassword(true);
            }
        }

        // Also listen for the specific event from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any) => {
            if (event === 'PASSWORD_RECOVERY') {
                setRecoveringPassword(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFading, setIsFading] = useState(false);

    const [showReset, setShowReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);
    const [recoveringPassword, setRecoveringPassword] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    const handleSuccess = () => {
        setIsFading(true);
        // Signal success immediately so parent knows we are starting the exit fade
        onLogin();
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email first.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`,
            });
            if (error) setError(error.message);
            else {
                setResetSent(true);
                setError(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) setError(error.message);
            else {
                setUpdateSuccess(true);
                setTimeout(() => handleSuccess(), 2000);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        // GOOGLE OAUTH SETUP INSTRUCTIONS:
        // 1. Go to Google Cloud Console > APIs & Services > Credentials
        // 2. Create an OAuth 2.0 Client ID (Web application)
        // 3. Add to "Authorized redirect URIs": https://mopfyefzzdtohfxczdke.supabase.co/auth/v1/callback
        // 4. Copy Client ID and Client Secret to Supabase Dashboard > Authentication > Providers > Google

        if (!isSupabaseConfigured) {
            setError("Configuration Error: Supabase is not configured.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Set a flag so the page knows we are returning from an auth redirect
            if (typeof window !== 'undefined') {
                localStorage.setItem('isAuthenticating', 'true');
            }

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isSupabaseConfigured) {
            setError("Configuration Error: NEXT_PUBLIC_SUPABASE_URL or ANON_KEY is missing. Authentication is disabled.");
            return;
        }

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
                    setSignupSuccess(true);
                    setLoading(false);
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    // Suppress console.error for standard auth failures to avoid dev overlays
                    setError(error.message);
                    setLoading(false);
                } else if (data.session) {
                    handleSuccess();
                } else {
                    handleSuccess();
                }
            }
        } catch (err: any) {
            console.error("Critical Auth error:", err);
            setError(err.message || "An unexpected error occurred during authentication.");
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        if (recoveringPassword) {
            await handleUpdatePassword(e);
        } else if (showReset) {
            await handleResetPassword(e);
        } else {
            await handleSubmit(e);
        }
    };

    return (
        <div className={`${styles.overlay} ${isFading ? styles.overlayFading : ''}`}>
            <Orb hue={260} hoverIntensity={0.5} backgroundColor="transparent" />

            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>Brainia</h1>
                    <p className={styles.subtitle}>
                        {recoveringPassword
                            ? "Secure your account with a new password."
                            : (isSignUp ? "Create your infinite digital space." : "Welcome back to your second brain.")}
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

                <form onSubmit={handleFormSubmit} className={styles.form}>
                    {!recoveringPassword && !showReset && (
                        <>
                            <button
                                type="button"
                                className={styles.googleButton}
                                onClick={handleGoogleLogin}
                                disabled={loading || !isSupabaseConfigured}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {isSignUp ? "Sign up with Google" : "Sign in with Google"}
                            </button>
                            <div className={styles.divider}>or</div>
                        </>
                    )}

                    {!recoveringPassword && (
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
                    )}

                    {(recoveringPassword || !showReset) && (
                        <div className={styles.inputGroup}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={recoveringPassword ? "New Password" : "Password"}
                                className={styles.input}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete={isSignUp || recoveringPassword ? "new-password" : "current-password"}
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    )}

                    {(isSignUp || recoveringPassword) && !showReset && (
                        <div className={styles.inputGroup} style={{ animation: 'fadeIn 0.3s ease' }}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder={recoveringPassword ? "Confirm New Password" : "Confirm Password"}
                                className={styles.input}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required={isSignUp || recoveringPassword}
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
                    {resetSent && <div className={styles.success}>Password reset link sent! Check your inbox.</div>}
                    {signupSuccess && <div className={styles.signupSuccess}>Please check your email to confirm signup!</div>}
                    {updateSuccess && <div className={styles.success}>Password updated! Redirecting...</div>}

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={loading || !isSupabaseConfigured}
                    >
                        {loading ? 'Processing...' : (recoveringPassword ? 'Set New Password' : (showReset ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')))}
                    </button>
                </form>

                <div className={styles.footer}>
                    {showReset ? (
                        <div className={styles.toggleMeta}>
                            Wait, I remember!
                            <span className={styles.toggleLink} onClick={() => setShowReset(false)}>Go Back</span>
                        </div>
                    ) : (
                        <>
                            <div className={styles.toggleMeta}>
                                {isSignUp ? "Already have an account?" : "New to Brainia?"}
                                <span
                                    className={styles.toggleLink}
                                    onClick={() => { setError(null); setIsSignUp(!isSignUp); }}
                                >
                                    {isSignUp ? "Sign In" : "Create Account"}
                                </span>
                            </div>
                            {!isSignUp && (
                                <div className={styles.resetLink} onClick={() => { setError(null); setShowReset(true); }}>
                                    Forgot Password?
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

