"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Chrome, Download, Smartphone, QrCode } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function ExtensionsPage() {
    const [installed, setInstalled] = useState(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        // 1. Initial Check
        const checkInstallation = () => {
            const isInstalled = document.documentElement.getAttribute('data-brainia-installed') === 'true';
            setInstalled(isInstalled);
        };

        checkInstallation();

        // 2. Event Listener for dynamic detection
        window.addEventListener('BrainiaInstalled', checkInstallation);

        // 3. Interval check as fallback
        const interval = setInterval(checkInstallation, 2000);

        return () => {
            window.removeEventListener('BrainiaInstalled', checkInstallation);
            clearInterval(interval);
        };
    }, []);

    const handleInstall = () => {
        setLoading(true);
        const storeUrl = 'https://chromewebstore.google.com/detail/brainia/olebklhhlinlafohnefbacongnkpglea';
        window.open(storeUrl, '_blank');
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: 'var(--foreground)' }}>Apps & Extensions</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Supercharge your Brainia experience with browser and mobile integrations.</p>
            </div>

            <Card style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    width: '80px', height: '80px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', color: 'white'
                }}>
                    <Chrome size={40} />
                </div>

                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                        Brainia Web Clipper
                        {installed && <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>INSTALLED</span>}
                    </h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '4px', maxWidth: '500px' }}>
                        Save links, screenshots, and text snippets from anywhere on the web directly to your brain.
                        The fastest way to capture ideas without switching context.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <Button
                        onClick={handleInstall}
                        disabled={loading || installed}
                        style={{ minWidth: '160px' }}
                    >
                        {loading ? 'Installing...' : installed ? 'Installed' : 'Chrome Web Store'}
                    </Button>
                    {!installed && (
                        <Link href="/extensions/brainia.crx" download style={{ textDecoration: 'none' }}>
                            <Button
                                variant="secondary"
                                style={{ minWidth: '160px', opacity: 0.8, fontSize: '12px' }}
                            >
                                <Download size={14} style={{ marginRight: '6px' }} /> Direct Install (.crx)
                            </Button>
                        </Link>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Version 1.0.2 • Free
                    </div>
                </div>
            </Card>

            <Card style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    width: '80px', height: '80px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #3DDC84, #28B966)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', color: 'white'
                }}>
                    <Smartphone size={40} />
                </div>

                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                        Brainia for Android
                        <span style={{ fontSize: '12px', background: 'rgba(110, 86, 207, 0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>BETA</span>
                    </h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '4px', maxWidth: '500px' }}>
                        Capture ideas on the go. Share links, images, and text from any app directly to your Brainia inbox.
                        Includes offline support and quick capture widgets.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <QRCodeSVG
                            value="https://github.com/mohia0/My-Brain/raw/main/Brainia_v1.7.apk"
                            size={100}
                            level="H"
                            includeMargin={false}
                        />
                        <div style={{ fontSize: '10px', color: '#666', fontWeight: 600 }}>SCAN TO DOWNLOAD</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                        <Link href="https://github.com/mohia0/My-Brain/raw/main/Brainia_v1.7.apk" target="_blank" style={{ textDecoration: 'none' }}>
                            <Button style={{ minWidth: '140px', display: 'flex', gap: '8px' }}>
                                <Download size={16} /> Download APK
                            </Button>
                        </Link>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                            Version 1.7 • 10.2MB
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%' }} />
                        The "Capture Everywhere" Philosophy
                    </h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.5' }}>
                        Brainia isn't just a website—it's a connected system. These apps are <strong>core to the experience</strong>, designed to let you offload your thoughts instantly, no matter where you are or what device you're using.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div style={{ padding: '20px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                        <div style={{ marginBottom: '12px', color: 'var(--accent)' }}><Chrome size={24} /></div>
                        <h4 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px', color: 'var(--foreground)' }}>Web Browsing</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                            Never lose a research tab again. One click saves the current page, complete with smart tags and summary.
                        </p>
                    </div>

                    <div style={{ padding: '20px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                        <div style={{ marginBottom: '12px', color: '#10b981' }}><Smartphone size={24} /></div>
                        <h4 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px', color: 'var(--foreground)' }}>Mobile Life</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                            Ideas strike anywhere. Use the native <strong>"Share to Brainia"</strong> menu from any app on your phone to capture media, links, or text.
                        </p>
                    </div>

                    <div style={{ padding: '20px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                        <div style={{ marginBottom: '12px', color: '#f59e0b' }}><Check size={24} /></div>
                        <h4 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px', color: 'var(--foreground)' }}>Instant Sync</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                            Everything flows instantly into your central Inbox. No manual copying, no friction. Just pure capture.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
