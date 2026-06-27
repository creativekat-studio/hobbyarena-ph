# Hobby Arena — Client UAT Checklist

**Purpose:** Review the current design and functionality before launch. Mark each item and add notes where changes are needed.

**How to use this document**

1. Open the preview/staging site in your browser (desktop + phone if possible).
2. For each row, mark **one** status: **Approved**, **Changes needed**, or **N/A**.
3. In **Client notes**, describe the change you want (color hex, copy, layout, image, etc.).
4. To use as a spreadsheet: select a table → copy → paste into Google Sheets or Excel. Columns will align automatically.

---

## Review summary (fill in first)

| Field | Your answer |
| --- | --- |
| Reviewer name | |
| Date | |
| Site URL reviewed | |
| Preferred design direction | ☐ Proposal 1 — Neon Arena &nbsp; ☐ Proposal 2 — Official Brand &nbsp; ☐ Other: |
| Preferred color mode | ☐ Light &nbsp; ☐ Dark &nbsp; ☐ Both (user toggle) |
| Overall verdict | ☐ Approved as-is &nbsp; ☐ Approved with minor changes &nbsp; ☐ Major revisions needed |
| Priority deadline for feedback | |
| Additional comments | |

---

## Legend

| Status | Meaning |
| --- | --- |
| **Approved** | Looks correct — no change needed |
| **Changes needed** | Something should be updated (describe in Client notes) |
| **N/A** | Not applicable or not reviewed |

---

## 1. Brand & visual identity

### 1.1 Colors

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| C-01 | Primary brand color (buttons, links, highlights) | | | | |
| C-02 | Secondary / accent colors (Pokémon vs One Piece accents) | | | | |
| C-03 | Background colors (page + card/panel surfaces) | | | | |
| C-04 | Text colors (headings vs body vs muted/secondary) | | | | |
| C-05 | Success / warning / error badge colors | | | | |
| C-06 | Hero gradient & glow effects | | | | |
| C-07 | Announcement bar colors | | | | |
| C-08 | Chart colors (admin dashboard) | | | | |
| C-09 | Light mode overall look & contrast | | | | |
| C-10 | Dark mode overall look & contrast | | | | |
| C-11 | Color consistency across storefront + admin | | | | |

### 1.2 Typography & logo

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| T-01 | Logo (image vs text logo, size, clarity) | | | | |
| T-02 | Display/heading font (Sora) — size & weight | | | | |
| T-03 | Body font (Inter) — readability | | | | |
| T-04 | Mono/label font (JetBrains Mono) — buttons, tags, stats | | | | |
| T-05 | Heading hierarchy (H1–H6) on homepage | | | | |
| T-06 | Heading hierarchy on shop & product pages | | | | |
| T-07 | Heading hierarchy in admin portal | | | | |
| T-08 | Button text (uppercase labels, letter-spacing) | | | | |
| T-09 | Price formatting (₱ / PHP) | | | | |

### 1.3 Layout & UI chrome

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| L-01 | Overall spacing & padding (not too tight/loose) | | | | |
| L-02 | Card/panel border radius & borders | | | | |
| L-03 | Grid layout on desktop (product cards, sections) | | | | |
| L-04 | Grid layout on mobile | | | | |
| L-05 | Max content width / page margins | | | | |
| L-06 | Icon style & sizing | | | | |
| L-07 | Hover/focus states on buttons & links | | | | |
| L-08 | Loading / empty / error states | | | | |
| L-09 | Animations (marquees, hero, confetti) — not distracting | | | | |

### 1.4 Design proposal selection

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| D-01 | **Proposal 1 — Neon Arena** (purple/cyan gaming look) | | | | |
| D-02 | **Proposal 2 — Official Brand** (navy/gold, logo-based) | | | | |
| D-03 | Final choice of which proposal to ship | | | | |
| D-04 | Light/dark toggle behavior & default mode | | | | |

---

## 2. Global navigation & header

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| N-01 | Top navbar / dock navigation visibility & stickiness | | | | |
| N-02 | Brand logo click → home | | | | |
| N-03 | Shop mega-menu / category groups (Pokémon, One Piece, etc.) | | | | |
| N-04 | Pre-orders link in navigation | | | | |
| N-05 | Search entry point (if visible) | | | | |
| N-06 | Cart icon + item count badge | | | | |
| N-07 | Account / sign-in link | | | | |
| N-08 | Light/dark mode toggle (storefront) | | | | |
| N-09 | Mobile hamburger menu & drawer | | | | |
| N-10 | Mobile menu links & touch targets | | | | |

