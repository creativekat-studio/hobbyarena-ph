import { loadLocalEnv } from "./_lib/loadLocalEnv.js";
import { getAdminFirestore, getAdminStorageBucket, isFirebaseAdminConfigured } from "./_lib/firebaseAdmin.js";
import {
  COLLECTIONS,
  isOrderPastRetention,
  orderHasStoredProofFiles,
  readRetentionMonths,
  stripPurgedProofsFromOrder,
} from "./_lib/orderProofRetention.js";

loadLocalEnv();

function authorizeCron(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const header = req.headers.authorization || "";
  return header === `Bearer ${secret}`;
}

async function deleteOrderProofFolder(bucket, orderId) {
  const prefix = `order-proofs/${orderId}/`;
  const [files] = await bucket.getFiles({ prefix });
  if (!files.length) return 0;

  await Promise.all(files.map((file) => file.delete().catch(() => null)));
  return files.length;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!authorizeCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({
      error: "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON.",
    });
  }

  const db = getAdminFirestore();
  const bucket = getAdminStorageBucket();
  if (!db || !bucket) {
    return res.status(503).json({ error: "Firebase Admin could not initialize." });
  }

  const retentionMonths = readRetentionMonths();
  const snapshot = await db.collection(COLLECTIONS.orders).get();

  let scanned = 0;
  let eligible = 0;
  let purgedOrders = 0;
  let deletedFiles = 0;
  const errors = [];

  for (const doc of snapshot.docs) {
    scanned += 1;
    const order = { id: doc.id, ...doc.data() };
    if (!orderHasStoredProofFiles(order)) continue;
    if (!isOrderPastRetention(order, retentionMonths)) continue;

    eligible += 1;

    try {
      const removed = await deleteOrderProofFolder(bucket, order.id);
      deletedFiles += removed;

      const patch = stripPurgedProofsFromOrder(order);
      await doc.ref.set(
        {
          ...patch,
          proofsPurgedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      purgedOrders += 1;
    } catch (error) {
      errors.push({ orderId: order.id, message: error?.message || "Cleanup failed." });
    }
  }

  return res.status(200).json({
    ok: true,
    retentionMonths,
    scanned,
    eligible,
    purgedOrders,
    deletedFiles,
    errors,
  });
}
