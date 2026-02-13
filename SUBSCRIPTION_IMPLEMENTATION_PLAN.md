# Subscription Implementation Plan

## Overview
This plan outlines the complete implementation of a subscription system into the Brainia app, covering database setup, backend logic, UI components, feature gating, and payment integration.

---

## 📊 Subscription Tiers (From SQL)

### Free Tier
- **65 Cards** (items with type != 'project')
- **4 Folders**
- **2 Project Areas** (items with type == 'project')
- Infinite Canvas
- Browser Extension
- Standard Sync

### Pro Tier (Monthly: $12/mo | Annual: $10/mo)
- **Unlimited Items**
- **Nested Projects** (unlimited project areas)
- Advanced AI Extraction
- Priority Cloud Sync
- Custom Theme Engine
- Unlimited Folders

### Lifetime Tier ($149 one-time)
- Everything in Pro
- Lifetime Updates
- Early Beta Access
- Exclusive Founder Badge

---

## 🎯 Implementation Phases

### Phase 1: Database & Backend Setup ✅ (SQL Ready)

#### 1.1 Execute SQL Script in Supabase
- [ ] Run `sql/06_update_subscription_limits.sql` in Supabase SQL Editor
- [ ] Verify tables created: `subscriptions`
- [ ] Verify enum type: `subscription_tier`
- [ ] Verify triggers: `tr_check_item_limit`, `tr_check_folder_limit`
- [ ] Verify functions: `check_usage_limits()`, `handle_new_user_subscription()`
- [ ] Verify RLS policies on subscriptions table
- [ ] *Optional*: Uncomment and run backfill script for existing users

#### 1.2 Test Database Setup
- [ ] Create a test user and verify subscription row is auto-created
- [ ] Test free tier limits (try creating 66+ cards, should fail)
- [ ] Test folder limits (try creating 5+ folders, should fail)
- [ ] Test project area limits (try creating 3+ project areas, should fail)

---

### Phase 2: TypeScript Types & Interfaces

#### 2.1 Create Database Types File
**File**: `types/supabase.types.ts`

```typescript
export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';

export type SubscriptionStatus = 
  | 'active' 
  | 'past_due' 
  | 'unpaid' 
  | 'cancelled' 
  | 'expired' 
  | 'on_trial';

export interface Subscription {
  user_id: string;
  tier: SubscriptionTier;
  lemonsqueezy_customer_id?: string;
  lemonsqueezy_subscription_id?: string;
  status: SubscriptionStatus;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageLimits {
  cards: number | 'unlimited';
  folders: number | 'unlimited';
  projectAreas: number | 'unlimited';
}
```

#### 2.2 Update Subscription Store
**File**: `lib/store/subscriptionStore.ts` *(Already exists - needs enhancement)*

Add:
- Current usage tracking (cards, folders, projects)
- Usage percentage calculation
- Limit checking helpers
- Upgrade prompts state

---

### Phase 3: Backend API Routes

#### 3.1 Subscription Management API
**File**: `app/api/subscription/route.ts`

```typescript
// GET - Fetch current subscription
// PUT - Update subscription tier (for testing)
```

#### 3.2 Usage Stats API
**File**: `app/api/subscription/usage/route.ts`

```typescript
// GET - Fetch current usage counts for cards, folders, projects
```

#### 3.3 LemonSqueezy Webhook Handler
**File**: `app/api/webhooks/lemonsqueezy/route.ts`

```typescript
// POST - Handle subscription_created, subscription_updated, subscription_cancelled
// Verify webhook signature
// Update subscriptions table
```

---

### Phase 4: Enhanced Subscription Store

#### 4.1 Store Extensions
**File**: `lib/store/subscriptionStore.ts`

Add these methods:
- `fetchUsage()` - Get current usage counts
- `canCreate(type)` - Check if user can create item/folder/project
- `getLimits()` - Get limits for current tier
- `getUsagePercentage(type)` - Calculate usage %
- `showUpgradePrompt(feature)` - Trigger upgrade modal

Add these state properties:
- `usage: { cards: number, folders: number, projectAreas: number }`
- `limits: UsageLimits`
- `showUpgradeModal: boolean`
- `upgradeReason: string | null`

---

### Phase 5: UI Components

