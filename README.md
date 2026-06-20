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
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

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

## Next steps (when wiring Firebase)

1. `npm install firebase`; create `src/lib/firebase.js` with your config.
2. Replace the mock internals in `AuthProvider.jsx` with Firebase Auth calls; read `role` from `getIdTokenResult()` custom claims.
3. Set the `admin` custom claim via the Admin SDK (Cloud Function) for staff accounts.
4. Move products/inventory/orders into Firestore; replace `data/*.js` reads with queries.
5. Add Firestore/Storage Security Rules enforcing the `admin` claim for all writes.
```
