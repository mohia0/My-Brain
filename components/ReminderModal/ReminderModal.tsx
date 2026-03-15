"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './ReminderModal.module.css';
import { X, Bell, Mail, Smartphone, Smile, ChevronDown, Calendar as CalendarIcon, Clock, BellRing, Send } from 'lucide-react';
import clsx from 'clsx';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';
import data from '@emoji-mart/data';
import * as Popover from '@radix-ui/react-popover';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });
import DigitalTimePicker from '@/components/ui/DigitalTimePicker';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; date: string; type: 'push' | 'email' | 'both'; recurrence: string; emoji: string | null }) => void;
}

type QuickPickKey = '1h' | 'today' | 'tomorrow' | 'nextWeek' | 'custom';

export default function ReminderModal({ isOpen, onClose, onSubmit }: ReminderModalProps) {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [timeVal, setTimeVal] = useState('12:00');
    const [isAllDay, setIsAllDay] = useState(false);
    const [recurrence, setRecurrence] = useState('none');
    const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
    
    // Toggles
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editorTheme, setEditorTheme] = useState<'light' | 'dark' | 'auto'>('auto');
    const [isClosing, setIsClosing] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(handleClose, 80, formRef);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            const getTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            setEditorTheme(getTheme());

            const observer = new MutationObserver(() => setEditorTheme(getTheme()));
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
            return () => observer.disconnect();
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setName('');
            setEmoji(null);
            setRecurrence('none');
            
            const nextHour = new Date(Date.now() + 3600000);
            setSelectedDate(nextHour);
            setTimeVal(nextHour.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            
            setPushEnabled(true);
            setEmailEnabled(false);
            setIsAllDay(false);
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




    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        // Ensure at least one toggle is selected
        if (!pushEnabled && !emailEnabled) {
            toast.error("Please enable at least one notification method.");
            return;
        }

        const type = (pushEnabled && emailEnabled) ? 'both' : pushEnabled ? 'push' : 'email';
        
        // Combine date and time
        const combinedDate = new Date(selectedDate);
        if (isAllDay) {
            combinedDate.setHours(0, 0, 0, 0);
        } else {
            const [hours, minutes] = timeVal.split(':');
            combinedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        
        onSubmit({ 
            name: name.trim(), 
            date: combinedDate.toISOString(), 
            type,
            recurrence,
            emoji
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
                    {/* Header/Title Section */}
                    <div className={styles.section}>
                        <div className={styles.titleRow}>
                            <Popover.Root open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                <Popover.Trigger asChild>
                                    <button type="button" className={styles.emojiPickerBtn}>
                                        {emoji ? <span>{emoji}</span> : <Smile size={20} className={styles.placeholderEmoji} />}
                                    </button>
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content side="top" align="start" sideOffset={5} style={{ zIndex: 99999 }}>
                                        <div className={styles.emojiPickerContainer} onClick={e => e.stopPropagation()}>
                                            <Picker data={data} theme={editorTheme} onEmojiSelect={(e: any) => {
                                                setEmoji(e.native);
                                                setShowEmojiPicker(false);
                                            }} />
                                            {emoji && (
                                                <button
                                                    type="button"
                                                    className={styles.removeEmojiBtn}
                                                    onClick={() => {
                                                        setEmoji(null);
                                                        setShowEmojiPicker(false);
                                                    }}
                                                >
                                                    <X size={12} /> Remove Icon
                                                </button>
                                            )}
                                        </div>
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>

                            <input
                                ref={inputRef}
                                className={styles.inputTitle}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="What needs to be done?"
                                required
                            />
                        </div>
                    </div>
                    
                    {/* Date/Time Section */}
                    <div className={styles.section}>
                        <span className={styles.sectionLabel}>When</span>
                        <div className={styles.grid}>
                            <Popover.Root>
                                <Popover.Trigger asChild>
                                    <button type="button" className={styles.dateTimeTrigger}>
                                        <CalendarIcon size={16} style={{ color: "var(--accent)" }} />
                                        <span>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </button>
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content side="bottom" align="start" sideOffset={5} className={styles.calendarDropdown} style={{ zIndex: 99999 }}>
                                        <Calendar
                                            onChange={(val: any) => setSelectedDate(val)}
                                            value={selectedDate}
                                            className={styles.reactCalendar}
                                        />
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>

                            {!isAllDay ? (
                                    <DigitalTimePicker
                                        value={timeVal}
                                        onChange={(val) => setTimeVal(val)}
                                    />
                            ) : (
                                <div className={styles.compactToggleRow} onClick={() => setIsAllDay(false)} style={{ background: 'rgba(var(--accent-rgb), 0.1)', borderColor: 'var(--accent)' }}>
                                    <div className={styles.toggleLabel} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                        All Day
                                    </div>
                                    <div className={`${styles.miniToggle} ${styles.active}`}>
                                        <div className={styles.miniKnob} />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {!isAllDay && (
                            <div className={styles.compactToggleRow} onClick={() => setIsAllDay(true)} style={{ marginTop: '4px' }}>
                                <div className={styles.toggleLabel}>
                                    <Clock size={14} style={{ opacity: 0.6 }} /> Set as All Day
                                </div>
                                <div className={styles.miniToggle}>
                                    <div className={styles.miniKnob} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recurrence & Notification Row */}
                    <div className={styles.grid}>
                        <div className={styles.section}>
                            <span className={styles.sectionLabel}>Repeat</span>
                            <Popover.Root open={showRecurrencePicker} onOpenChange={setShowRecurrencePicker}>
                                <Popover.Trigger asChild>
                                    <button type="button" className={styles.customSelectTrigger}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {recurrence === 'none' && <BellRing size={16} style={{ color: "var(--accent)" }} />}
                                            {(recurrence === 'daily' || recurrence === 'weekly' || recurrence === 'monthly' || recurrence === 'yearly') && <Send size={16} style={{ color: "var(--accent)" }} />}
                                            <span style={{ fontSize: '0.9rem' }}>
                                                {recurrence === 'none' && 'One-time'}
                                                {recurrence === 'daily' && 'Daily'}
                                                {recurrence === 'weekly' && 'Weekly'}
                                                {recurrence === 'monthly' && 'Monthly'}
                                                {recurrence === 'yearly' && 'Yearly'}
                                            </span>
                                        </div>
                                        <ChevronDown size={12} className={styles.selectIcon} />
                                    </button>
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content side="bottom" align="start" sideOffset={5} className={styles.customSelectContent} style={{ zIndex: 99999 }}>
                                        <div className={styles.customSelectOptions}>
                                            <button type="button" className={clsx(styles.selectOption, recurrence === 'none' && styles.selectedOption)} onClick={() => { setRecurrence('none'); setShowRecurrencePicker(false); }}>
                                                <BellRing size={14} style={{ marginRight: '10px', opacity: 0.6 }} /> One-time event
                                            </button>
                                            <button type="button" className={clsx(styles.selectOption, recurrence === 'daily' && styles.selectedOption)} onClick={() => { setRecurrence('daily'); setShowRecurrencePicker(false); }}>
                                                <Send size={14} style={{ marginRight: '10px', opacity: 0.6 }} /> Daily
                                            </button>
                                            <button type="button" className={clsx(styles.selectOption, recurrence === 'weekly' && styles.selectedOption)} onClick={() => { setRecurrence('weekly'); setShowRecurrencePicker(false); }}>
                                                <CalendarIcon size={14} style={{ marginRight: '10px', opacity: 0.6 }} /> Weekly
                                            </button>
                                            <button type="button" className={clsx(styles.selectOption, recurrence === 'monthly' && styles.selectedOption)} onClick={() => { setRecurrence('monthly'); setShowRecurrencePicker(false); }}>
                                                <CalendarIcon size={14} style={{ marginRight: '10px', opacity: 0.6 }} /> Monthly
                                            </button>
                                            <button type="button" className={clsx(styles.selectOption, recurrence === 'yearly' && styles.selectedOption)} onClick={() => { setRecurrence('yearly'); setShowRecurrencePicker(false); }}>
                                                <CalendarIcon size={14} style={{ marginRight: '10px', opacity: 0.6 }} /> Yearly
                                            </button>
                                        </div>
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                        </div>

                        <div className={styles.section}>
                            <span className={styles.sectionLabel}>Notify me</span>
                            <div className={styles.notifyGroup}>
                                <div className={clsx(styles.miniNotifyBtn, pushEnabled && styles.activeNotify)} onClick={() => setPushEnabled(!pushEnabled)}>
                                    <Smartphone size={16} />
                                    <span>App</span>
                                </div>
                                <div className={clsx(styles.miniNotifyBtn, emailEnabled && styles.activeNotify)} onClick={() => setEmailEnabled(!emailEnabled)}>
                                    <Mail size={16} />
                                    <span>Mail</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className={styles.footer} style={{ padding: 0, marginTop: '8px' }}>
                        <button type="submit" className={styles.submitBtn} disabled={!name.trim()}>Create Reminder</button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
