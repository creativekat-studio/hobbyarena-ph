# Hobby Arena — Update Verification Checklist

Use this after pulling the latest changes. Mark **Pass**, **Fail**, or **N/A**, and add notes where needed.

---

## Storefront — Pre-orders (`/preorders`)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| P-01 | Nav shows **Pre-Orders** only (not mixed with products) | ☐ | ☐ | |
| P-02 | Tabs: **All Pre-orders**, **Ongoing Pre-orders**, **Closed** | ☐ | ☐ | |
| P-03 | No Card Accessories tab or products shown | ☐ | ☐ | |
| P-04 | Sidebar filter: **Product line only** (from Admin → Catalog) | ☐ | ☐ | |
| P-05 | **No price filter** | ☐ | ☐ | |
| P-06 | Countdown timer visible on ongoing pre-orders | ☐ | ☐ | |
| P-07 | 30% / 70% deposit pricing shown | ☐ | ☐ | |
| P-08 | Expired pre-orders show **Closed** overlay | ☐ | ☐ | |

---

## Storefront — Products (`/products`)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| PR-01 | Nav shows **Products** only | ☐ | ☐ | |
| PR-02 | Tabs: **All Products** + admin categories (TCG, Accessories, etc.) | ☐ | ☐ | |
| PR-03 | No pre-order items listed | ☐ | ☐ | |
| PR-04 | Sidebar filter: **Product line only** | ☐ | ☐ | |
| PR-05 | **No price filter** | ☐ | ☐ | |
| PR-06 | Out-of-stock products show **Out of Stock** | ☐ | ☐ | |

---

## Product cards & detail

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| PD-01 | Product page loads (no crash with active countdown) | ☐ | ☐ | |
| PD-02 | **− qty +** stepper on product cards | ☐ | ☐ | |
| PD-03 | **− qty +** stepper on product detail page | ☐ | ☐ | |
| PD-04 | Normal products: **Terms & conditions** section below description | ☐ | ☐ | |
| PD-05 | Pre-orders: lengthy T&C + **checkbox** above button | ☐ | ☐ | |
| PD-06 | Pre-order button **not disabled**; alert if checkbox unchecked | ☐ | ☐ | |

---

## Contact & footer

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| C-01 | **Contact page** at `/contact` | ☐ | ☐ | |
| C-02 | Newsletter subscribe moved here (removed from homepage) | ☐ | ☐ | |
| C-03 | Inquiry form moved here (removed from homepage) | ☐ | ☐ | |
| C-04 | Social media links on contact page | ☐ | ☐ | |
| C-05 | Google Maps embed + **Open in Google Maps** link | ☐ | ☐ | |
| C-06 | **Contact footer** visible on all storefront pages (except checkout) | ☐ | ☐ | |

---

## Navigation & search

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| N-01 | Dock bar **no longer shows 01, 02, 03…** numbers | ☐ | ☐ | |
| N-02 | Search icon opens search dialog | ☐ | ☐ | |
| N-03 | Search finds products and opens detail page | ☐ | ☐ | |
| N-04 | `/shop` redirects to `/products` | ☐ | ☐ | |

---

## Checkout

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| CK-01 | Upload button uses **secondary/contained** color (not plain outlined) | ☐ | ☐ | |
| CK-02 | **Required (*)** on proof upload label | ☐ | ☐ | |
| CK-03 | **Required (*)** on transfer confirmation checkbox | ☐ | ☐ | |
| CK-04 | Place order **disabled** until upload + checkbox done | ☐ | ☐ | |
| CK-05 | Pre-order checkout shows deposit amount | ☐ | ☐ | |
| CK-06 | Confirmation mentions acknowledgement email | ☐ | ☐ | |

---

## Customer account (`/account`)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| A-01 | **Store credit hidden** | ☐ | ☐ | |
| A-02 | **Loyalty points hidden** | ☐ | ☐ | |
| A-03 | Orders shown as **cards** (not table) | ☐ | ☐ | |
| A-04 | Order card shows **Type** chip | ☐ | ☐ | |
| A-05 | Line items show **Qty** and **Price** | ☐ | ☐ | |
| A-06 | Status shown as **previous → current** pills (top-right) | ☐ | ☐ | |

---

## Admin — Catalog (`/admin/catalog`)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| AD-01 | Can view/edit **product lines** | ☐ | ☐ | |
| AD-02 | Can add new product line | ☐ | ☐ | |
| AD-03 | Can view/edit **categories** (TCG, Accessories, etc.) | ☐ | ☐ | |
| AD-04 | Can add new category | ☐ | ☐ | |
| AD-05 | Line changes reflect on storefront filters | ☐ | ☐ | |

---

## Admin — Orders (`/admin/orders`)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| O-01 | New order IDs format: **HA-yyyymmdd####** (e.g. HA-202606270001) | ☐ | ☐ | |
| O-02 | Grid shows payment/status as **read-only chips** (no inline dropdowns) | ☐ | ☐ | |
| O-03 | Click row opens **order detail** dialog | ☐ | ☐ | |
| O-04 | Detail dialog: update payment & status | ☐ | ☐ | |
| O-05 | Detail dialog: **order trail** timeline visible | ☐ | ☐ | |
| O-06 | Trail updates when status/payment changed | ☐ | ☐ | |

---

## Admin — Dashboard (`/admin`)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| D-01 | Period filter chips: **1D, 1W, 1M, 3M, 1Y** | ☐ | ☐ | |
| D-02 | Revenue chart updates when period changes | ☐ | ☐ | |

---

## Order flow (end-to-end)

| # | Check | Pass | Fail | Notes |
|---|--------|:----:|:----:|-------|
| F-01 | Place in-stock order → inventory **stock decreases** | ☐ | ☐ | |
| F-02 | Place pre-order → deposit total charged at checkout | ☐ | ☐ | |
| F-03 | Order appears in admin with **Pending Verification** | ☐ | ☐ | |
| F-04 | Customer sees order on account page as card | ☐ | ☐ | |
| F-05 | Admin verifies payment → updates status in detail dialog | ☐ | ☐ | |
| F-06 | Trail shows **Order purchased** entry with timestamp | ☐ | ☐ | |

---

## Known limitations (mock / not yet built)

| Item | Status |
|------|--------|
| Manual add order by admin | Not yet implemented |
| Custom product description editor in inventory | Partial — uses existing description sections |
| Real email sending | Mock acknowledgement stored on order only |
| Dashboard KPIs from live orders | Still uses static analytics seed data |

---

**Reviewer:** ___________________  
**Date:** ___________________  
**Overall:** ☐ Approved &nbsp; ☐ Needs fixes