---

## 3. Storefront — Homepage (`/`)

### 3.1 Top of page

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| H-01 | Announcement bar — messages, colors, scrolling | | | | |
| H-02 | Banner marquee (promo banners) | | | | |
| H-03 | Hero — tagline / headline / subtitle copy | | | | |
| H-04 | Hero — primary CTA button text & destination | | | | |
| H-05 | Hero — secondary CTA (“View pre-orders”) | | | | |
| H-06 | Hero — featured product showcase / live drop card | | | | |
| H-07 | Hero — stats row (numbers & labels) | | | | |

### 3.2 Product sections

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| H-08 | Featured in-stock products — section title & copy | | | | |
| H-09 | Featured in-stock products — product cards shown | | | | |
| H-10 | Featured pre-orders — section title & copy | | | | |
| H-11 | Featured pre-orders — product cards shown | | | | |
| H-12 | “Shop all →” links go to correct shop filters | | | | |
| H-13 | Product card — image, name, line, price, badges | | | | |
| H-14 | Product card — pre-order vs in-stock labeling | | | | |
| H-15 | Product card — click opens product detail page | | | | |

### 3.3 Trust & engagement sections

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| H-16 | “Why Hobby Arena” / perks section — titles & descriptions | | | | |
| H-17 | Perks icons & layout (4 columns desktop) | | | | |
| H-18 | Customer testimonials / reviews section | | | | |
| H-19 | Testimonial quotes, names, ratings | | | | |
| H-20 | Newsletter signup — copy, field, submit button | | | | |
| H-21 | Contact / inquiry form — fields & submit | | | | |
| H-22 | Payment methods marquee (GCash, Maya, BDO, BPI, etc.) | | | | |

### 3.4 Footer

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| H-23 | Legal business name & blurb | | | | |
| H-24 | Social links (Instagram, Facebook, TikTok) | | | | |
| H-25 | Shop footer links (categories / lines) | | | | |
| H-26 | Contact info — address, phone, email, hours | | | | |
| H-27 | Copyright line & tagline | | | | |

---

## 4. Storefront — Shop (`/shop`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| S-01 | Page header — overline, title, subtitle per category | | | | |
| S-02 | Category chips (All, In-Stock, Pre-Orders, Accessories) | | | | |
| S-03 | TCG line filters (Pokémon, One Piece, Gundam) | | | | |
| S-04 | Sort control (price, name, etc.) | | | | |
| S-05 | Product grid — columns on desktop & mobile | | | | |
| S-06 | Empty state when no products match filters | | | | |
| S-07 | URL filters work when shared (e.g. `?category=preorder`) | | | | |
| S-08 | Shop sub-navigation / filters sidebar (if shown) | | | | |

---

## 5. Storefront — Product detail (`/shop/:productId`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| P-01 | Breadcrumbs (Shop → category → product) | | | | |
| P-02 | Product image display & fallback icon | | | | |
| P-03 | Product name, line, category label | | | | |
| P-04 | Price display (₱ format) | | | | |
| P-05 | Star rating display | | | | |
| P-06 | Stock / pre-order status messaging | | | | |
| P-07 | “Add to cart” button | | | | |
| P-08 | Wishlist (heart) button — signed-in only | | | | |
| P-09 | Product description sections (title, intro, bullets) | | | | |
| P-10 | Previous / next product navigation | | | | |

---

## 6. Storefront — Cart

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Cart drawer opens from navbar | | | | |
| CR-02 | Line items — image, name, price, quantity | | | | |
| CR-03 | Increase / decrease quantity | | | | |
| CR-04 | Remove item | | | | |
| CR-05 | Subtotal calculation | | | | |
| CR-06 | “Checkout” button & empty cart state | | | | |

---

## 7. Storefront — Checkout (`/checkout`)

