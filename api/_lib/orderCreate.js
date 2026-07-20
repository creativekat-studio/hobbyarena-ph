import { randomBytes } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { DEFAULT_DEPOSIT_PERCENT } from "./preorderPricing.js";

const SEQ_WIDTH = 6;
const MAX_PROOF_CHARS = 3_500_000;

export function parseOrderId(id) {
  const raw = String(id ?? "");
  const body = raw.match(/^HA-(\d{10,12})$/);
  if (!body) return null;
  const digits = body[1];

  if (digits.length === 12) {
    const day = Number(digits.slice(6, 8));
    if (day >= 1 && day <= 31) {
      return { stamp: digits.slice(0, 8), seq: Number(digits.slice(8)), monthKey: digits.slice(0, 6) };
    }
    return { stamp: digits.slice(0, 6), seq: Number(digits.slice(6)), monthKey: digits.slice(0, 6) };
  }

  if (digits.length === 10) {
    return { stamp: digits.slice(0, 6), seq: Number(digits.slice(6)), monthKey: digits.slice(0, 6) };
  }
  return null;
}

export function incrementOrderId(id) {
  const parsed = parseOrderId(id);
  if (!parsed) return String(id);
  const stamp = parsed.monthKey || parsed.stamp.slice(0, 6);
  return `HA-${stamp}${String(parsed.seq + 1).padStart(SEQ_WIDTH, "0")}`;
}

export async function allocateOrderId(db, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const monthKey = `${y}${m}`;
  const start = `HA-${monthKey}`;
  const end = `HA-${monthKey}\uf8ff`;

  const snap = await db.collection("orders")
    .orderBy(FieldPath.documentId())
    .startAt(start)
    .endAt(end)
    .get();

  let maxSeq = 0;
  for (const doc of snap.docs) {
    const parsed = parseOrderId(doc.id);
    if (!parsed || parsed.monthKey !== monthKey) continue;
    if (parsed.seq > maxSeq) maxSeq = parsed.seq;
  }

  return `HA-${monthKey}${String(maxSeq + 1).padStart(SEQ_WIDTH, "0")}`;
}

function isPreorderProduct(product) {
  return product?.tag === "Pre-order" || product?.type === "Pre-order";
}

function getDepositPercent(product) {
  if (!isPreorderProduct(product)) return 0;
  const value = Number(product.depositPercent);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DEPOSIT_PERCENT;
  return Math.min(99, Math.max(1, Math.round(value)));
}

function calcPreorderPricing(fullPrice, depositPercent = DEFAULT_DEPOSIT_PERCENT) {
  const percent = Math.min(99, Math.max(1, Math.round(depositPercent)));
  const deposit = Math.round((fullPrice * percent) / 100);
  const balance = Math.max(0, fullPrice - deposit);
  return { deposit, balance, depositPercent: percent };
}

function preorderDueNow(product, quantity = 1) {
  if (!isPreorderProduct(product)) return (Number(product?.price) || 0) * quantity;
  const { deposit } = calcPreorderPricing(Number(product.price) || 0, getDepositPercent(product));
  return deposit * quantity;
}

function preorderBalanceDue(product, quantity = 1) {
  if (!isPreorderProduct(product)) return 0;
  const { balance } = calcPreorderPricing(Number(product.price) || 0, getDepositPercent(product));
  return balance * quantity;
}

/** Storefront shipping is currently always 0 (courier paid by buyer). */
export function serverShippingFee() {
  return 0;
}

/**
 * Load products and build priced line items from trusted catalog data.
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {Array<{ id: string, quantity: number }>} lines
 */
