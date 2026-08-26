import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { productTracksStock } from "../../quantityLimits.js";
import { getFirestoreDb } from "../app.js";

const BATCH_LIMIT = 400;
const LOCAL_ORDERS_KEY = "hobbyarena:orders";
const LOCAL_CUSTOMERS_KEY = "hobbyarena:customers";

/**
 * Qty still committed on an order (skip lines already released via Unpaid /
 * stockReleased). Unlimited pre-orders are filtered out when applying because
 * they never decrement stock.
 */
export function collectRestockDeltas(orders) {
  const deltas = new Map();
  for (const order of orders || []) {
    const items = Array.isArray(order.lineItems) ? order.lineItems : [];
    for (const item of items) {
      if (!item?.id) continue;
      if (item.stockReleased) continue;
      const qty = Math.max(0, Number(item.quantity) || 0);
      if (!qty) continue;
      deltas.set(item.id, (deltas.get(item.id) || 0) + qty);
    }
  }
  return deltas;
}

async function commitInChunks(db, buildOps) {
  const ops = [];
  buildOps((ref, payload) => {
    ops.push({ ref, payload });
  });

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const slice = ops.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const { ref, payload } of slice) {
      if (payload === null) batch.delete(ref);
      else batch.update(ref, payload);
    }
    await batch.commit();
  }
}

function normalizeIdList(ids) {
  return [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
}

function removeOrdersFromLocalCache(orderIds) {
  const idSet = new Set(normalizeIdList(orderIds));
  if (!idSet.size || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((order) => !idSet.has(String(order?.id || "")));
    window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

function removeCustomersFromLocalCache(customerKeys) {
  const keySet = new Set(
    normalizeIdList(customerKeys).map((key) => key.toLowerCase()),
  );
  if (!keySet.size || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    const next = {};
    for (const [email, profile] of Object.entries(parsed)) {
      const emailKey = String(email || "").trim().toLowerCase();
      const uid = String(profile?.uid || profile?.id || "").trim().toLowerCase();
      if (keySet.has(emailKey) || (uid && keySet.has(uid))) continue;
      next[email] = profile;
    }
    window.localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

/**
 * Delete selected orders and restore committed stock / pre-order slots.
 * Unlimited pre-orders are not restocked. Does not delete customers.
 */
export async function deleteOrdersAndRestock(orderIds) {
  const ids = normalizeIdList(orderIds);
  if (!ids.length) {
    return { ordersDeleted: 0, productsRestocked: 0, unitsRestocked: 0 };
  }

  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");

  const orderSnaps = await Promise.all(
    ids.map((id) => getDoc(doc(db, COLLECTIONS.orders, id))),
  );
  const selected = orderSnaps
    .filter((snap) => snap.exists())
    .map((snap) => ({ id: snap.id, ref: snap.ref, data: snap.data() }));

  if (!selected.length) {
    removeOrdersFromLocalCache(ids);
    return { ordersDeleted: 0, productsRestocked: 0, unitsRestocked: 0 };
  }

  const deltas = collectRestockDeltas(
    selected.map((entry) => ({ id: entry.id, ...entry.data })),
  );
  const productRefs = new Map();
  if (deltas.size) {
    const productSnaps = await Promise.all(
      [...deltas.keys()].map((productId) => getDoc(doc(db, COLLECTIONS.products, productId))),
    );
    productSnaps.forEach((snap) => {
      if (!snap.exists()) return;
      if (!productTracksStock({ id: snap.id, ...snap.data() })) return;
      productRefs.set(snap.id, snap.ref);
    });
  }

  let unitsRestocked = 0;
  let productsRestocked = 0;

  await commitInChunks(db, (enqueue) => {
    for (const [productId, qty] of deltas) {
      const ref = productRefs.get(productId);
      if (!ref || qty <= 0) continue;
      enqueue(ref, {
        stock: increment(qty),
        updatedAt: serverTimestamp(),
      });
      unitsRestocked += qty;
      productsRestocked += 1;
    }
  });

  await commitInChunks(db, (enqueue) => {
    selected.forEach((entry) => enqueue(entry.ref, null));
  });

  removeOrdersFromLocalCache(selected.map((entry) => entry.id));

  return {
    ordersDeleted: selected.length,
    productsRestocked,
    unitsRestocked,
  };
}

/**
 * Delete selected customer profile docs (by Firestore doc id / uid).
 * Does not delete orders — remove those separately so stock can restock.
 */
export async function deleteCustomersByIds(customerIds) {
  const ids = normalizeIdList(customerIds);
  if (!ids.length) return { customersDeleted: 0 };

  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");

  await commitInChunks(db, (enqueue) => {
    ids.forEach((id) => enqueue(doc(db, COLLECTIONS.customers, id), null));
  });

  removeCustomersFromLocalCache(ids);

  return { customersDeleted: ids.length };
}
