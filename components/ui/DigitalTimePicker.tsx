"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './DigitalTimePicker.module.css';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

interface DigitalTimePickerProps {
    value: string; // "HH:mm"
    onChange: (value: string) => void;
}

export default function DigitalTimePicker({ value, onChange }: DigitalTimePickerProps) {
    const [hours, setHours] = useState(value.split(':')[0] || '12');
    const [minutes, setMinutes] = useState(value.split(':')[1] || '00');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const [h, m] = value.split(':');
        if (h && m) {
            setHours(h);
            setMinutes(m);
        }
    }, [value]);

    const handleHourChange = (newHour: string) => {
        setHours(newHour);
        onChange(`${newHour}:${minutes}`);
    };

    const handleMinuteChange = (newMinute: string) => {
        setMinutes(newMinute);
        onChange(`${hours}:${newMinute}`);
    };

    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
    // Adding all minutes might be too long, but let's provide common ones and an option for specific ones if needed.
    // Actually, for a "digital picker", a scrollable list of all 60 minutes is common.
    const allMinuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button type="button" className={styles.trigger}>
                    <Clock size={16} className={styles.icon} />
                    <span className={styles.valueText}>{hours}:{minutes}</span>
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className={styles.content} side="bottom" align="center" sideOffset={8}>
                    <div className={styles.pickerContainer}>
                        <div className={styles.column}>
                            <span className={styles.columnLabel}>Hour</span>
                            <div className={styles.list}>
                                {hourOptions.map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        className={`${styles.item} ${h === hours ? styles.active : ''}`}
                                        onClick={() => handleHourChange(h)}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.separator}>:</div>
                        <div className={styles.column}>
                            <span className={styles.columnLabel}>Min</span>
                            <div className={styles.list}>
                                {allMinuteOptions.map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`${styles.item} ${m === minutes ? styles.active : ''}`}
                                        onClick={() => handleMinuteChange(m)}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Popover.Arrow className={styles.arrow} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
