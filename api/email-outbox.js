import {
  clearSimulatedEmails,
  getSimulatedEmail,
  isEmailSimulate,
  listSimulatedEmails,
} from "./_lib/emailSimulator.js";
import { isApiProduction, requireAdmin } from "./_lib/requireAdmin.js";

export default async function handler(req, res) {
  // Never expose the simulated outbox on production.
  if (isApiProduction()) {
    return res.status(404).json({ error: "Not found." });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return undefined;

  if (req.method === "GET") {
    const { id, status } = req.query || {};
    if (status === "1") {
      return res.status(200).json({
        simulate: isEmailSimulate(),
        count: listSimulatedEmails().length,
      });
    }
    if (id) {
      const entry = getSimulatedEmail(String(id));
      if (!entry) return res.status(404).json({ error: "Email not found." });
      return res.status(200).json({ ok: true, entry });
    }
    return res.status(200).json({
      ok: true,
      simulate: isEmailSimulate(),
      entries: listSimulatedEmails(),
    });
  }

  if (req.method === "DELETE") {
    clearSimulatedEmails();
    return res.status(200).json({ ok: true, cleared: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
