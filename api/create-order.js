import { getAdminFirestore, getAdminStorageBucket, isFirebaseAdminConfigured } from "./_lib/firebaseAdmin.js";
import { isValidEmail } from "./_lib/emailConfig.js";
import { loadLocalEnv } from "./_lib/loadLocalEnv.js";
import {
  allocateOrderId,
  buildPricedLines,
  buildTrailForCreate,
  commitInStockForLines,
  incrementOrderId,
  parseProofDataUrl,
  restockInStockForLines,
  uploadProofWithAdmin,
} from "./_lib/orderCreate.js";
import { isGuestCaptchaEnabled } from "./_lib/cmsSettings.js";
import { checkOrderRateLimit, recordOrderRateLimit } from "./_lib/orderRateLimit.js";
import { requireAdmin } from "./_lib/requireAdmin.js";
import { verifyRecaptchaToken } from "./_lib/verifyRecaptcha.js";
function readAddress(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    street: String(raw.street || "").trim().slice(0, 200),
    city: String(raw.city || "").trim().slice(0, 120),
    province: String(raw.province || "").trim().slice(0, 120),
    postal: String(raw.postal || "").trim().slice(0, 20),
  };
}

function syncRollup(lineItems) {
  const payments = lineItems.map((item) => item.payment);
  const statuses = lineItems.map((item) => item.status);
  const uniquePayments = [...new Set(payments)];
  const uniqueStatuses = [...new Set(statuses)];
  return {
    payment: uniquePayments.length === 1 ? uniquePayments[0] : "Mixed",
    status: uniqueStatuses.length === 1 ? uniqueStatuses[0] : "Mixed",
    qty: lineItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    allocatedQty: 0,
    balanceDue: lineItems.reduce((sum, item) => sum + (item.balanceDue ?? 0), 0),
    creditAmount: 0,
  };
}

