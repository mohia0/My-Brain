"use client";

import React, { useState, useEffect } from 'react';
import styles from './DigitalTimePicker.module.css';
import { Clock } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

interface DigitalTimePickerProps {
    value: string; // "HH:mm" (24h)
    onChange: (value: string) => void;
}

export default function DigitalTimePicker({ value, onChange }: DigitalTimePickerProps) {
    const [hours, setHours] = useState('12');
    const [minutes, setMinutes] = useState('00');
    const [ampm, setAmpm] = useState('AM');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const [h, m] = value.split(':');
        if (h && m) {
            let hNum = parseInt(h);
            const mStr = m;
            const newAmpm = hNum >= 12 ? 'PM' : 'AM';
            hNum = hNum % 12;
            if (hNum === 0) hNum = 12;
            setHours(hNum.toString().padStart(2, '0'));
            setMinutes(mStr);
            setAmpm(newAmpm);
        }
    }, [value]);

    const updateTime = (newH: string, newM: string, newAmpm: string) => {
        let hNum = parseInt(newH);
        if (newAmpm === 'PM' && hNum < 12) hNum += 12;
        if (newAmpm === 'AM' && hNum === 12) hNum = 0;
        const h24 = hNum.toString().padStart(2, '0');
        onChange(`${h24}:${newM}`);
    };

    const handleHourChange = (newHour: string) => {
        setHours(newHour);
        updateTime(newHour, minutes, ampm);
    };

    const handleMinuteChange = (newMinute: string) => {
        setMinutes(newMinute);
        updateTime(hours, newMinute, ampm);
    };

    const handleAmPmChange = (newAmpm: string) => {
        setAmpm(newAmpm);
        updateTime(hours, minutes, newAmpm);
    };

    const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allMinuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button type="button" className={styles.trigger}>
                    <Clock size={16} className={styles.icon} />
                    <span className={styles.valueText}>{hours}:{minutes} {ampm}</span>
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
                        <div className={`${styles.column} ${styles.ampmColumn}`}>
                            <span className={styles.columnLabel}>AM/PM</span>
                            <div className={styles.ampmList}>
                                <button
                                    type="button"
                                    className={`${styles.item} ${ampm === 'AM' ? styles.active : ''}`}
                                    onClick={() => handleAmPmChange('AM')}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.item} ${ampm === 'PM' ? styles.active : ''}`}
                                    onClick={() => handleAmPmChange('PM')}
                                >
                                    PM
                                </button>
                            </div>
                        </div>
                    </div>
                    <Popover.Arrow className={styles.arrow} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
