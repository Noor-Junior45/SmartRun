# SECURITY_AND_HACK_LOG.md (Adversarial Red-Team Checklist)

## Threat 1: Welcome Email Flooding / Spool Exhaustion
- **Attack Vector**: An adversary repeatedly calls `/api/auth/send-welcome-email` or triggers repeated app-launch profile synchronizations to exhaust Resend API quota or send spam emails to existing users.
- **Defense**:
  1. Complete removal of email dispatch from profile synchronization endpoint `/api/user-profile`.
  2. Multi-tier database guard in `/api/auth/send-welcome-email`: queries Supabase `user_profiles` and Firebase Firestore. If an account was created more than 5 minutes ago or is already recorded as welcomed in the cloud database, the request is permanently short-circuited with `alreadySent: true`.
  3. Client-side durable storage flags in Capacitor Preferences and localStorage prevent duplicate triggers.

## Threat 2: Credential & Token Resurfacing from Local Storage / IndexedDB
- **Attack Vector**: An attacker gains access to a shared computer or mobile device after a user clicks "Sign Out". The attacker inspects IndexedDB or cached storage to retrieve stale Supabase/Firebase session tokens and impersonate the user.
- **Defense**:
  1. `purgeAllUserCacheAndStorage()` systematically nukes all `localStorage`, `sessionStorage`, all Cache Storage API containers, all IndexedDB databases via `window.indexedDB.databases()`, cookies, and Capacitor Native Preferences.
  2. Cloud Run server terminates the session via `/api/auth/logout`.
  3. UI state is flushed synchronously with `flushSync` and navigated immediately to `/login`.

## Threat 3: R8 Missing Class Halts & Android Build Vulnerabilities
- **Attack Vector**: Building production release APKs with minification enabled crashes due to missing ProGuard rules in third-party plugins.
- **Defense**:
  1. Added `missing_rules.txt` in `android/app/` and root `android/`.
  2. Configured universal `-dontwarn **` and `-ignorewarnings` in `android/app/proguard-rules.pro`.
