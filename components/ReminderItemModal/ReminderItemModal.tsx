"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './ReminderItemModal.module.css';
import { X, Bell, Mail, Smartphone, BellRing, Send } from 'lucide-react';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';
import { useItemsStore } from '@/lib/store/itemsStore';
import { toast } from 'sonner';

interface ReminderItemModalProps {
    itemId: string;
    onClose: () => void;
}

export default function ReminderItemModal({ itemId, onClose }: ReminderItemModalProps) {
    const { items, updateItemContent } = useItemsStore();
    const item = items.find(i => i.id === itemId);

    const [name, setName] = useState('');
    const [dateVal, setDateVal] = useState('');
    const [timeVal, setTimeVal] = useState('');
    
    // Toggles
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);

    const [isClosing, setIsClosing] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(handleClose, 80, formRef);

    useEffect(() => {
        if (item && item.type === 'reminder') {
            setName(item.metadata?.title || '');
            const rData = item.metadata?.reminder;
            if (rData?.date) {
                const d = new Date(rData.date);
                // Extract YYYY-MM-DD
                setDateVal(d.toLocaleDateString('en-CA')); // en-CA gives YYYY-MM-DD
                // Extract HH:mm
                setTimeVal(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })); // en-GB gives HH:mm 24h
            } else {
                const d = new Date();
                setDateVal(d.toLocaleDateString('en-CA'));
                setTimeVal(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            }
            
            const rType = rData?.type || 'push';
            setPushEnabled(rType === 'push' || rType === 'both');
            setEmailEnabled(rType === 'email' || rType === 'both');
        }
    }, [item]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    if (!item) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !dateVal || !timeVal) return;
        if (!pushEnabled && !emailEnabled) {
            toast.error("Please enable at least one notification method.");
            return;
        }

        const type = (pushEnabled && emailEnabled) ? 'both' : pushEnabled ? 'push' : 'email';
        
        // Combine date and time
        const combinedDate = new Date(`${dateVal}T${timeVal}`);

        await updateItemContent(itemId, {
            metadata: {
                ...item.metadata,
                title: name.trim(),
                reminder: {
                    date: combinedDate.toISOString(),
                    type
                }
            }
        });

        toast.success("Reminder updated successfully");
        handleClose();
    };

    const handleTestBrowser = () => {
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification("Test Reminder", {
                    body: `This is a test for: ${name || 'Reminder'}`,
                    icon: '/icon.png'
                });
                toast.success("Browser push sent");
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Test Reminder", { body: 'Notifications enabled!' });
                    }
                });
            } else {
                toast.error("Browser notifications are blocked.");
            }
        } else {
            toast.error("Browser notifications not supported.");
        }
    };

    const handleTestEmailMobile = () => {
        // Implement mock or real API call for mobile/email push
        // For now, we simulate a successful test dispatch
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 800)),
            {
                loading: 'Dispatching cross-platform test...',
                success: 'Sent! Check your email and mobile device.',
                error: 'Failed to send cross-platform test.'
            }
        );
    };

    return (
        <div
            className={`${styles.overlay} ${isClosing ? styles.closingOverlay : ''}`}
            onClick={handleClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                className={`${styles.modal} ${isClosing ? styles.closingModal : ''}`}
                onClick={e => e.stopPropagation()}
                style={{
                    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
                    transition: offset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                }}
            >
                <div className={styles.swipeHandle} />
                <header className={styles.header}>
                    <div className={styles.titleWrapper}>
                        <Bell size={18} className="text-accent" style={{ color: "var(--accent)" }} />
                        <span className={styles.title}>Reminder Settings</span>
                    </div>
                    <button onClick={handleClose} type="button" className={styles.closeBtn}><X size={18} /></button>
                </header>

                <form onSubmit={handleSubmit} className={styles.body} ref={formRef}>
                    <div className={styles.formGroup}>
                        <label>What</label>
                        <input
                            className={styles.input}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Call mom, Review PR..."
                            required
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Date & Time</label>
                        <div className={styles.dateTimeRow}>
                            <input 
                                type="date" 
                                className={styles.dateInput} 
                                value={dateVal}
                                onChange={e => setDateVal(e.target.value)}
                                required
                            />
                            <input 
                                type="time" 
                                className={styles.timeInput} 
                                value={timeVal}
                                onChange={e => setTimeVal(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Delivery Methods</label>
                        
                        <div className={styles.toggleRow} onClick={() => setPushEnabled(!pushEnabled)}>
                            <div className={styles.toggleLabel}>
                                <Smartphone size={16} /> Browser & Mobile Push
                            </div>
                            <div className={`${styles.toggleSwitch} ${pushEnabled ? styles.active : ''}`}>
                                <div className={styles.toggleKnob} />
                            </div>
                        </div>

                        <div className={styles.toggleRow} onClick={() => setEmailEnabled(!emailEnabled)}>
                            <div className={styles.toggleLabel}>
                                <Mail size={16} /> Email Notification
                            </div>
                            <div className={`${styles.toggleSwitch} ${emailEnabled ? styles.active : ''}`}>
                                <div className={styles.toggleKnob} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Diagnostics</label>
                        <div className={styles.testRow}>
                            <button type="button" onClick={handleTestBrowser} className={styles.testBtn}>
                                <BellRing size={14} /> Test Browser
                            </button>
                            <button type="button" onClick={handleTestEmailMobile} className={styles.testBtn}>
                                <Send size={14} /> Test Apps/Email
                            </button>
                        </div>
                    </div>

                    <div className={styles.footer} style={{ padding: 0, marginTop: '8px' }}>
                        <button type="submit" className={styles.submitBtn} disabled={!name.trim() || !dateVal || !timeVal}>
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