#### 5.1 Subscription Badge Component
**File**: `components/SubscriptionBadge/SubscriptionBadge.tsx`

- Display current tier (Free, Pro, Lifetime)
- Visual badge with appropriate styling
- Clickable to open subscription management
- Mobile-responsive

#### 5.2 Usage Indicator Component
**File**: `components/UsageIndicator/UsageIndicator.tsx`

- Progress bar showing usage vs limit
- Different colors based on usage (green < 50%, yellow 50-80%, red > 80%)
- Shows count: "45 / 65 Cards"
- Appears in Header or Account menu

#### 5.3 Upgrade Modal Component
**File**: `components/UpgradeModal/UpgradeModal.tsx`

- Beautiful modal with pricing cards
- Highlight the feature that triggered the modal
- "You've reached your limit" messaging
- CTA buttons for each tier
- Links to LemonSqueezy checkout
- Mobile-optimized

#### 5.4 Feature Gate Component
**File**: `components/FeatureGate/FeatureGate.tsx`

```typescript
interface FeatureGateProps {
  feature: 'unlimited_items' | 'nested_projects' | 'ai_extraction' | 'custom_theme';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
```

Wrapper component that shows/hides features based on subscription.

#### 5.5 Pricing Page Component
**File**: `app/pricing/page.tsx`

- Beautiful pricing cards (Free, Pro Monthly, Pro Annual, Lifetime)
- Feature comparison table
- FAQ section
- Mobile-responsive
- Smooth animations

---

### Phase 6: Feature Gating Integration

#### 6.1 Gate Item Creation
**Location**: `components/AddButton/AddButton.tsx`, `components/Inbox/Inbox.tsx`

Before creating:
```typescript
const canCreate = subscriptionStore.canCreate('card');
if (!canCreate) {
  subscriptionStore.showUpgradePrompt('unlimited_items');
  return;
}
```

#### 6.2 Gate Folder Creation
**Location**: `components/FolderModal/FolderModal.tsx`

Before creating:
```typescript
const canCreate = subscriptionStore.canCreate('folder');
if (!canCreate) {
  subscriptionStore.showUpgradePrompt('unlimited_folders');
  return;
}
```

#### 6.3 Gate Project Area Creation
**Location**: `components/ProjectArea/ProjectArea.tsx`

Before creating:
```typescript
const canCreate = subscriptionStore.canCreate('project');
if (!canCreate) {
  subscriptionStore.showUpgradePrompt('nested_projects');
  return;
}
```

#### 6.4 Visual Indicators on Limits
- Show "X / 65" counter in Header
- Dim or disable "Add" buttons when limit reached
- Show upgrade badge near Add buttons

---

### Phase 7: Account Settings Integration

#### 7.1 Subscription Management Page
**File**: `app/account/subscription/page.tsx`

Features:
- Current plan overview
- Usage statistics with progress bars
- Billing history (from LemonSqueezy)
- Cancel/Upgrade options
- Download invoices
- Manage payment method

#### 7.2 Update Account Menu
**File**: `components/AccountMenu/AccountMenu.tsx`

Add:
- Subscription badge showing current tier
- Quick link to subscription management
- Usage summary (optional)

---

### Phase 8: LemonSqueezy Integration

#### 8.1 Environment Variables
**File**: `.env.local`

Add:
```
LEMONSQUEEZY_API_KEY=your_api_key
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID=xxxx
NEXT_PUBLIC_LEMONSQUEEZY_ANNUAL_VARIANT_ID=xxxx
NEXT_PUBLIC_LEMONSQUEEZY_LIFETIME_VARIANT_ID=xxxx
```

#### 8.2 LemonSqueezy Client Utility
**File**: `lib/lemonsqueezy/client.ts`

Methods:
- `createCheckoutURL(variantId, userId, email)`
- `getSubscription(subscriptionId)`
- `cancelSubscription(subscriptionId)`
- `getInvoices(customerId)`

#### 8.3 Checkout Flow
When user clicks "Upgrade to Pro":
1. Call API to create checkout session
2. Redirect to LemonSqueezy checkout
3. LemonSqueezy redirects back to success URL
4. Webhook updates subscription in DB
5. App refreshes subscription state

---

