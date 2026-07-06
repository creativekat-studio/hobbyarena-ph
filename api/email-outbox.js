import {
  clearSimulatedEmails,
  getSimulatedEmail,
  isEmailSimulate,
  listSimulatedEmails,
} from "./_lib/emailSimulator.js";

export default async function handler(req, res) {
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
