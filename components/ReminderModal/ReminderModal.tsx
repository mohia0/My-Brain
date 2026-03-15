"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './ReminderModal.module.css';
import { X, Bell, Mail, Smartphone, Clock, CalendarDays, Sunrise, MoonStar, CalendarPlus } from 'lucide-react';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; date: string; type: 'push' | 'email' | 'both' }) => void;
}

type QuickPickKey = '1h' | 'today' | 'tomorrow' | 'nextWeek' | 'custom';

export default function ReminderModal({ isOpen, onClose, onSubmit }: ReminderModalProps) {
    const [name, setName] = useState('');
    const [dateVal, setDateVal] = useState('');
    const [timeVal, setTimeVal] = useState('');
    const [selectedQuickPick, setSelectedQuickPick] = useState<QuickPickKey>('1h');
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(handleClose, 80, formRef);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setName('');
            
            const nextHour = new Date(Date.now() + 3600000);
            setDateVal(nextHour.toLocaleDateString('en-CA'));
            setTimeVal(nextHour.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            
            setSelectedQuickPick('1h');
            setPushEnabled(true);
            setEmailEnabled(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;


    const calculateDateFromPick = (pick: QuickPickKey): Date => {
        const now = new Date();
        switch (pick) {
            case '1h':
                return new Date(now.getTime() + 60 * 60 * 1000);
            case 'today':
                now.setHours(18, 0, 0, 0); 
                if (now.getTime() <= Date.now()) {
                    now.setHours(21, 0, 0, 0); 
                }
                return now;
            case 'tomorrow':
                now.setDate(now.getDate() + 1);
                now.setHours(9, 0, 0, 0); 
                return now;
            case 'nextWeek':
                now.setDate(now.getDate() + (7 - now.getDay() + 1) * 1);
                now.setHours(9, 0, 0, 0);
                return now;
            case 'custom':
                if (dateVal && timeVal) {
                    return new Date(`${dateVal}T${timeVal}`);
                }
                return new Date();
            default:
                return new Date();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        if (selectedQuickPick === 'custom' && (!dateVal || !timeVal)) return;

        // Ensure at least one toggle is selected
        if (!pushEnabled && !emailEnabled) {
            import('sonner').then(mod => mod.toast.error("Please enable at least one notification method."));
            return;
        }

        const type = (pushEnabled && emailEnabled) ? 'both' : pushEnabled ? 'push' : 'email';
        const finalDateDate = calculateDateFromPick(selectedQuickPick);
        
        onSubmit({ 
            name: name.trim(), 
            date: finalDateDate.toISOString(), 
            type 
        });
        handleClose();
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
                        <span className={styles.title}>New Reminder</span>
                    </div>
                    <button onClick={handleClose} type="button" className={styles.closeBtn}><X size={18} /></button>
                </header>

                <form onSubmit={handleSubmit} className={styles.body} ref={formRef}>
                    <div className={styles.formGroup}>
                        <label>What</label>
                        <input
                            ref={inputRef}
                            className={styles.input}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Call mom, Review PR..."
                            required
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>When</label>
                        <div className={styles.quickPicks}>
                            <button type="button" className={`${styles.quickBtn} ${selectedQuickPick === '1h' ? styles.active : ''}`} onClick={() => setSelectedQuickPick('1h')}>
                                <span className={styles.quickTitle}><Clock size={14} /> In 1 Hour</span>
                            </button>
                            <button type="button" className={`${styles.quickBtn} ${selectedQuickPick === 'today' ? styles.active : ''}`} onClick={() => setSelectedQuickPick('today')}>
                                <span className={styles.quickTitle}><MoonStar size={14} /> Later Today</span>
                            </button>
                            <button type="button" className={`${styles.quickBtn} ${selectedQuickPick === 'tomorrow' ? styles.active : ''}`} onClick={() => setSelectedQuickPick('tomorrow')}>
                                <span className={styles.quickTitle}><Sunrise size={14} /> Tomorrow</span>
                                <span className={styles.quickDesc}>Morning</span>
                            </button>
                            <button type="button" className={`${styles.quickBtn} ${selectedQuickPick === 'nextWeek' ? styles.active : ''}`} onClick={() => setSelectedQuickPick('nextWeek')}>
                                <span className={styles.quickTitle}><CalendarDays size={14} /> Next Week</span>
                                <span className={styles.quickDesc}>Monday</span>
                            </button>
                        </div>
                        
                        {selectedQuickPick === 'custom' ? (
                            <div className={styles.dateTimeRow}>
                                <input 
                                    type="date" 
                                    className={styles.dateInput} 
                                    value={dateVal}
                                    onChange={e => setDateVal(e.target.value)}
                                    required={selectedQuickPick === 'custom'}
                                />
                                <input 
                                    type="time" 
                                    className={styles.timeInput} 
                                    value={timeVal}
                                    onChange={e => setTimeVal(e.target.value)}
                                    required={selectedQuickPick === 'custom'}
                                />
                            </div>
                        ) : (
                            <button type="button" className={styles.customDateToggle} onClick={() => setSelectedQuickPick('custom')}>
                                <CalendarPlus size={14} /> Pick exact time
                            </button>
                        )}
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

                    <div className={styles.footer}>
                        <button type="button" onClick={handleClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" className={styles.submitBtn} disabled={!name.trim() || (selectedQuickPick === 'custom' && (!dateVal || !timeVal))}>Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