### 7.1 Flow & steps

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CK-01 | Stepper labels (Account → Details → Payment) | | | | |
| CK-02 | **Step 1 — Account:** sign in option | | | | |
| CK-03 | **Step 1 — Account:** continue as guest | | | | |
| CK-04 | **Step 2 — Details:** shipping address fields | | | | |
| CK-05 | **Step 2 — Details:** fulfillment options (delivery, LBC, pickup, etc.) | | | | |
| CK-06 | **Step 2 — Details:** shipping fee calculation | | | | |
| CK-07 | **Step 2 — Details:** shipping disclaimer copy | | | | |
| CK-08 | **Step 2 — Details:** store pickup info copy | | | | |
| CK-09 | **Step 2 — Details:** processing hours copy | | | | |
| CK-10 | Order summary sidebar (items, subtotal, shipping, total) | | | | |

### 7.2 Payment

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CK-11 | Bank transfer options (BDO, BPI, UnionBank, etc.) | | | | |
| CK-12 | E-wallet options (GCash, Maya) | | | | |
| CK-13 | QR code images — correct & scannable | | | | |
| CK-14 | QR zoom / enlarge on click | | | | |
| CK-15 | Account name & account numbers accuracy | | | | |
| CK-16 | “Use order ID as reference” note | | | | |
| CK-17 | Upload proof of payment | | | | |
| CK-18 | Confirm transfer checkbox | | | | |
| CK-19 | Place order button & validation messages | | | | |
| CK-20 | Order confirmation screen & confetti | | | | |
| CK-21 | Empty cart redirect when cart is empty | | | | |

---

## 8. Storefront — Customer account (`/account`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| A-01 | Sign-in form — email, password, error messages | | | | |
| A-02 | Registration form — name, terms checkbox | | | | |
| A-03 | Marketing opt-in checkbox copy | | | | |
| A-04 | Toggle between sign-in & create account | | | | |
| A-05 | Dashboard — welcome / avatar area | | | | |
| A-06 | Store credit balance display | | | | |
| A-07 | Loyalty points display | | | | |
| A-08 | Orders tab — table columns & status badges | | | | |
| A-09 | Wishlist tab — products & add-to-cart | | | | |
| A-10 | Sign out | | | | |

---

## 9. Admin portal — Login & shell

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| AD-01 | Admin login page — branding & layout | | | | |
| AD-02 | Admin login — email/password form | | | | |
| AD-03 | Unauthorized redirect (non-admin users) | | | | |
| AD-04 | Sidebar navigation — labels & icons | | | | |
| AD-05 | Sidebar active state highlighting | | | | |
| AD-06 | Order & inquiry notification badges | | | | |
| AD-07 | Top bar — admin user chip / sign out | | | | |
| AD-08 | Light/dark mode toggle (admin) | | | | |
| AD-09 | Mobile admin layout (drawer sidebar) | | | | |

---

## 10. Admin — Dashboard (`/admin`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| DB-01 | KPI cards (revenue, orders, customers, etc.) | | | | |
| DB-02 | KPI delta indicators (% vs last month) | | | | |
| DB-03 | Revenue trend chart | | | | |
| DB-04 | Sales by product line chart | | | | |
| DB-05 | Channel split pie chart | | | | |
| DB-06 | Top products chart / list | | | | |
| DB-07 | Recent orders table | | | | |
| DB-08 | “View all orders” navigation | | | | |
| DB-09 | Chart colors match brand | | | | |

---

## 11. Admin — Orders (`/admin/orders`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| OR-01 | Summary stat cards | | | | |
| OR-02 | Filter chips (All, In-stock, Pre-order, Awaiting payment) | | | | |
| OR-03 | Search by order ID / customer | | | | |
| OR-04 | Orders table — columns & sorting | | | | |
| OR-05 | Status badges (Processing, Paid, Shipped, etc.) | | | | |
| OR-06 | Payment status badges | | | | |
| OR-07 | Order detail dialog — customer & items | | | | |
| OR-08 | Order detail — update status dropdown | | | | |
| OR-09 | Order detail — update payment status | | | | |
| OR-10 | Order detail — proof of payment image | | | | |
| OR-11 | New order notification / unseen indicator | | | | |

---

## 12. Admin — Customers (`/admin/customers`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CU-01 | Customer list / table layout | | | | |
| CU-02 | Search customers | | | | |
| CU-03 | Customer details (email, orders, credit, points) | | | | |
| CU-04 | Status or segment labels (if shown) | | | | |

---

