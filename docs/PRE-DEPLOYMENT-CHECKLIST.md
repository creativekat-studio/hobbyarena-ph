  # Hobby Arena — Pre-Deployment Checklist

Use this before pointing production traffic at the live site.  
**Legend:** `[x]` = done · `[ ]` = still to do · `[~]` = partially done / verify before launch

**Project:** `hobby-arena-store` · **Staging:** https://hobbyarena.vercel.app

---

## 1. Firebase & database

| Status | Item | Notes |
|:------:|------|-------|
| [x] | Firebase project created (`hobby-arena-store`) | |
| [x] | Web app registered; `VITE_FIREBASE_*` in `.env.local` | |
| [x] | Firestore enabled (asia-southeast1) | |
| [x] | Firebase Storage enabled | |
| [x] | Blaze (pay-as-you-go) plan active | Required for Storage / scale |
| [x] | Authentication: Email/Password + Google | |
| [x] | `VITE_ADMIN_EMAILS` set locally | `website.hobbyarena@gmail.com` |
| [x] | `VITE_DATA_SOURCE=firebase` locally | |
| [x] | Firestore wired: products, CMS, design, classifications | |
| [x] | Firestore wired: customers (from sign-ins) | |
| [x] | Firestore wired: orders (checkout + admin) | |
| [x] | Mock seed data removed (orders, customers) | |
| [x] | Firebase CLI in project (`yarn firebase`) | |
| [x] | `.firebaserc` linked to `hobby-arena-store` | |
| [~] | Firestore + Storage rules deployed | Redeploy after latest rules changes: `yarn firebase:deploy:rules` |
| [ ] | Firebase **Authorized domains** include production URL | Add `hobbyarena.vercel.app` and `hobbyarena.ph` in Console → Auth → Settings |
| [ ] | Admin Dashboard → **Test Firestore connection** passes on production | After Vercel env is set |
| [ ] | `VITE_FIREBASE_*` added to **Vercel** environment variables | All client vars from `.env.example` |
| [ ] | `VITE_ADMIN_EMAILS` on Vercel | Same as local |
| [ ] | `VITE_DATA_SOURCE=firebase` on Vercel | |
| [ ] | Firebase custom claim `admin: true` (optional hardening) | Currently using `VITE_ADMIN_EMAILS` |

**Still on localStorage (OK for launch unless you need them in DB):**

| Status | Item |
|:------:|------|
| [ ] | Inquiries → Firestore |
| [ ] | Cart / wishlist → Firestore |
| [ ] | Payment proof images → Firebase Storage |

---

## 2. Email (Resend)

| Status | Item | Notes |
|:------:|------|-------|
| [x] | Resend account + API key in `.env.local` | |
| [x] | `RESEND_FROM_EMAIL` = `onboarding@resend.dev` (local test) | Test mode only |
| [x] | `ADMIN_NOTIFICATION_EMAIL` set | |
| [x] | Order acknowledgement API (`/api/order-acknowledgement`) | Admin + customer |
| [x] | Order status email API (`/api/order-status-email`) | |
| [x] | Inquiry notification API | |
| [~] | **Test order with emails** end-to-end | Use Resend account email as customer until domain verified |
| [ ] | Domain `hobbyarena.ph` verified in Resend | Blocked: Wix DNS — move DNS to Vercel first |
| [ ] | `RESEND_FROM_EMAIL` → `orders@hobbyarena.ph` (or similar) | After domain verify |
| [ ] | `RESEND_API_KEY` on **Vercel** (server env, not `VITE_`) | |
| [ ] | `RESEND_FROM_EMAIL` on Vercel | |
| [ ] | `ADMIN_NOTIFICATION_EMAIL` on Vercel | |
| [ ] | `PUBLIC_SITE_URL` on Vercel | e.g. `https://hobbyarena.ph` — logo/images in emails |

**Resend test-mode reminder:** With `onboarding@resend.dev`, only the Resend account email receives customer mail. Real customers need a verified domain.

---

## 3. Domain & DNS

| Status | Item | Notes |
|:------:|------|-------|
| [x] | App deployed on Vercel (`hobbyarena.vercel.app`) | |
| [ ] | Add `hobbyarena.ph` + `www` in Vercel → Domains | |
| [ ] | Point Wix nameservers → Vercel DNS | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| [ ] | Resend DNS records (MX, SPF, DKIM) in Vercel DNS | After nameserver switch |
| [ ] | Confirm old Wix site/email MX not broken | If you use `@hobbyarena.ph` mail today, migrate MX first |
| [ ] | SSL / HTTPS on custom domain | Auto via Vercel after DNS |

