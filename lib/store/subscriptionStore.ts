import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';

interface SubscriptionState {
    tier: SubscriptionTier;
    status: string;
    loading: boolean;
    error: string | null;

    fetchSubscription: () => Promise<void>;
    isPro: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    tier: 'free',
    status: 'active',
    loading: false,
    error: null,

    fetchSubscription: async () => {
        set({ loading: true });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                set({ tier: 'free', loading: false });
                return;
            }

            const { data, error } = await supabase
                .from('subscriptions')
                .select('tier, status')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                set({
                    tier: data.tier as SubscriptionTier,
                    status: data.status,
                    error: null
                });
            }
        } catch (err: any) {
            console.error('[SubscriptionStore] Fetch failed:', err);
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    isPro: () => {
        const { tier, status } = get();
        if (tier === 'free') return false;
        // Basic check: if not free and status is active or trial
        return ['active', 'on_trial', 'lifetime'].includes(status) || tier === 'lifetime';
    }
}));
