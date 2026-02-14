"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './ReportBugModal.module.css';
import { X, Send, AlertTriangle } from 'lucide-react';

interface ReportBugModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

export default function ReportBugModal({ isOpen, onClose, userEmail }: ReportBugModalProps) {
    const [email, setEmail] = useState(userEmail || '');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setEmail(userEmail || '');
            setMessage('');
            setStatus('idle');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, userEmail]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !message.trim()) return;

        setIsSubmitting(true);
        setStatus('idle');

        try {
            const res = await fetch('/api/report-bug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, message })
            });

            if (!res.ok) throw new Error('Failed to send report');

            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Report failed:', error);
            setStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={20} color="var(--accent)" />
                        <span className={styles.title}>Report a Bug</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
                </header>

                <form onSubmit={handleSubmit} className={styles.body}>
                    {status === 'success' ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--success, #22c55e)' }}>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Thank you!</p>
                            <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>We received your report.</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className={styles.label}>Your Email</label>
                                <input
                                    ref={inputRef}
                                    type="email"
                                    className={styles.input}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className={styles.label}>What went wrong?</label>
                                <textarea
                                    className={styles.textarea}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Please describe the issue..."
                                    required
                                />
                            </div>

                            {status === 'error' && (
                                <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.9rem' }}>
                                    Something went wrong. Please try again.
                                </p>
                            )}
                        </>
                    )}

                    {status !== 'success' && (
                        <div className={styles.footer} style={{ padding: 0 }}>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : (
                                    <>
                                        <span>Send Report</span>
                                        <Send size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
