# Firebase setup — Hobby Arena

Follow these steps while creating your Firebase project. The app **keeps using localStorage** until you flip `VITE_DATA_SOURCE=firebase` and migrate each store.

## 1. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it e.g. `hobbyarena-ph`
3. Disable Google Analytics (optional for now)

## 2. Register the web app

1. Project overview → **Web** (`</>`)
2. App nickname: `Hobby Arena Storefront`
3. Copy the `firebaseConfig` object values into `.env.local`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Keep local mock data until migration is done
VITE_DATA_SOURCE=local
```

4. Restart dev server: `yarn dev:full`

## 3. Enable Firestore

1. **Build → Firestore Database → Create database**
2. Choose **Start in test mode** (30 days) for initial connection testing
3. Region: `asia-southeast1` (Singapore) — closest to PH

## 4. Enable Storage

1. **Build → Storage → Get started**
2. Start in **test mode** for setup
3. Same region as Firestore

## 5. Enable Authentication

1. **Build → Authentication → Get started**
2. Enable **Email/Password**
3. Enable **Google** (add support email when prompted)
4. **Authentication → Settings → Authorized domains** — ensure `localhost` is listed (for local dev)
5. Add admin emails to `.env.local`:
   ```env
   VITE_ADMIN_EMAILS=website.hobbyarena@gmail.com
   ```
6. (Later) Add `admin` custom claim via Admin SDK for production-grade admin access

## 6. Test Auth + Firestore

1. Open **Admin → Dashboard**
2. Scroll to **Database** card
3. Click **Test Firestore connection**
4. Success = green alert with project id

If you see **permission-denied**, Firestore is enabled but rules block writes — use test mode rules during setup, or deploy rules after Auth is wired.

## 7. Deploy security rules (after Auth is ready)

Install Firebase CLI once:

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # pick your project
```

Deploy rules from this repo:

```bash
firebase deploy --only firestore:rules,storage
```

Rules live in:

- `firestore.rules` — orders, inquiries, products, CMS, customers
- `storage.rules` — payment proofs, product images

## 8. Vercel production env

Add the same `VITE_FIREBASE_*` vars in **Vercel → Settings → Environment Variables**, then redeploy.

## Collections (planned)

| Collection   | Purpose                          |
|-------------|-----------------------------------|
| `orders`    | Customer orders + pre-order flow  |
| `inquiries` | Contact form messages             |
| `customers` | Profiles (name, phone, opt-in)    |
| `products`  | Storefront catalog                |
| `inventory` | Stock, cost, SKU                  |
| `cms`       | Homepage content (singleton)      |
| `catalog`   | Classifications / T&C (singleton) |
| `_meta`     | Health check doc                  |

Schema reference: `src/data/firestoreSchema.js`

## Migration scope (`VITE_DATA_SOURCE=firebase`)

When set to `firebase`, only these areas use Firestore:

| Area | Firestore path | Still local |
|------|----------------|-------------|
| Products / inventory | `products/{id}` | — |
| CMS content | `cms/content` | — |
| Design theme | `cms/design` | — |
| Classifications | `catalog/settings` | — |
| Customers | `customers/{uid}` | — |
| Orders | `orders/{id}` | — |
| Inquiries, cart, wishlist | — | localStorage |

First sync copies any existing localStorage edits into Firestore when a collection is empty.

Deploy rules before editing from admin:

```bash
firebase deploy --only firestore:rules
```

## Migration order (remaining)

1. Inquiries (simple create + admin list)
2. Wishlists

## Emulators (optional local dev)

```bash
firebase init emulators
# Auth 9099, Firestore 8080, Storage 9199
```

Then in `.env.local`:

```env
VITE_FIREBASE_USE_EMULATORS=true
```
