"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal/AuthModal';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import { useItemsStore } from '@/lib/store/itemsStore';

const MobilePageContent = dynamic(
    () => import('@/components/Mobile/MobilePageContent'),
    { ssr: false }
);

const Orb = dynamic(
    () => import('@/components/Orb/Orb'),
    { ssr: false }
);

export default function MobilePage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isNativeShare, setIsNativeShare] = useState(false);

    const { fetchData, subscribeToChanges } = useItemsStore();

    useEffect(() => {
        let isMounted = true;
        
        // Fast check for native share intent to hide loading UI
        const checkInitialIntent = async () => {
            if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
                try {
                    const { registerPlugin } = await import('@capacitor/core');
                    const SendIntent = registerPlugin<any>('SendIntent');
                    if (SendIntent && typeof SendIntent.checkSendIntentReceived === 'function') {
                        const result = await SendIntent.checkSendIntentReceived();
                        if (isMounted && result && (result.value || result.extras || result.files || result.title)) {
                            setIsNativeShare(true);
                            document.body.style.backgroundColor = 'transparent';
                            document.documentElement.style.background = 'transparent';
                        }
                    }
                } catch (e) {
                    console.log('No share intent found on boot');
                }
            }
        };
        
        checkInitialIntent();

        let unsubscribe: (() => void) | undefined;

        supabase.auth.getSession().then((res: any) => {
            if (!isMounted) return;
            if (res.error) {
                console.warn("Mobile session check failed:", res.error.message);
                supabase.auth.signOut().then(() => { if (isMounted) setSession(null); });
                if (isMounted) setLoading(false);
                return;
            }

            const session = res.data?.session;
            if (isMounted) {
                setSession(session);
                setLoading(false);
                if (session) {
                    fetchData(session.user);
                    unsubscribe = subscribeToChanges();
                }
            }
        }).catch((err: any) => {
            if (!isMounted) return;
            console.warn("Mobile session unexpected error:", err);
            setLoading(false);
            setSession(null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (!isMounted) return;
            setSession(session);
            if (session) {
                fetchData(session.user);
                if (unsubscribe) unsubscribe();
                unsubscribe = subscribeToChanges();
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Background Orb */}
            <div style={{
                position: 'fixed',
                top: '85vh',
                left: '-100vw',
                width: '300vw',
                height: '300vw',
                opacity: 0.1,
                pointerEvents: 'none',
                zIndex: 0,
                filter: 'blur(30px)',
                display: isNativeShare ? 'none' : 'block'
            }}>
                <Orb
                    hue={280}
                    hoverIntensity={0.2}
                    forceHoverState={true}
                />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                {loading ? (
                    <LoadingScreen isFading={false} isTransparent={isNativeShare} />
                ) : !session ? (
                    <AuthModal onLogin={() => window.location.reload()} />
                ) : (
                    <MobilePageContent session={session} />
                )}
            </div>
        </div>
    );
}
