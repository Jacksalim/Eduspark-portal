---
name: Routing & auth state
description: App uses useState routing (no React Router) because Supabase onAuthStateChange handles PASSWORD_RECOVERY and SIGNED_IN events
---

## Rule
Do NOT add React Router. All navigation is done via `view` state in App.jsx with `setView()`.

**Why:** Supabase auth events (PASSWORD_RECOVERY, SIGNED_IN) are caught in useAuth.jsx via onAuthStateChange. React Router would intercept hash URLs and break the password reset and email confirmation flows.

**How to apply:** Landing.jsx takes `onGetStarted` and `onSignIn` props. AuthPage.jsx uses internal `mode` state (signin/signup/forgot). App.jsx manages the top-level view.

## Section IDs used by Nav scroll links
home, features, about, contact — these IDs must exist on Landing.jsx sections.
