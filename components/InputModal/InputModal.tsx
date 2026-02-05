"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './InputModal.module.css';
import { X } from 'lucide-react';

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    mode?: 'text' | 'file'; // Add mode support
}

export default function InputModal({ isOpen, onClose, onSubmit, title, placeholder, defaultValue = '', mode = 'text' }: InputModalProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <span className={styles.title}>{title}</span>
                    <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
                </header>
                <form onSubmit={handleSubmit} className={styles.body}>
                    {mode === 'file' ? (
                        <div className={styles.fileInputWrapper}>
                            {value && (value.startsWith('data:') || value.startsWith('http')) && (
                                <div className={styles.imagePreviewWrapper}>
                                    <img src={value} alt="Preview" className={styles.imagePreview} />
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
