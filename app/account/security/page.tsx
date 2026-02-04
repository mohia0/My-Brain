"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ShieldAlert, Key } from 'lucide-react';

export default function SecurityPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Security</h2>
                <p style={{ color: '#888', fontSize: '14px' }}>Manage your password and security preferences.</p>
            </div>

            <Card style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Key size={20} color="var(--accent)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Change Password</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input label="Current Password" type="password" placeholder="••••••••" />
                    <Input label="New Password" type="password" placeholder="••••••••" />
                    <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                    <Button variant="secondary">Update Password</Button>
                </div>
            </Card>

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
                            Permanently remove your account and all of its contents from the My Brain platform. This action is not reversible, so please continue with caution.
                        </p>
                        <Button variant="destructive">Delete Personal Account</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
