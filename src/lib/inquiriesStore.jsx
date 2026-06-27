import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Inquiries store (contact-form submissions).
 *
 * MOCK: persists to localStorage so a message submitted on the storefront shows
 * up in the admin inbox (same browser). With Firebase, replace the read/write
 * with an `inquiries` Firestore collection; storefront create + admin list/update.
 */

const STORAGE_KEY = "hobbyarena:inquiries";

export const INQUIRY_STATUS = { NEW: "New", READ: "Read", HANDLED: "Handled" };

const SEED = [
  {
    id: "q_seed_1",
    name: "Carlo Mendoza",
    email: "carlo@example.com",
    subject: "OP-15 booster box restock?",
    message: "Hi! Are you restocking the OP-15 booster boxes soon? Want to grab a sealed case.",
    status: "New",
    date: "2026-06-15T09:12:00.000Z",
  },
  {
    id: "q_seed_2",
    name: "Bea Santos",
    email: "bea@example.com",
    subject: "Pickup option",
    message: "Do you offer store pickup in Metro Manila for pre-orders? Thanks!",
    status: "Read",
    date: "2026-06-14T14:40:00.000Z",
  },
];

function loadInquiries() {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED;
  } catch {
    return SEED;
  }
}

const InquiriesContext = createContext(null);

export function InquiriesProvider({ children }) {
  const [inquiries, setInquiries] = useState(loadInquiries);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
  }, [inquiries]);

  const api = useMemo(() => {
    const addInquiry = ({ name, email, subject, message }) =>
      setInquiries((prev) => [
        {
          id: `q_${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          status: INQUIRY_STATUS.NEW,
          date: new Date().toISOString(),
        },
        ...prev,
      ]);

    const setStatus = (id, status) =>
      setInquiries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));

    const remove = (id) => setInquiries((prev) => prev.filter((q) => q.id !== id));

    const markAllNewAsRead = () =>
      setInquiries((prev) =>
        prev.map((q) => (q.status === INQUIRY_STATUS.NEW ? { ...q, status: INQUIRY_STATUS.READ } : q)),
      );

    return { addInquiry, setStatus, remove, markAllNewAsRead };
  }, []);

  const unreadCount = useMemo(
    () => inquiries.filter((q) => q.status === INQUIRY_STATUS.NEW).length,
    [inquiries],
  );

  const value = useMemo(
    () => ({ inquiries, unreadCount, ...api }),
    [inquiries, unreadCount, api],
  );

  return <InquiriesContext.Provider value={value}>{children}</InquiriesContext.Provider>;
}

export function useInquiries() {
  const context = useContext(InquiriesContext);
  if (!context) {
    throw new Error("useInquiries must be used within an InquiriesProvider");
  }
  return context;
}