---

## 4. Auth & admin

| Status | Item | Notes |
|:------:|------|-------|
| [x] | Admin login via Firebase (`/admin/login`) | |
| [x] | Admin session separate from storefront session | Per-tab intent |
| [x] | Customer sign-up: email + Google (`/account`) | |
| [x] | Customers table populates from real sign-ins | Admin → Customers |
| [ ] | Create admin password in Firebase Console (if not using Google only) | Authentication → Users |
| [ ] | Test admin login on **production** URL | |
| [ ] | Test customer Google sign-in on production | |
| [ ] | `localhost` removed from production-only concerns | Dev-only |

---

## 5. Orders & checkout (verify before launch)

| Status | Item | Notes |
|:------:|------|-------|
| [x] | Orders persist to Firestore `orders/{id}` | |
| [x] | Admin → Orders list (no mock data) | |
| [ ] | Place **in-stock** test order → appears in Admin + Firestore | |
| [ ] | Place **pre-order** test order → deposit / balance correct | |
| [ ] | Payment proof upload works | |
| [ ] | Admin notification email received | |
| [ ] | Customer confirmation email received | Requires verified domain OR test email |
| [ ] | Status-change emails (preorder workflow) | Update order in admin, check inbox |
| [ ] | Stock decrements on in-stock checkout | |
| [ ] | Net revenue KPI on dashboard matches expectations | |

---

## 6. Storefront content

| Status | Item | Notes |
|:------:|------|-------|
| [x] | Products / inventory editable in Admin → Inventory | Firestore sync |
| [x] | CMS content editable in Admin → CMS | |
| [x] | Design theme in Admin → Design | |
| [x] | Classifications in Admin → Catalog | |
| [ ] | Real product images (not placeholders) | URLs or Storage later |
| [ ] | Bank details / QR codes correct in CMS | |
| [ ] | Contact info, social links, hours correct | |
| [ ] | Homepage banners & featured products reviewed | |
| [ ] | Pre-order countdown dates accurate | |

---

## 7. Build & deploy

| Status | Item | Command / location |
|:------:|------|-------------------|
| [x] | Local dev runs (`yarn dev:full`) | |
| [x] | Production build passes (`yarn build`) | |
| [ ] | `yarn firebase:deploy:rules` with latest rules | |
| [ ] | Push to main / trigger Vercel deploy | |
| [ ] | Vercel build succeeds (no env errors) | |
| [ ] | Smoke test on production URL | Home, shop, checkout, admin |
| [ ] | Mobile check (phone browser) | |
| [ ] | `.env.local` **not** committed | In `.gitignore` |

---

## 8. Security & housekeeping

| Status | Item |
|:------:|------|
| [x] | Firestore rules: public read for catalog/CMS; admin write | |
| [x] | Firestore rules: orders create open (guest checkout); admin update | |
| [ ] | Review `firestore.rules` admin email hardcode vs custom claims | `website.hobbyarena@gmail.com` in rules today |
| [ ] | Rotate any exposed API keys if accidentally committed | |
| [ ] | Resend domain + SPF/DKIM for deliverability | Reduces spam folder |
| [ ] | Backup/export Firestore before major launch edits | Firebase Console → Export |

---

## 9. Launch-day order (suggested)

Do these in sequence when ready to go live:

1. [ ] Move DNS nameservers Wix → Vercel  
2. [ ] Add domain in Vercel; wait for SSL  
3. [ ] Verify domain in Resend; add DNS records in Vercel  
4. [ ] Set all Vercel env vars (Firebase + Resend + `PUBLIC_SITE_URL`)  
5. [ ] `yarn firebase:deploy:rules`  
6. [ ] Redeploy Vercel  
7. [ ] Add production domains to Firebase Authorized domains  
8. [ ] Run Section 5 order tests on production  
9. [ ] Share URL with client for UAT (`docs/UAT-CHECKLIST.md`)

---

## Quick reference — Vercel env vars to copy

**Client (VITE_):**

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAILS
VITE_DATA_SOURCE=firebase
```

**Server (API routes only):**

```
RESEND_API_KEY
RESEND_FROM_EMAIL
ADMIN_NOTIFICATION_EMAIL
PUBLIC_SITE_URL
```

---

*Last updated: June 2026 — update checkboxes as you complete each item.*
