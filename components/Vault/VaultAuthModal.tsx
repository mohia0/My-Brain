"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { X, Lock, Check, Eye, EyeOff } from 'lucide-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import styles from './VaultAuthModal.module.css';

interface VaultState {
    isVaultLocked: boolean;
    unlockedIds: string[];
    hasPassword: boolean | null; // null = checking
    isModalOpen: boolean; // track modal visibility globally
    modalTargetId: string | null; // target ID for the current modal
    setModalOpen: (open: boolean, targetId?: string | null) => void;
    unlock: (password: string) => Promise<boolean>;
    unlockItem: (id: string, password: string) => Promise<boolean>;
    lock: () => void;
    lockItem: (id: string) => void;
    setPassword: (password: string) => Promise<void>;
    checkVaultStatus: () => Promise<void>;
    setIsVaultLocked: (isLocked: boolean) => void;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    removePassword: (password: string) => Promise<boolean>;
}

export const useVaultStore = create<VaultState>()(
    persist(
        (set, get) => ({
            isVaultLocked: true,
            unlockedIds: [],
            hasPassword: null,
            isModalOpen: false,
            modalTargetId: null,

            setModalOpen: (open: boolean, targetId: string | null = null) =>
                set({ isModalOpen: open, modalTargetId: targetId }),

            checkVaultStatus: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.vault_pkh) {
                    set({ hasPassword: true });
                } else {
                    set({ hasPassword: false, isVaultLocked: false });
                }
            },

            setIsVaultLocked: (isLocked: boolean) => set({ isVaultLocked: isLocked }),

            unlock: async (password: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.user_metadata?.vault_pkh) return false;

                const hash = await sha256(password);

                if (hash === user.user_metadata.vault_pkh) {
                    set({ isVaultLocked: false });
                    return true;
                }
                return false;
            },

            unlockItem: async (id: string, password: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.user_metadata?.vault_pkh) return false;

                const hash = await sha256(password);
                if (hash === user.user_metadata.vault_pkh) {
                    set(state => ({
                        unlockedIds: [...state.unlockedIds, id]
                    }));
                    return true;
                }
                return false;
            },

            changePassword: async (oldPassword: string, newPassword: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.user_metadata?.vault_pkh) return false;

                const oldHash = await sha256(oldPassword);
                if (oldHash === user.user_metadata.vault_pkh) {
                    const newHash = await sha256(newPassword);
                    const { error } = await supabase.auth.updateUser({
                        data: { vault_pkh: newHash }
                    });
                    if (!error) return true;
                }
                return false;
            },

            removePassword: async (password: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.user_metadata?.vault_pkh) return false;

                const hash = await sha256(password);
                if (hash === user.user_metadata.vault_pkh) {
                    const { error } = await supabase.auth.updateUser({
                        data: { vault_pkh: null }
                    });
                    if (!error) {
                        set({ hasPassword: false, isVaultLocked: false });
                        return true;
                    }
                }
                return false;
            },

            lock: () => set({ isVaultLocked: true, unlockedIds: [] }),

            lockItem: (id: string) => set(state => ({
                unlockedIds: state.unlockedIds.filter(uid => uid !== id)
            })),

            setPassword: async (password: string) => {
                const hash = await sha256(password);
                const { error } = await supabase.auth.updateUser({
                    data: { vault_pkh: hash }
                });

                if (!error) {
                    set({ hasPassword: true, isVaultLocked: false });
                } else {
                    console.error(error);
                    throw error;
                }
            }
        }),
        {
            name: 'vault-storage',
            partialize: (state) => ({ unlockedIds: state.unlockedIds, isVaultLocked: state.isVaultLocked }),
        }
    )
);

async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


export default function VaultAuthModal({ onClose, onSuccess }: { onClose: () => void, onSuccess?: () => void }) {
    const { unlock, unlockItem, setPassword, hasPassword, checkVaultStatus, modalTargetId } = useVaultStore();
    const [input, setInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'unlock' | 'setup'>(hasPassword === false ? 'setup' : 'unlock');

    useEffect(() => {
        if (hasPassword === null) {
            checkVaultStatus();
        }
        if (hasPassword === false) {
            setMode('setup');
        } else if (hasPassword === true) {
            setMode('unlock');
        }
    }, [hasPassword]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (mode === 'setup') {
            if (input.length < 4) {
                setError("Password must be at least 4 characters");
                return;
            }
            await setPassword(input);
            toast.success("Vault password set!");
            onSuccess?.();
            onClose();
        } else {
            let success = false;
            if (modalTargetId) {
                success = await unlockItem(modalTargetId, input);
            } else {
                success = await unlock(input);
            }

            if (success) {
                // toast.success(modalTargetId ? "Item unlocked" : "Vault unlocked");
                onSuccess?.();
                onClose();
            } else {
                setError("Incorrect password");
            }
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <div className={styles.iconWrapper}>
                            <Lock size={20} />
                        </div>
                        <div>
                            <h2 className={styles.title}>
                                {mode === 'setup' ? 'Secure Vault' : 'Welcome Back'}
                            </h2>
                            <p className={styles.subtitle}>
                                {mode === 'setup' ? 'Initial Setup' : 'Authorized Access Only'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div>
                        <p className={styles.description}>
                            {mode === 'setup'
                                ? "Create a master password to encrypt your sensitive data. This key is stored locally and cannot be recovered."
                                : "Please provide your master key to decrypt and reveal this protected area."}
                        </p>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                autoFocus
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Master Password"
                                className={styles.input}
                            />
                            <button
                                type="button"
                                className={styles.eyeButton}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {error && <div className={styles.error}>
                            {error}
                        </div>}
                    </div>

                    <div className={styles.footer}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                        >
                            {mode === 'setup' ? 'Establish Vault' : 'Decrypt Mind'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
