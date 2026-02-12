-- Run this in your Supabase SQL Editor to set up subscription limits
-- This script implements the LemonSqueezy-based "Smart Pricing" model

-- 1. Create the subscription tier enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro_monthly', 'pro_annual', 'lifetime');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier public.subscription_tier DEFAULT 'free',
    lemonsqueezy_customer_id text,
    lemonsqueezy_subscription_id text,
    status text DEFAULT 'active', -- active, past_due, unpaid, cancelled, expired, on_trial
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own subscription
CREATE POLICY "Users can read their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Function to check usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_tier public.subscription_tier;
    v_usage_count integer;
    v_limit_cards integer := 65;
    v_limit_projects integer := 2;
    v_limit_folders integer := 4;
BEGIN
    -- Get user's subscription tier
    SELECT tier INTO v_tier FROM public.subscriptions WHERE user_id = auth.uid();
    
    -- Default to free if not found (though trigger on signup should handle this)
    IF v_tier IS NULL THEN
        v_tier := 'free';
    END IF;

    -- If not free, allow everything
    IF v_tier != 'free' THEN
        RETURN NEW;
    END IF;

    -- Check limits for ITEMS table
    IF TG_TABLE_NAME = 'items' THEN
        -- Check if it's a project area
        IF NEW.type = 'project' THEN
            SELECT count(*) INTO v_usage_count FROM public.items 
            WHERE user_id = auth.uid() AND type = 'project' AND (status != 'archived' OR status IS NULL);
            
            IF v_usage_count >= v_limit_projects THEN
                RAISE EXCEPTION 'Usage limit exceeded: Free tier is limited to % Project Areas.', v_limit_projects;
            END IF;
        ELSE
            -- Normal card/item
            SELECT count(*) INTO v_usage_count FROM public.items 
            WHERE user_id = auth.uid() AND type != 'project' AND (status != 'archived' OR status IS NULL);
            
            IF v_usage_count >= v_limit_cards THEN
                RAISE EXCEPTION 'Usage limit exceeded: Free tier is limited to % Cards.', v_limit_cards;
            END IF;
        END IF;
    END IF;

    -- Check limits for FOLDERS table
    IF TG_TABLE_NAME = 'folders' THEN
        SELECT count(*) INTO v_usage_count FROM public.folders 
        WHERE user_id = auth.uid() AND (status != 'archived' OR status IS NULL);
        
        IF v_usage_count >= v_limit_folders THEN
            RAISE EXCEPTION 'Usage limit exceeded: Free tier is limited to % Folders.', v_limit_folders;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Triggers
DROP TRIGGER IF EXISTS tr_check_item_limit ON public.items;
CREATE TRIGGER tr_check_item_limit
    BEFORE INSERT ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.check_usage_limits();

DROP TRIGGER IF EXISTS tr_check_folder_limit ON public.folders;
CREATE TRIGGER tr_check_folder_limit
    BEFORE INSERT ON public.folders
    FOR EACH ROW EXECUTE FUNCTION public.check_usage_limits();

-- 5. Auto-create subscription row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, tier)
    VALUES (NEW.id, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 6. Backfill existing users (Optional - uncomment to run)
-- INSERT INTO public.subscriptions (user_id, tier)
-- SELECT id, 'free' FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;
