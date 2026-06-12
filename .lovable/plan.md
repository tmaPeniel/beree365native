## Problem

`send-test-push` returns `{ sent: 0 }` even though your user has 2 valid push subscriptions in `push_subscriptions` (both created today, after the VAPID keys were set).

Root cause: the shared helper `supabase/functions/_shared/webpush.ts` uses the `npm:web-push` library. That library relies on Node.js `crypto` APIs (Buffer, asymmetric key import via PEM, `createECDH`) that are not fully supported in Supabase Edge Runtime (Deno). It silently fails for every subscription, returning `ok: false, gone: false`, so the counter stays at 0. Boot/shutdown logs show no thrown error because we catch it and return a generic `error` string per subscription that's never logged.

## Fix

Replace the web-push wrapper with a **Deno-native Web Push implementation** built on the standard Web Crypto API. No external npm runtime crypto required, works reliably in Edge Functions.

### What changes

1. **Rewrite `supabase/functions/_shared/webpush.ts`** to implement VAPID + Web Push encryption from scratch using `crypto.subtle`:
   - Parse the stored VAPID private key (base64url) into a P-256 `CryptoKey`.
   - Generate the VAPID JWT (ES256) for the push service origin, signed with the private key.
   - Implement RFC 8291 payload encryption (aes128gcm content-encoding): ECDH with the subscription's `p256dh`, HKDF-derive CEK + nonce using the `auth` secret, AES-GCM encrypt the payload, prepend the binary header (salt + rs + idlen + appServerPublicKey).
   - POST to `sub.endpoint` with headers `Authorization: vapid t=<jwt>, k=<publicKey>`, `Content-Encoding: aes128gcm`, `Content-Type: application/octet-stream`, `TTL: 86400`, `Urgency: normal`.
   - Return `{ ok, gone, status, error }`. `gone` true on 404/410 so callers prune stale rows (already wired).

2. **Add brief logging in `send-test-push`** to surface per-subscription failures while debugging: log status + error returned by `sendPush`. Helps confirm the fix and catch any subscription-specific issues (e.g., a stale endpoint).

3. **No DB / no client / no secrets changes.** VAPID keys, `push_subscriptions` table, service worker, registration flow, and the `usePushNotifications` hook are all correct and stay as-is. The existing 2 subscriptions for your account will start receiving notifications immediately after redeploy.

### Files touched

- `supabase/functions/_shared/webpush.ts` — rewrite (still exports `sendPush(sub, payload)` with the same signature, so callers in `send-test-push`, `send-daily-verse`, `send-reading-reminders`, `send-badge-notification` keep working unchanged).
- `supabase/functions/send-test-push/index.ts` — add `console.log` of failures + include `sent`, `failed`, `errors[]` in the response so the UI / debugging shows what went wrong if it ever does again.

### Verification

After redeploy, click **Tester** in Profil → Notifications. Expected: browser shows the "Bérée 365 — Tes notifications sont bien activées" toast on the device, response shows `{ sent: 2 }` (or 1 if only this device is currently subscribed). The Edge Function logs will also confirm.

### Technical notes (for the curious)

- We are not adding any npm dependency. Pure Web Crypto + a tiny base64url helper.
- VAPID JWT `aud` is the origin of the endpoint (`https://fcm.googleapis.com` for Chrome, `https://updates.push.services.mozilla.com` for Firefox, `https://*.notify.windows.com` for Edge).
- `aes128gcm` is the modern content-encoding supported by all current push services; we don't need the older `aesgcm` fallback.
