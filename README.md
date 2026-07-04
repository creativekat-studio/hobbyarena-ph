# Hobby Arena

A modern, gaming-style web app for **Hobby Arena Marketing Corporation** — a premium TCG store (sealed Pokémon & One Piece, pre-orders, "the thrill of the pull"). Modeled on the live site [hobbyarena.ph](https://www.hobbyarena.ph/).

This is a **frontend-only mock** — there is no backend yet. Auth and data are mocked but structured so **Firebase** can be wired in later with minimal changes.

## Two separate areas

The app is split into a customer-facing site and a staff-only admin portal, each with its own account/login:

### Customer site (public)
- `/` — **Home**: hero, Sealed Products, Pre-Order Products, perks, testimonials, newsletter, footer
- `/account` — **Customer account**: sign in / registration, then a dashboard (store credit, loyalty points, orders, wishlist)

### Admin portal (role-gated)
- `/admin/login` — **separate admin sign-in** (requires the `admin` role)
- `/admin` — **Dashboard** with graphs (revenue trend, sales by line, channel split, top products, recent orders)
- `/admin/inventory` — **Inventory**: stock-control table with stats, filters, search, stock-status badges
- `/admin/cms` — **CMS**: manage products (publish/draft), homepage hero, and the announcement bar

Customers and admins are **different accounts**. The admin portal is not linked from the customer nav.

## Security model (Firebase-ready)

> ⚠️ Client-side route guards are **UX only**. Real authorization must be enforced server-side.

- `src/auth/AuthProvider.jsx` is a mock shaped like Firebase Auth (`user = { uid, email, displayName, role }`). Swap the internals for `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` / `onAuthStateChanged`.
- **Roles** (`customer` / `admin`) should come from a **Firebase custom claim** set by a trusted backend / Cloud Function — never trusted from the client.
- `src/auth/ProtectedRoute.jsx` gates the admin routes by role and redirects unauthorized users.
- When wiring Firebase, also add **Firestore / Storage Security Rules** that check `request.auth.token.admin` for all admin writes. The client guard alone is not security.

**Demo credentials**
- Customer: any email + password signs you in as a customer.
- Admin: `admin@hobbyarena.ph` / `admin1234` (shown on the admin login page).

## Stack

- React 18 + Vite
- React Router (`react-router-dom`)
- MUI (Material UI) v7 — custom light/dark "gaming" theme (light is default)
- Recharts for dashboard graphs
- No backend — mock data only

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (Vite picks a free port, e.g. `http://localhost:5174`).

## Scripts

```bash
npm run dev       # storefront at http://localhost:5173 (fastest for UI work)
npm run dev:full  # Vite + /api on http://localhost:3000 (for testing Resend emails)
npm run build     # production build to dist/
npm run preview   # preview the production build
```

**Local dev tip:** If `dev:full` shows a blank page, stop it (Ctrl+C), restart once, and open the exact URL printed in the terminal (usually `http://localhost:3000`). The catch-all SPA rewrite no longer blocks Vite assets in dev.

**Alternative for emails:** Run two terminals — `yarn dev:full` for API, then `yarn dev` for the UI. Emails will send via the proxy to port 3000.

## Email (Resend)

Transactional email is wired for:

- **Order acknowledgement** — customer + admin notification after checkout
- **Contact inquiries** — admin notification + customer auto-reply

### 1. Local env

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to put it |
|----------|-----------------|
| `RESEND_API_KEY` | `.env.local` locally · Vercel → Project → Settings → Environment Variables |
| `RESEND_FROM_EMAIL` | Use `Hobby Arena <onboarding@resend.dev>` until your domain is verified in Resend |
| `ADMIN_NOTIFICATION_EMAIL` | Where new orders/inquiries should alert you (e.g. `hello@hobbyarena.ph`) |

**Never commit `.env.local` or paste your API key in chat.**

### 2. Resend dashboard

1. [resend.com](https://resend.com) → **API Keys** → create key → paste into `RESEND_API_KEY`
2. For production sending from `@hobbyarena.ph`, add and verify your domain under **Domains**
3. Until verified, test with `onboarding@resend.dev` as the from address (Resend only delivers to your account email in test mode)

### 3. Test locally

```bash
npm run dev:full
```

Place a test order or submit the contact form. Check Resend → **Logs** for delivery status.

### 4. Deploy to Vercel

Add the same three env vars in the Vercel project settings, then redeploy:

```bash
npx vercel deploy --prod
```

API routes live in `/api` and stay server-side — the Resend key is never exposed to the browser.

## Project structure

```text
src/
├── main.jsx                 # router setup + providers
├── theme.js                # MUI theme (light/dark gaming palette)
├── styles.css              # global styles + fonts
├── lib/
│   ├── colorMode.jsx       # color-mode context + ThemeProvider
│   └── surfaces.js         # shared page background + panel styling
├── auth/
│   ├── AuthProvider.jsx    # mock auth (Firebase-ready), roles
│   └── ProtectedRoute.jsx  # role-based route guard
├── data/
│   ├── mockData.js         # brand, products, inventory, customer account
│   └── analytics.js        # dashboard KPIs + chart data
├── components/             # shared
│   ├── ProductCard.jsx, icons.jsx
├── customer/
│   ├── CustomerLayout.jsx, CustomerNavbar.jsx
│   ├── HomePage.jsx, AccountPage.jsx
└── admin/
    ├── AdminLayout.jsx, AdminLogin.jsx
    ├── DashboardPage.jsx, InventoryPage.jsx, CmsPage.jsx
```

## Next steps (Firebase)

**Setup guide:** [docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md)

1. Create Firebase project + add web app config to `.env.local`
2. Enable Firestore (test mode) + Storage + Email/Password Auth
3. Admin Dashboard → **Test Firestore connection**
4. Deploy `firestore.rules` + `storage.rules` when Auth is wired
5. Migrate stores one by one; set `VITE_DATA_SOURCE=firebase` when ready

Legacy checklist:

1. `firebase` SDK is installed; see `src/lib/firebase.js`
2. Replace mock internals in `AuthProvider.jsx` with Firebase Auth; read `role` from `getIdTokenResult()` custom claims
3. Set the `admin` custom claim via Admin SDK for staff accounts
4. Move products/inventory/orders into Firestore; replace `data/*.js` reads with queries
