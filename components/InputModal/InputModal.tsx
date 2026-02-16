"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './InputModal.module.css';
import { X } from 'lucide-react';
import { useSwipeDown } from '@/lib/hooks/useSwipeDown';
import { toast } from "sonner";

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    mode?: 'text' | 'file' | 'camera'; // Add mode support
}

export default function InputModal({ isOpen, onClose, onSubmit, title, placeholder, defaultValue = '', mode = 'text' }: InputModalProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const { onTouchStart, onTouchMove, onTouchEnd, offset } = useSwipeDown(onClose, 80, formRef);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, defaultValue]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Limit to 3MB
            const MAX_SIZE = 3 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
                toast.error("File too large", {
                    description: "Maximum size allowed is 3MB.",
                });
                e.target.value = ''; // Reset input
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setValue(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // For file mode, value should be the base64 string
        if (value.trim()) {
            onSubmit(value);
            onClose();
        }
    };

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                style={{
                    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
                    transition: offset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                }}
            >
                <div className={styles.swipeHandle} />
                <header className={styles.header}>
                    <span className={styles.title}>{title}</span>
                    <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
                </header>
                <form onSubmit={handleSubmit} className={styles.body} ref={formRef}>
                    {(mode === 'file' || mode === 'camera') ? (
                        <div className={styles.fileInputWrapper}>
                            {value && (value.startsWith('data:') || value.startsWith('http')) && (
                                <div className={styles.imagePreviewWrapper}>
                                    {value && <img src={value} alt="Preview" className={styles.imagePreview} />}
                                    <button
                                        type="button"
                                        className={styles.removeImageBtn}
                                        onClick={() => setValue('')}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture={mode === 'camera' ? 'environment' : undefined}
                                onChange={handleFileChange}
                                className={styles.fileInput}
                                id="file-upload"
                            />
                            {!value && (
                                <label htmlFor="file-upload" className={styles.fileLabel}>
                                    Click to Upload Image
                                </label>
                            )}
                            {/* Or paste URL fallback */}
                            <input
                                className={styles.input}
                                value={(value && value.startsWith('data:')) ? '' : value}
                                onChange={e => setValue(e.target.value)}
                                placeholder="Or paste image URL..."
                                style={{ marginTop: 8 }}
                            />
                        </div>
                    ) : (
                        <input
                            ref={inputRef}
                            className={styles.input}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder={placeholder}
                        />
                    )}

                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" className={styles.submitBtn}>Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