## 13. Admin — Inquiries (`/admin/inquiries`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| IN-01 | Inquiry list from homepage contact form | | | | |
| IN-02 | Unread / new inquiry badge count | | | | |
| IN-03 | Mark as read / handled | | | | |
| IN-04 | Inquiry detail — name, email, message | | | | |

---

## 14. Admin — Inventory (`/admin/inventory`)

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| IV-01 | Inventory stat cards (total SKUs, published, low stock) | | | | |
| IV-02 | Filter chips (All, Published, Draft, Pokémon, One Piece, etc.) | | | | |
| IV-03 | Search products | | | | |
| IV-04 | Table view — columns (name, line, stock, price, status) | | | | |
| IV-05 | Grid view toggle | | | | |
| IV-06 | Stock status badges (In stock, Low, Out of stock) | | | | |
| IV-07 | Publish / unpublish toggle | | | | |
| IV-08 | Inline edit (stock, price, reorder level) | | | | |
| IV-09 | Add product dialog — fields & validation | | | | |
| IV-10 | Product thumbnail images in inventory | | | | |

---

## 15. Admin — CMS (`/admin/cms`)

### 15.1 Homepage tab

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CM-01 | Hero — tagline, headline, subtitle, CTA fields | | | | |
| CM-02 | Homepage sections — products & pre-orders titles/copy | | | | |
| CM-03 | Feature drops — add / edit / remove | | | | |
| CM-04 | Live preview of hero (if shown) | | | | |
| CM-05 | “Reset to defaults” behavior understood | | | | |

### 15.2 Other CMS tabs

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CM-06 | **Banners** — promo banner images & links | | | | |
| CM-07 | **Announcements** — ticker messages & colors | | | | |
| CM-08 | **Reviews** — testimonial quotes, authors, enable/disable | | | | |
| CM-09 | **Bank details** — account info shown at checkout | | | | |
| CM-10 | **Social & Contact** — Instagram, Facebook, TikTok URLs | | | | |
| CM-11 | **Social & Contact** — address, phone, email, hours | | | | |
| CM-12 | CMS edits reflect on storefront after save | | | | |

---

## 16. Content accuracy

| ID | Item to review | Approved ☐ | Changes ☐ | N/A ☐ | Client notes |
| --- | --- | --- | --- | --- | --- |
| CT-01 | Business legal name | | | | |
| CT-02 | Tagline / hero messaging | | | | |
| CT-03 | Product names & descriptions | | | | |
| CT-04 | Prices (match intended retail) | | | | |
| CT-05 | Shipping rates (Metro Manila, provincial, free threshold) | | | | |
| CT-06 | Bank account names & numbers | | | | |
| CT-07 | E-wallet QR codes | | | | |
| CT-08 | Store address & business hours | | | | |
| CT-09 | Phone number & email | | | | |
| CT-10 | Social media URLs | | | | |
| CT-11 | Payment method logos / labels | | | | |
| CT-12 | TCG line names (Pokémon, One Piece, Gundam, etc.) | | | | |

---

## 17. Responsive & device testing

| Device | Homepage ☐ | Shop ☐ | Product ☐ | Checkout ☐ | Account ☐ | Admin ☐ | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop (1920px+) | | | | | | | |
| Laptop (1280–1440px) | | | | | | | |
| Tablet (768px) | | | | | | | |
| Mobile (375–430px) | | | | | | | |

---

## 18. Browser testing (optional)

| Browser | Version | Pass ☐ | Issues ☐ | Notes |
| --- | --- | --- | --- | --- |
| Chrome | | | | |
| Safari | | | | |
| Firefox | | | | |
| Edge | | | | |
| Mobile Safari (iOS) | | | | |
| Chrome (Android) | | | | |

---

## 19. Open issues log

Use this section for items that need discussion or don’t fit a single row above.

| # | Page / area | Issue description | Priority ☐ High ☐ Med ☐ Low | Suggested fix / reference | Status ☐ Open ☐ Done |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

---

## 20. Sign-off

| Role | Name | Signature / initials | Date |
| --- | --- | --- | --- |
| Client reviewer | | | |
| Project owner | | | |
| Developer | | | |

**Final client comment (optional):**

> 

---

*Document version: 1.0 · Hobby Arena UAT · Generated for design & functionality review*