export default async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({
      error: "Order service isn’t configured. Set FIREBASE_SERVICE_ACCOUNT_JSON and try again.",
    });
  }

  const db = getAdminFirestore();
  const bucket = getAdminStorageBucket();
  if (!db) {
    return res.status(503).json({ error: "Order service unavailable." });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const manual = Boolean(body.manual);
    let admin = null;

    if (manual) {
      admin = await requireAdmin(req, res);
      if (!admin) return undefined;
    }

    const email = String(body.email || "").trim().toLowerCase();
    const customer = String(body.customer || "").trim().slice(0, 120);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const notes = String(body.notes || "").trim().slice(0, 2000);
    const guest = manual ? false : Boolean(body.guest);
    const userId = guest || manual ? null : (body.userId ? String(body.userId).slice(0, 128) : null);
    const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
    const address = fulfillment === "pickup" ? null : readAddress(body.address);
    const cartLines = Array.isArray(body.cartItems)
      ? body.cartItems.map((item) => ({
        id: item?.id,
        quantity: item?.quantity,
        ...(manual ? { discountPercent: item?.discountPercent } : {}),
      }))
      : [];

    if (!customer || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid customer name and email are required." });
    }

    if (!manual) {
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required." });
      }
      if (fulfillment === "delivery" && (!address?.street || !address?.city)) {
        return res.status(400).json({ error: "Delivery address is required." });
      }
      if (!body.proofOfPayment) {
        return res.status(400).json({ error: "Please upload proof of payment." });
      }
    }

    // Guests must pass reCAPTCHA when enabled in CMS Site mode; members/manual skip.
    if (!manual && guest && await isGuestCaptchaEnabled(db)) {
      const captcha = await verifyRecaptchaToken(body.recaptchaToken);
      if (!captcha.ok) {
        return res.status(400).json({ error: captcha.error });
      }
    }

    if (!manual) {
      const limited = await checkOrderRateLimit(db, req, email);
      if (!limited.ok) {
        return res.status(limited.status || 429).json({ error: limited.error });
      }
    }

    const priced = await buildPricedLines(db, cartLines, {
      // Admin manual orders may include drafted / closed pre-order SKUs on purpose.
      enforceStorefrontAvailability: !manual,
      // Manual orders accept per-item discount %; storefront never does.
      allowLineDiscount: manual,
    });
    const initialPayment = manual && body.initialPayment
      ? String(body.initialPayment).slice(0, 80)
      : "Pending Verification";
    const initialStatus = manual && body.initialStatus
      ? String(body.initialStatus).slice(0, 80)
      : "Pending Verification";

    const lineItems = priced.lineItems.map((item) => ({
      ...item,
      payment: initialPayment,
      status: initialStatus,
    }));

    // Storefront always commits remaining units on place — they stay off the shelf
    // for Pending Verification and later success statuses; Unpaid/Rejected restocks.
    // Manual admin orders honor the deductStock checkbox. Unlimited pre-orders skip.
    const shouldDeductStock = manual ? Boolean(body.deductStock) : true;

    let proofUrl = null;
    const proof = manual ? null : parseProofDataUrl(body.proofOfPayment);
    if (!manual && !proof) {
      return res.status(400).json({ error: "Please upload proof of payment." });
    }

    let orderId = await allocateOrderId(db);
    let saved = null;
    let stockCommit = { committed: [] };

    if (shouldDeductStock) {
      stockCommit = await commitInStockForLines(db, lineItems);
    }

    try {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (proof && bucket) {
          proofUrl = await uploadProofWithAdmin(bucket, orderId, proof);
        } else if (proof && !bucket) {
          throw Object.assign(new Error("Could not store payment proof right now."), { status: 503 });
        }

        const trail = buildTrailForCreate({
          lineItems,
          proofUrl,
          manual,
          notes,
        }).map((entry) => ({
          ...entry,
          payment: initialPayment,
          status: initialStatus,
        }));

        const rollup = syncRollup(lineItems);
        const nowIso = new Date().toISOString();
        const order = {
          id: orderId,
          customer,
          email,
          phone,
          type: priced.type,
          items: priced.items,
          lineItems,
          qty: priced.qty,
          subtotal: priced.subtotal,
          shippingFee: priced.shippingFee,
          total: priced.total,
          fullSubtotal: priced.fullSubtotal,
          discount: priced.discount || 0,
          balanceDue: priced.balanceDue,
          depositPercent: priced.depositPercent,
          allocatedQty: 0,
          refundAmount: 0,
          creditAmount: 0,
          payment: rollup.payment,
          status: rollup.status,
          fulfillment,
          region: null,
          address,
          notes,
          hasProof: Boolean(proofUrl),
          guest,
          userId,
          date: nowIso.slice(0, 10),
          createdAt: nowIso,
          notificationSeen: false,
          manual,
          trail,
          createdVia: "api/create-order",
          stockCommitted: Boolean(stockCommit.committed?.length),
          ...(admin ? { createdByAdmin: admin.email } : {}),
        };

        try {
          await db.collection("orders").doc(orderId).create({
            ...order,
            updatedAt: nowIso,
          });
          saved = order;
          break;
        } catch (error) {
          const code = String(error?.code || "");
          const already = code === 6 || code === "already-exists" || /ALREADY_EXISTS/i.test(String(error?.message || ""));
          if (!already || attempt === 29) throw error;
          orderId = incrementOrderId(orderId);
          proofUrl = null;
        }
      }

      if (!saved) {
        throw Object.assign(new Error("Could not allocate a unique order ID."), { status: 500 });
      }
    } catch (error) {
      if (stockCommit.committed?.length) {
        await restockInStockForLines(db, stockCommit.committed).catch((restockError) => {
          console.error("create-order stock rollback failed:", restockError);
        });
      }
      throw error;
    }

    if (!manual) {
      await recordOrderRateLimit(db, req, email).catch((error) => {
        console.warn("create-order rate limit record failed:", error);
      });
    }

    return res.status(200).json({ ok: true, order: saved });
  } catch (error) {
    console.error("create-order:", error);
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      error: error?.message || "Could not create order.",
    });
  }
}
