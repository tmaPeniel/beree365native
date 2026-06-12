---
name: index
description: Top-level project memory index
type: reference
---

# Project Memory

## Core
- **UX**: Silent UI preference (no routine toasts). Mobile-first iOS-style interactions. Non-interactive "Today" dashboard display.
- **Auth**: Auto-logout disabled (stay logged in). Splash screen bypassed for auth tokens. Explicit recovery token processing for password reset.
- **Data**: Reading passages strictly ordered by `sort_order` extracted from verse ref. Reading plans prioritize local assets (`src/assets/planImages.ts`).
- **Global**: No global cookie banner. "Sagesse du jour" synced globally by calendar date.
- **Notifications**: Push notification system fully removed (OneSignal + VAPID). Repartir de zéro avant toute reconstruction.

## Memories
- [Badge Notifications](mem://features/gamification-badge-notifications) — In-app unlock popup with celebration animations (no push)
- [Reading Plan Ordering](mem://features/reading-plan-ordering) — Sort order rule for reading plan passages
- [Reading Plan Visuals](mem://features/reading-plan-visuals) — Mapping local high-quality images to reading plans
- [Reading Plan Redesign](mem://ui/reading-plan-management-redesign) — 2-column album photo grid for plan management
- [Plan Expandable UI](mem://ui/reading-plan-management-expandable-structure) — Expandable architecture for plan management grid
- [Start Date Mod](mem://features/reading-plan-start-date-modification) — Feature to modify reading plan start date via calendar
- [Plan Passages Display](mem://features/reading-plan-display) — Display total passage count instead of estimated months
- [Optimistic Updates](mem://ux/optimistic-reading-updates-focus-view) — Optimistic UI for reading passage checkboxes in Focus View
- [Reading View Modes](mem://features/reading-view-modes-mobile) — Mobile Focus View vs Grid View
- [Reading Hero Height](mem://style/reading-page-focus-view-hero-card-height) — Focus view hero card minimum height 200px
- [Verse Likes Arch](mem://features/verse-likes-hybrid-approach) — Hybrid real-time join and static count for verse likes
- [Universal Verse](mem://features/universal-daily-verse) — Sagesse du jour synchronized globally by calendar day
- [Verse of Day Design](mem://features/verse-of-day-responsive-design) — Mobile sunset gradient vs Desktop card
- [Dashboard Layout](mem://style/dashboard-mobile-layout) — Mobile layout prioritizing Verse of Day above Reading Plan
- [Dashboard Dates](mem://features/dashboard-dynamic-dates) — Dynamic dates and header titles based on active plan
- [Dashboard Today UI](mem://style/dashboard-today-display) — Clean, text-only component for current day
- [Profile Layout](mem://style/profile-header-layout) — Vertically centered user profile header
- [Stats Visuals](mem://features/statistics-page-visuals) — Circular progress and multi-period activity charts
- [UI Cleanups](mem://ui/verse-list-and-profile-layout) — Verse list like counts and profile edit button placement
- [Auth Auto-logout](mem://ux/auto-logout-removal) — Auto-logout removed, users stay logged in indefinitely
- [Splash Bypass](mem://ux/splash-screen-auth-bypass) — Splash screen bypass for auth URLs
- [Password Reset](mem://auth/password-reset-flow) — Explicit processing for password reset recovery hash
- [Silent UI](mem://ux/silent-ui-preference) — Silent UX preference, no toasts for routine actions
- [PWA Notifications](mem://ux/pwa-update-notification-removal) — Removal of PWA update toasts
- [Onboarding Flow](mem://features/onboarding-flow) — 3-slide swipable onboarding for new users
- [GDPR Profile](mem://legal/compliance-gdpr-cgu) — CGU, GDPR profile, and data export
- [Account Deletion](mem://auth/account-deletion-flow) — Secure account deletion via edge function
- [Consent Tracking](mem://legal/consent-tracking-system-v2) — User consent management without global cookie banner
- [Mobile Specs](mem://project/mobile-app-specifications) — Reference for mobile app specifications in /docs
- [Freemium System](mem://features/freemium-system) — Gratuit/Premium gating, is_premium_active flag, admin-only attribution, silent expiration