### Phase 9: UI/UX Enhancements

#### 9.1 Header Updates
**File**: `components/Header/Header.tsx`

Add:
- Subscription badge (desktop)
- Usage indicator (optional, can be in dropdown)
- "Upgrade" button for free users

#### 9.2 Mobile Header Updates
**File**: `components/Mobile/MobileHeader.tsx`

Add:
- Subscription badge in account menu
- Usage summary in account dropdown

#### 9.3 Limit Warning Toasts
When approaching limits (80%+):
- Show friendly toast: "You're using 52 of 65 cards. Upgrade for unlimited!"
- Use your existing toast/notification system

#### 9.4 Empty State Updates
Update empty states to mention plan benefits:
- "Create your first card (65 available on Free plan)"

#### 9.5 Onboarding Flow Updates
**File**: `components/LoadingScreen/LoadingScreen.tsx` (if used for onboarding)

- Show subscription options after signup
- Offer trial or discount for new users
- Highlight Pro benefits

---

### Phase 10: Testing & Validation

#### 10.1 Testing Checklist

**Free Tier Testing:**
- [ ] Create 65 cards → 66th should fail with error
- [ ] Create 4 folders → 5th should fail with error
- [ ] Create 2 project areas → 3rd should fail with error
- [ ] Verify error messages are user-friendly
- [ ] Test upgrade modal appears on limit hit
- [ ] Verify archived items don't count toward limits

**Pro Tier Testing:**
- [ ] Upgrade to Pro (test mode)
- [ ] Create 100+ cards → should succeed
- [ ] Create 10+ folders → should succeed
- [ ] Create 5+ project areas → should succeed
- [ ] Verify "Unlimited" shown in UI

**Subscription Flow Testing:**
- [ ] Test checkout flow (LemonSqueezy sandbox)
- [ ] Test webhook receives subscription_created
- [ ] Verify DB updates on subscription change
- [ ] Test cancellation flow
- [ ] Test reactivation flow
- [ ] Test expired subscription handling

**UI/UX Testing:**
- [ ] Test all modals on mobile
- [ ] Test pricing page responsiveness
- [ ] Test RTL support (if applicable)
- [ ] Test dark/light mode for all subscription UI
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

---

### Phase 11: Error Handling & Edge Cases

#### 11.1 Graceful Degradation
- [ ] Handle Supabase errors gracefully
- [ ] Handle LemonSqueezy API failures
- [ ] Show retry options for failed payments
- [ ] Handle webhook duplicates (idempotency)

#### 11.2 Edge Cases
- [ ] User downgrading from Pro → Free (what happens to excess items?)
- [ ] Subscription expiring while user is active
- [ ] Payment failures and grace periods
- [ ] Webhook delays (eventual consistency)
- [ ] User deleting items to get under limit

**Recommended Approach for Downgrade:**
- Mark excess items as "locked" or "read-only"
- User must delete/archive to get under limit
- Show warning before downgrade

---

### Phase 12: Analytics & Monitoring

#### 12.1 Track Subscription Events
**Integration**: PostHog, Mixpanel, or similar

Events to track:
- `subscription_upgrade_started`
- `subscription_upgrade_completed`
- `subscription_cancelled`
- `limit_reached` (with item type)
- `upgrade_modal_viewed`
- `upgrade_modal_dismissed`
- `pricing_page_viewed`

#### 12.2 Usage Analytics
- Track average usage per tier
- Track conversion rate (free → pro)
- Track churn rate
- Track most common upgrade triggers

---

### Phase 13: Documentation

#### 13.1 User Documentation
**File**: `docs/subscription-guide.md`

- How to upgrade
- How to manage subscription
- How to cancel
- How to view invoices
- FAQ

#### 13.2 Developer Documentation
**File**: `docs/subscription-architecture.md`

- How subscription system works
- Database schema
- API routes
- Webhook handling
- Testing guide

---

## 🚀 Rollout Strategy

### Pre-Launch
1. Deploy subscription SQL to production Supabase
2. Set up LemonSqueezy store and products
3. Test with test users
4. Prepare marketing materials

### Soft Launch
1. Enable for new users only
2. Monitor webhook reliability
3. Collect feedback
4. Fix critical issues

