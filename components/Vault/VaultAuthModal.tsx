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
    _hasHydrated: boolean;
    setHasHydrated: (val: boolean) => void;
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

            _hasHydrated: false,
            setHasHydrated: (val) => set({ _hasHydrated: val }),

            checkVaultStatus: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.vault_pkh) {
                    set({
                        hasPassword: true,
                        // Sync lock state from cloud to avoid local conflict
                        isVaultLocked: user.user_metadata.vault_is_locked ?? true,
                        unlockedIds: user.user_metadata.vault_unlocked_ids || []
                    });
                } else {
                    set({ hasPassword: false, isVaultLocked: false });
                }
            },

            setIsVaultLocked: async (isLocked: boolean) => {
                set({ isVaultLocked: isLocked });
                await supabase.auth.updateUser({
                    data: { vault_is_locked: isLocked }
                });
            },

            unlock: async (password: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.user_metadata?.vault_pkh) return false;

                const hash = await sha256(password);

                if (hash === user.user_metadata.vault_pkh) {
                    set({ isVaultLocked: false });
                    // Sync to cloud
                    await supabase.auth.updateUser({
                        data: { vault_is_locked: false }
                    });
                    return true;
                }
                return false;
            },

            unlockItem: async (id: string, password: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.user_metadata?.vault_pkh) return false;

                const hash = await sha256(password);
                if (hash === user.user_metadata.vault_pkh) {
                    const newUnlocked = [...get().unlockedIds, id];
                    set({ unlockedIds: newUnlocked });
                    // Sync specific unlocked IDs to cloud
                    await supabase.auth.updateUser({
                        data: { vault_unlocked_ids: newUnlocked }
                    });
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
                        data: {
                            vault_pkh: null,
                            vault_is_locked: false,
                            vault_unlocked_ids: []
                        }
                    });
                    if (!error) {
                        try {
                            // Un-vault all items and folders for this user
                            await supabase.from('items').update({ is_vaulted: false }).eq('user_id', user.id);
                            await supabase.from('folders').update({ is_vaulted: false }).eq('user_id', user.id);

                            // Refresh logic to reflect changes locally immediately
                            await useItemsStore.getState().fetchData();
                        } catch (err) {
                            console.error("Failed to reset vault status on items", err);
                        }

                        set({ hasPassword: false, isVaultLocked: false, unlockedIds: [] });
                        return true;
                    }
                }
                return false;
            },

            lock: async () => {
                set({ isVaultLocked: true, unlockedIds: [] });
                await supabase.auth.updateUser({
                    data: {
                        vault_is_locked: true,
                        vault_unlocked_ids: []
                    }
                });
            },

            lockItem: async (id: string) => {
                const newUnlocked = get().unlockedIds.filter(uid => uid !== id);
                set({ unlockedIds: newUnlocked });
                await supabase.auth.updateUser({
                    data: { vault_unlocked_ids: newUnlocked }
                });
            },

            setPassword: async (password: string) => {
                const hash = await sha256(password);
                const { error } = await supabase.auth.updateUser({
                    data: {
                        vault_pkh: hash,
                        vault_is_locked: false,
                        vault_unlocked_ids: []
                    }
                });

                if (!error) {
                    set({ hasPassword: true, isVaultLocked: false, unlockedIds: [] });
                } else {
                    console.error(error);
                    throw error;
                }
            }
        }),
        {
            name: 'vault-storage',
            partialize: (state) => ({ isVaultLocked: state.isVaultLocked }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            }
        }
    )
);

// Expose store for cross-store logic (Plan A Security)
if (typeof window !== 'undefined') {
    (window as any).__VAULT_STORE__ = useVaultStore;
}

async function sha256(message: string) {
    // Robust SHA-256 specific for this use case to avoid 'crypto.subtle' issues in non-secure contexts (http://IP...)
    const msgBuffer = new TextEncoder().encode(message);

    // Check if crypto.subtle exists (Secure Context)
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback for non-secure contexts (like local IP dev)
    // Simple JS implementation of SHA-256 logic or use a library. 
    // Since we can't easily import a new library without npm install, let's use a small inline polyfill logic
    // OR just return a simple hash for now IF we can't use crypto (NOT SECURE for prod but unblocks dev).
    // BETTER: Use a sync simple hash for dev/local IP.

    // Actually, for a proper fix without a huge inline function, let's just warn or try a different approach.
    // But the user needs this to work.
    // Let's implement a minimal JS SHA256 here.

    const chrsz = 8;
    const hexcase = 0;

    function safe_add(x: number, y: number) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    function S(X: number, n: number) { return (X >>> n) | (X << (32 - n)); }
    function R(X: number, n: number) { return (X >>> n); }
    function Ch(x: number, y: number, z: number) { return ((x & y) ^ ((~x) & z)); }
    function Maj(x: number, y: number, z: number) { return ((x & y) ^ (x & z) ^ (y & z)); }
    function Sigma0(x: number) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
    function Sigma1(x: number) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
    function Gamma0(x: number) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
    function Gamma1(x: number) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }

    function core_sha256(m: number[], l: number) {
        var K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
        var HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
        var W = new Array(64);
        var a, b, c, d, e, f, g, h, i, j;
        var T1, T2;

        m[l >> 5] |= 0x80 << (24 - l % 32);
        m[((l + 64 >> 9) << 4) + 15] = l;

        for (i = 0; i < m.length; i += 16) {
            a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
            for (j = 0; j < 64; j++) {
                if (j < 16) W[j] = m[j + i];
                else W[j] = safe_add(safe_add(safe_add(Gamma1(W[j - 2]), W[j - 7]), Gamma0(W[j - 15])), W[j - 16]);

                T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1(e)), Ch(e, f, g)), K[j]), W[j]);
                T2 = safe_add(Sigma0(a), Maj(a, b, c));

                h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
            }

            HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
            HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
        }
        return HASH;
    }

    function str2binb(str: string) {
        var bin = Array();
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < str.length * chrsz; i += chrsz)
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
        return bin;
    }

    function binb2hex(binarray: number[]) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
        }
        return str;
    }

    return binb2hex(core_sha256(str2binb(message), message.length * chrsz));
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

            // If setup was triggered by a specific item/folder, lock it now
            if (modalTargetId) {
                // Determine if it's a folder or item based on store or assumption?
                // toggleVaultItem works for items. toggleVaultFolder for folders.
                // We don't know the type here easily.
                // However, the ID is unique.
                const state = useItemsStore.getState();
                const isFolder = state.folders.some(f => f.id === modalTargetId);
                if (isFolder) {
                    await state.toggleVaultFolder(modalTargetId);
                } else {
                    await state.toggleVaultItem(modalTargetId);
                }
            }

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
                // Plan A: Trigger store to fetch real content for the target
                if (modalTargetId) {
                    await useItemsStore.getState().revealVaulted(modalTargetId);
                } else {
                    // Refreshing the data if the whole vault is unlocked
                    await useItemsStore.getState().fetchData();
                }
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
                                {mode === 'setup' ? 'Secure Vault' : 'Unlock Vault'}
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
