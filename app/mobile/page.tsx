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

    const { fetchData, subscribeToChanges } = useItemsStore();

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        supabase.auth.getSession().then((res: any) => {
            const session = res.data?.session;
            setSession(session);
            setLoading(false);
            if (session) {
                fetchData(session.user);
                unsubscribe = subscribeToChanges();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setSession(session);
            if (session) {
                fetchData(session.user);
                if (unsubscribe) unsubscribe();
                unsubscribe = subscribeToChanges();
            }
        });

        return () => {
            subscription.unsubscribe();
            if (unsubscribe) unsubscribe();
        };
    }, []);

    if (loading) return <LoadingScreen isFading={false} />;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
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
            }}>
                <Orb
                    hue={280}
                    hoverIntensity={0.2}
                    forceHoverState={true}
                />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                {!session ? (
                    <AuthModal onLogin={() => window.location.reload()} />
                ) : (
                    <MobilePageContent session={session} />
                )}
            </div>
        </div>
    );
}
