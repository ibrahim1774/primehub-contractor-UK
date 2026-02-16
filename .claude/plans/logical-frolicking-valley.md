# Fix: Post-Deploy Signup, Publish Without Re-Paying, One-Step Signup

## Context
Three issues after the dashboard implementation:
1. After a site deploys, unauthenticated users see no prompt to create an account — so the site isn't linked to any account
2. After paying once and deploying, clicking "Edit Website" from the dashboard still shows the payment flow (deploy bar) instead of the publish toolbar, because deployment status isn't persisted to IndexedDB
3. Supabase email confirmation is enabled, requiring users to check email before they can sign in — user wants instant signup → login

---

## Root Causes

### Issue 1: No signup prompt after deployment
- The success overlay (`App.tsx:572-601`) shows "Go to Dashboard" (if authenticated) or "Close" (if not)
- No AuthModal trigger exists for unauthenticated users after deployment

### Issue 2: Forced to re-pay
- `hasPaid` (`App.tsx:49`) checks `activeSite?.deploymentStatus === 'deployed'`
- After payment + deploy, `activeSite` is updated in React state (line 156), and Supabase is updated (line 154)
- **BUT IndexedDB is never updated** with the deployment fields — so on page refresh (before auth), the site loads from IndexedDB without `deploymentStatus`
- Also, `migrateLocalToSupabase()` in `siteService.ts:109-128` doesn't include `deployed_url` or `deployment_status` — so migrating a deployed site to Supabase loses the deployment info

### Issue 3: Email confirmation required
- Supabase project setting "Confirm email" is enabled (Supabase Dashboard setting, not code)
- `AuthModal.tsx:41` shows "Check your email to confirm your account" on signup
- Signup doesn't auto-close the modal or auto-login

---

## Changes

### 1. `App.tsx` — Show signup prompt in success overlay + persist deployment to IndexedDB

**Success overlay changes (unauthenticated users):**
- After "View Live Site" button, show a prominent "Create Account" section
- Text: "Create a free account to manage your site, make edits, and republish anytime"
- Button: "Create Account" — opens AuthModal in 'signup' mode
- Add `defaultAuthMode` state to control whether AuthModal opens in 'signin' or 'signup' mode

**Persist deployment to IndexedDB after deploy:**
- After line 156 (payment success deploy), also call `saveSiteInstance()` with the updated site (including `deployedUrl` and `deploymentStatus`)
- Same fix in `handlePublish()` after line 301

**Auto-migrate site after signup:**
- Add a `useEffect` that watches for `isAuthenticated` changing from false to true
- When it becomes true and there's an `activeSite` with `deploymentStatus === 'deployed'`, auto-migrate it to the new user's Supabase account (using `migrateLocalToSupabase`)
- Then navigate to dashboard

### 2. `services/siteService.ts` — Include deployment fields in migration

Update `migrateLocalToSupabase()` to include deployment fields:
```typescript
const { error } = await supabase.from('sites').upsert({
  id: site.id,
  user_id: userId,
  // ...existing fields...
  deployed_url: site.deployedUrl || null,           // NEW
  deployment_status: site.deploymentStatus || 'draft', // NEW
  site_data: site.data,
});
```

### 3. `components/AuthModal.tsx` — One-step signup (no email confirmation)

**Code changes:**
- Accept a `defaultMode` prop (optional, default 'signin') so the caller can open it in signup mode
- On successful signup: close the modal immediately (same as signin), remove the "Check your email" message
- When Supabase email confirmation is disabled, `signUp()` returns a session immediately, so `onAuthStateChange` fires and the user is logged in

**Props change:**
```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';  // NEW
}
```

### 4. Supabase Dashboard — Disable email confirmation (manual step)

User must go to: **Supabase Dashboard → Authentication → Providers → Email → turn OFF "Confirm email"**

This is a project setting, not a code change. Without this, signups will still require email verification regardless of code changes.

---

## Files touched

| File | Action |
|------|--------|
| `App.tsx` | Edit — signup prompt in success overlay, persist deploy to IndexedDB, auto-migrate on auth |
| `components/AuthModal.tsx` | Edit — add `defaultMode` prop, auto-close on signup success |
| `services/siteService.ts` | Edit — include deployment fields in `migrateLocalToSupabase` |

---

## Verification
1. `npm run build` passes
2. Generate site → pay → deploy → success overlay shows "Create Account" prompt for unauthenticated users
3. Click "Create Account" → AuthModal opens in signup mode → signup → modal closes → site migrated to account → dashboard shown
4. Sign out → sign back in → dashboard shows → "Edit Website" → post-payment toolbar shown (not payment flow)
5. Click "Publish" → site redeploys without payment
6. Signup works without email confirmation (requires Supabase setting change)
