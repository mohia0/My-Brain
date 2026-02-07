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

    if (!session) {
        return <AuthModal onLogin={() => window.location.reload()} />;
    }

    return <MobilePageContent session={session} />;
}
