import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { getEmailConfig, isValidEmail } from "./_lib/emailConfig.js";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./_lib/firebaseAdmin.js";
import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  escapeHtml,
  wrapSimpleEmail,
} from "./_lib/emailTemplate.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function marketingDocId(email) {
  return `mkt_${Buffer.from(email).toString("base64url").slice(0, 48)}`;
}

function buildNewsletterWelcomeEmail(email) {
  const subject = "You're on the Hobby Arena list";
  const text = [
    "You're in!",
    "",
    "Thanks for subscribing to Hobby Arena updates. We'll email you about restocks, pre-order windows, and member deals.",
    "",
    `— ${EMAIL_BRAND.name}`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      You're on the list
    </p>
    ${bodyLead(`Thanks for subscribing, <strong>${escapeHtml(email)}</strong>.`)}
    ${bodyText("We'll email you about restocks, pre-order windows, and member deals.")}
  `;

  return {
    subject,
    text,
    html: wrapSimpleEmail({
      preheader: "Thanks for joining the Hobby Arena newsletter.",
      bodyHtml,
      footerNote: "You subscribed via the Hobby Arena storefront.",
    }),
  };
}

async function upsertMarketingOptIn(email) {
  if (!isFirebaseAdminConfigured()) {
    return { ok: false, reason: "Firebase Admin is not configured." };
  }
  const db = getAdminFirestore();
  if (!db) return { ok: false, reason: "Firestore Admin unavailable." };

  const existing = await db.collection("customers").where("email", "==", email).limit(1).get();
  const now = new Date().toISOString().slice(0, 10);

  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    await ref.set(
      {
        email,
        marketingOptIn: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return { ok: true, id: ref.id, created: false };
  }

  const id = marketingDocId(email);
  await db.collection("customers").doc(id).set(
    {
      uid: id,
      email,
      name: email.split("@")[0] || "Subscriber",
      phone: "",
      address: { street: "", city: "", province: "", postal: "" },
      marketingOptIn: true,
      authProvider: "newsletter",
      photoURL: "",
      joined: now,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return { ok: true, id, created: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    const profile = await upsertMarketingOptIn(email);
    if (!profile.ok) {
      return res.status(503).json({ error: profile.reason || "Could not save subscription." });
    }

    const { adminEmail } = getEmailConfig();
    const welcome = buildNewsletterWelcomeEmail(email);

    const [customerResult, adminResult] = await Promise.all([
      dispatchEmail({
        to: email,
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
        meta: { kind: "newsletter_welcome", email },
      }),
      adminEmail
        ? dispatchEmail({
            to: adminEmail,
            subject: `Newsletter signup — ${email}`,
            html: `<p><strong>${escapeHtml(email)}</strong> subscribed to the newsletter.</p>`,
            text: `${email} subscribed to the newsletter.`,
            replyTo: email,
            meta: { kind: "newsletter_admin", email },
          })
        : Promise.resolve({ ok: true, skipped: true }),
    ]);

    if (!customerResult.ok) {
      return res.status(502).json({
        error: customerResult.error?.message || "Subscribed, but welcome email failed.",
        profileId: profile.id,
      });
    }

    return res.status(200).json({
      ok: true,
      profileId: profile.id,
      created: profile.created,
      customerMessageId: customerResult.messageId ?? null,
      adminMessageId: adminResult.ok ? adminResult.messageId ?? null : null,
      customerSimulated: Boolean(customerResult.simulated),
      customerSkipped: Boolean(customerResult.skipped),
    });
  } catch (error) {
    console.error("newsletter-subscribe:", error);
    return res.status(500).json({ error: error.message || "Newsletter subscribe failed." });
  }
}