### Full Launch
1. Announce to existing users
2. Offer migration discount
3. Monitor metrics
4. Iterate based on feedback

---

## 📋 Implementation Checklist

### Database ✅
- [ ] Execute SQL script in Supabase
- [ ] Verify triggers working
- [ ] Test limits enforcement
- [ ] Backfill existing users

### Backend
- [ ] Create API routes
- [ ] Set up webhook handler
- [ ] Create LemonSqueezy client
- [ ] Add environment variables

### Store & State
- [ ] Enhance subscription store
- [ ] Add usage tracking
- [ ] Add limit checking
- [ ] Add upgrade prompts

### UI Components
- [ ] Create SubscriptionBadge
- [ ] Create UsageIndicator
- [ ] Create UpgradeModal
- [ ] Create FeatureGate
- [ ] Create Pricing page
- [ ] Create Subscription management page

### Integration
- [ ] Gate item creation
- [ ] Gate folder creation
- [ ] Gate project area creation
- [ ] Update Header
- [ ] Update Mobile UI
- [ ] Update Account menu
- [ ] Add usage indicators

### Payment
- [ ] Set up LemonSqueezy store
- [ ] Create products/variants
- [ ] Configure webhooks
- [ ] Test checkout flow
- [ ] Test cancellation flow

### Testing
- [ ] Test free tier limits
- [ ] Test pro tier unlimited
- [ ] Test upgrade flow
- [ ] Test downgrade flow
- [ ] Test UI on all devices
- [ ] Test webhooks

### Polish
- [ ] Error messages
- [ ] Loading states
- [ ] Empty states
- [ ] Animations
- [ ] Accessibility
- [ ] RTL support

### Documentation
- [ ] User guide
- [ ] Developer docs
- [ ] API documentation
- [ ] Webhook documentation

### Launch
- [ ] Deploy to production
- [ ] Monitor errors
- [ ] Track analytics
- [ ] Collect feedback
- [ ] Iterate

---

## 🎨 UI/UX Considerations

### Design Principles
1. **Non-intrusive**: Don't annoy free users
2. **Clear value**: Show benefits of upgrading
3. **Transparent**: Clear pricing, no hidden fees
4. **Helpful**: Guide users when hitting limits
5. **Beautiful**: Premium feel for upgrade modals

### Color Coding
- **Free Tier**: Neutral gray or blue
- **Pro Tier**: Premium purple or gold gradient
- **Lifetime Tier**: Special badge (e.g., rainbow or platinum)

### Micro-interactions
- Smooth transitions for badge reveals
- Progress bar animations
- Celebration animation on upgrade
- Subtle pulse on upgrade buttons

---

## 🔒 Security Considerations

1. **RLS Policies**: Users can only see their own subscription
2. **Webhook Verification**: Always verify LemonSqueezy signature
3. **Server-side Validation**: Don't trust client-side limits
4. **Idempotency**: Handle duplicate webhooks
5. **Rate Limiting**: Prevent abuse of API routes

---

## 💡 Future Enhancements

- Team/Organization plans
- Usage-based billing
- Custom enterprise plans
- Annual billing discounts
- Referral program
- Student discounts
- Non-profit pricing

---

## 📞 Support & Issues

### Common Issues
1. **Webhook not received**: Check LemonSqueezy webhook logs
2. **Limits not enforcing**: Verify triggers are active
3. **Free tier can create unlimited**: Check subscription query
4. **Upgrade not reflecting**: Check webhook handler logs

### Testing URLs
- **Checkout (Sandbox)**: Use LemonSqueezy test mode
- **Webhook Testing**: Use LemonSqueezy webhook tester
- **Local Testing**: Use ngrok to expose webhook endpoint

---

## Summary

This plan covers:
- ✅ Database setup with SQL triggers
- ✅ TypeScript types and interfaces
- ✅ Backend API routes
- ✅ Subscription state management
- ✅ UI components for subscription management
- ✅ Feature gating integration
- ✅ LemonSqueezy payment integration
- ✅ Testing strategy
- ✅ Error handling
- ✅ Analytics tracking
- ✅ Documentation

**Estimated Timeline**: 2-3 weeks for complete implementation
**Priority Order**: Database → Store → Feature Gates → UI → Payment → Polish
