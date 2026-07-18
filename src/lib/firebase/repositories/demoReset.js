import {
  collection,
  getDocs,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";

const BATCH_LIMIT = 400;
const LOCAL_ORDERS_KEY = "hobbyarena:orders";

/**
 * In-stock qty still committed on an order (never decremented for Pre-order;
 * skip lines already released via Unpaid / stockReleased).
 */
export function collectRestockDeltas(orders) {
  const deltas = new Map();
  for (const order of orders || []) {
    const items = Array.isArray(order.lineItems) ? order.lineItems : [];
    for (const item of items) {
      if (!item?.id) continue;
      if (item.tag === "Pre-order" || item.type === "Pre-order") continue;
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

/**
 * Restock committed in-stock qty from orders, then delete orders and stock
 * holds. Does NOT touch customers, products (beyond stock increments), cms,
 * catalog/classifications, design, or email template storage.
 */
export async function resetDemoOrdersAndCustomers() {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");

  const [ordersSnap, holdsSnap, productsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.orders)),
    getDocs(collection(db, COLLECTIONS.stockHolds)),
    getDocs(collection(db, COLLECTIONS.products)),
  ]);

  const orders = ordersSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const deltas = collectRestockDeltas(orders);
  const productRefs = new Map(productsSnap.docs.map((entry) => [entry.id, entry.ref]));

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
    ordersSnap.docs.forEach((entry) => enqueue(entry.ref, null));
  });

  await commitInChunks(db, (enqueue) => {
    holdsSnap.docs.forEach((entry) => enqueue(entry.ref, null));
  });

  try {
    window.localStorage?.removeItem(LOCAL_ORDERS_KEY);
    window.localStorage?.removeItem("hobbyarena:orders-v");
  } catch {
    // ignore storage failures
  }

  return {
    ordersDeleted: ordersSnap.size,
    holdsDeleted: holdsSnap.size,
    productsRestocked,
    unitsRestocked,
  };
}