export async function buildPricedLines(db, lines) {
  if (!Array.isArray(lines) || !lines.length) {
    throw Object.assign(new Error("Add at least one product."), { status: 400 });
  }
  if (lines.length > 40) {
    throw Object.assign(new Error("Too many line items."), { status: 400 });
  }

  const lineItems = [];
  let dueNow = 0;
  let fullSubtotal = 0;
  let balanceDue = 0;
  let depositPercent = DEFAULT_DEPOSIT_PERCENT;
  let hasPreorder = false;
  let hasStock = false;

  for (const line of lines) {
    const id = String(line?.id || "").trim();
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(line?.quantity) || 1)));
    if (!id) {
      throw Object.assign(new Error("Each cart line needs a product id."), { status: 400 });
    }

    const snap = await db.collection("products").doc(id).get();
    if (!snap.exists) {
      throw Object.assign(new Error(`Product “${id}” is no longer available.`), { status: 400 });
    }
    const product = { id: snap.id, ...snap.data() };
    if (product.active === false) {
      throw Object.assign(new Error(`${product.name || id} is not available.`), { status: 400 });
    }

    const price = Math.max(0, Number(product.price) || 0);
    const cost = Math.max(0, Number(product.cost) || 0);
    const tag = isPreorderProduct(product) ? "Pre-order" : (product.tag || product.type || "In-stock");
    const isPreorder = tag === "Pre-order";
    if (isPreorder) {
      hasPreorder = true;
      depositPercent = getDepositPercent(product);
    } else {
      hasStock = true;
    }

    const lineTotal = price * quantity;
    const depositPaid = isPreorder ? preorderDueNow(product, quantity) : lineTotal;
    const balanceDueLine = isPreorder ? preorderBalanceDue(product, quantity) : 0;

    dueNow += depositPaid;
    fullSubtotal += lineTotal;
    balanceDue += balanceDueLine;

    lineItems.push({
      id: product.id,
      name: String(product.name || id).trim(),
      quantity,
      price,
      cost,
      lineTotal,
      tag,
      line: product.line || null,
      image: product.image || null,
      payment: "Pending Verification",
      status: "Pending Verification",
      allocatedQty: 0,
      depositPaid,
      balanceDue: balanceDueLine,
      creditAmount: 0,
    });
  }

  let type = "In-stock";
  if (hasPreorder && hasStock) type = "Mixed";
  else if (hasPreorder) type = "Pre-order";

  const shippingFee = serverShippingFee();
  const itemsLabel = lineItems
    .map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name))
    .join(", ");

  return {
    lineItems,
    type,
    items: itemsLabel,
    qty: lineItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: dueNow,
    shippingFee,
    total: dueNow + shippingFee,
    fullSubtotal,
    balanceDue,
    depositPercent,
  };
}

export function buildTrailForCreate({ lineItems, proofUrl, manual, notes }) {
  return lineItems.map((item, index) => ({
    id: `trail-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    title: manual ? "Order created by admin" : "Order purchased",
    status: "Pending Verification",
    payment: "Pending Verification",
    lineItemId: item.id,
    lineItemName: item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
    note: manual
      ? (String(notes || "").trim() || "Manually entered by staff.")
      : "Customer placed order and uploaded proof of payment.",
    ...(proofUrl
      ? {
          attachment: index === 0
            ? {
                url: proofUrl,
                storageUrl: proofUrl,
                label: "Proof of payment",
                type: String(proofUrl).includes("application/pdf") || /\.pdf(\?|$)/i.test(proofUrl)
                  ? "pdf"
                  : "image",
                kind: "deposit",
                stored: true,
              }
            : {
                label: "Proof of payment",
                type: "image",
                stored: true,
                kind: "deposit",
              },
        }
      : {}),
  }));
}

export function parseProofDataUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (!value.startsWith("data:")) {
    throw Object.assign(new Error("Invalid payment proof."), { status: 400 });
  }
  if (value.length > MAX_PROOF_CHARS) {
    throw Object.assign(
      new Error("Payment proof is too large. Please upload a smaller image or PDF."),
      { status: 413 },
    );
  }
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(value);
  if (!match) {
    throw Object.assign(new Error("Invalid payment proof encoding."), { status: 400 });
  }
  const contentType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
  if (!allowed.has(contentType)) {
    throw Object.assign(new Error("Payment proof must be an image or PDF."), { status: 400 });
  }
  return { contentType, buffer: Buffer.from(match[2], "base64") };
}

export async function uploadProofWithAdmin(bucket, orderId, proof) {
  if (!bucket || !proof) return null;
  const ext = proof.contentType === "application/pdf"
    ? "pdf"
    : proof.contentType.split("/")[1] || "jpg";
  const path = `order-proofs/${orderId}/${Date.now()}-deposit.${ext}`;
  const token = randomBytes(16).toString("hex");
  const file = bucket.file(path);
  await file.save(proof.buffer, {
    contentType: proof.contentType,
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
