"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { User, Camera } from 'lucide-react';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }: any) => {
            setUser(user);
            if (user?.user_metadata?.avatar_url) {
                setAvatarUrl(user.user_metadata.avatar_url);
            }
        });
    }, []);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update User Metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) {
                throw updateError;
            }

            setAvatarUrl(publicUrl);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    if (!user) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Profile</h2>
                <p style={{ color: '#888', fontSize: '14px' }}>Manage your personal information and appearance.</p>
            </div>

            <Card style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative' }}>
                    <div style={{
                        width: '80px', height: '80px',
                        borderRadius: '50%',
                        background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(135deg, #6e56cf, #4a3b8c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '32px', fontWeight: 600, color: 'white',
                        overflow: 'hidden'
                    }}>
                        {!avatarUrl && user.email?.[0].toUpperCase()}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: '28px', height: '28px',
                            borderRadius: '50%',
                            background: '#222', border: '2px solid var(--background)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            opacity: uploading ? 0.5 : 1
                        }}
                    >
                        <Camera size={14} />
                    </button>

                    <div style={{
                        position: 'absolute',
                        left: '100%',
                        top: '50%',
                        marginLeft: '12px',
                        background: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: showSuccess ? 1 : 0,
                        transform: `translateY(-50%) translateX(${showSuccess ? '0' : '-10px'})`,
                        pointerEvents: 'none',
                        zIndex: 10
                    }}>
                        Updated!
                    </div>
                </div>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 500 }}>{user.email?.split('@')[0]}</h3>
                    <p style={{ color: '#888', fontSize: '14px' }}>{user.email}</p>
                </div>
            </Card>

            <Card style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Personal Information</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <Input label="First Name" placeholder="Mohi" defaultValue="Mohi" />
                    <Input label="Last Name" placeholder="Hassan" defaultValue="Hassan" />
                </div>

                <Input label="Email Address" value={user.email} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                    <Button onClick={() => setLoading(true)} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
