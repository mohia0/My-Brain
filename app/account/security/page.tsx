"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ShieldAlert, Key, Lock, Unlock, Trash2 } from 'lucide-react';
import VaultAuthModal, { useVaultStore } from '@/components/Vault/VaultAuthModal';
import { toast } from 'sonner';

export default function SecurityPage() {
    const { hasPassword, checkVaultStatus, changePassword, removePassword, setModalOpen, isModalOpen } = useVaultStore();

    // Account Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Vault State
    const [vaultOldPassword, setVaultOldPassword] = useState('');
    const [vaultNewPassword, setVaultNewPassword] = useState('');
    const [vaultConfirmPassword, setVaultConfirmPassword] = useState('');
    const [vaultRemovePassword, setVaultRemovePassword] = useState('');
    const [isRemovingVault, setIsRemovingVault] = useState(false);

    useEffect(() => {
        checkVaultStatus();
    }, []);

    const handleUpdateAccountPassword = () => {
        // Placeholder for account password update
        toast.info("Account password update not implemented in this demo.");
    };

    const handleChangeVaultPassword = async () => {
        if (vaultNewPassword !== vaultConfirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        if (vaultNewPassword.length < 4) {
            toast.error("Password must be at least 4 characters");
            return;
        }

        const success = await changePassword(vaultOldPassword, vaultNewPassword);
        if (success) {
            toast.success("Master lock password updated");
            setVaultOldPassword('');
            setVaultNewPassword('');
            setVaultConfirmPassword('');
        } else {
            toast.error("Incorrect current password");
        }
    };

    const handleRemoveVault = async () => {
        const success = await removePassword(vaultRemovePassword);
        if (success) {
            toast.success("Master lock removed. Your vaulted items are now accessible.");
            setVaultRemovePassword('');
            setIsRemovingVault(false);
        } else {
            toast.error("Incorrect password");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Security</h2>
                <p style={{ color: '#888', fontSize: '14px' }}>Manage your password, vault, and security preferences.</p>
            </div>

            {/* Account Password Section */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Key size={20} color="var(--accent)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Account Password</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                        label="Current Password"
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Input
                        label="New Password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                        label="Confirm New Password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                    <Button variant="secondary" onClick={handleUpdateAccountPassword}>Update Password</Button>
                </div>
            </Card>

            {/* Master Vault Section */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Lock size={20} color="var(--accent)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Master Vault Lock</h3>
                </div>

                {hasPassword === false ? (
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ color: '#aaa', marginBottom: '16px' }}>
                            You have not set up a Master Lock yet. Secure your sensitive ideas effectively.
                        </p>
                        <Button onClick={() => setModalOpen(true)}>Setup Master Lock</Button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#ddd' }}>Change Master Password</h4>
                            <Input
                                label="Current Vault Password"
                                type="password"
                                placeholder="••••••••"
                                value={vaultOldPassword}
                                onChange={(e) => setVaultOldPassword(e.target.value)}
                            />
                            <Input
                                label="New Vault Password"
                                type="password"
                                placeholder="••••••••"
                                value={vaultNewPassword}
                                onChange={(e) => setVaultNewPassword(e.target.value)}
                            />
                            <Input
                                label="Confirm New Password"
                                type="password"
                                placeholder="••••••••"
                                value={vaultConfirmPassword}
                                onChange={(e) => setVaultConfirmPassword(e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                                <Button variant="secondary" onClick={handleChangeVaultPassword}>Update Master Lock</Button>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', marginTop: '8px' }}>
                            {!isRemovingVault ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#ff4d4d' }}>Remove Master Lock</h4>
                                        <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                            Permanently remove the vault protection. All locked items will become visible.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        style={{ background: 'rgba(255, 50, 50, 0.1)', color: '#ff4d4d' }}
                                        onClick={() => setIsRemovingVault(true)}
                                    >
                                        Remove Lock
                                    </Button>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(255, 50, 50, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 50, 50, 0.1)' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ff4d4d', marginBottom: '12px' }}>Confirm Removal</h4>
                                    <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '16px' }}>
                                        Please enter your current master password to confirm removal.
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 1 }}>
                                            <Input
                                                label="Current Vault Password"
                                                type="password"
                                                value={vaultRemovePassword}
                                                onChange={(e) => setVaultRemovePassword(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <Button variant="secondary" onClick={() => { setIsRemovingVault(false); setVaultRemovePassword(''); }}>Cancel</Button>
                                        <Button variant="destructive" onClick={handleRemoveVault}>Confirm Remove</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Card>

            {/* Delete Account Section */}
            <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(255, 50, 50, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <ShieldAlert size={20} color="#ff4d4d" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ff4d4d', marginBottom: '8px' }}>Delete Account</h3>
                        <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                            Permanently remove your account and all of its contents from the Brainia platform. This action is not reversible, so please continue with caution.
                        </p>
                        <Button variant="destructive">Delete Personal Account</Button>
                    </div>
                </div>
            </Card>

            {
                isModalOpen && (
                    <VaultAuthModal
                        onClose={() => setModalOpen(false)}
                        onSuccess={() => setModalOpen(false)}
                    />
                )
            }
        </div >
    );
}
