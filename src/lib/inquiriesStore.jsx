import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { queueInquiryEmails } from "./emailService.js";
import { useFirebaseData } from "./firebase/config.js";
import { getFirebaseAuth } from "./firebase/app.js";
import { isAdminAccount } from "./firebase/auth.js";
import { shouldExposeAdminSession } from "../auth/authSurface.js";
import {
  createInquiryDocument,
  deleteInquiryDocument,
  markNewInquiriesRead,
  subscribeInquiries,
  updateInquiryStatus,
} from "./firebase/repositories/inquiries.js";

/**
 * Inquiries store (contact-form submissions).
 *
 * With Firebase: storefront creates into Firestore `inquiries` (anyone may create);
 * admin session subscribes and manages status. Email notification still goes via API.
 * Without Firebase: localStorage fallback for same-browser mock.
 */

const STORAGE_KEY = "hobbyarena:inquiries";

export const INQUIRY_STATUS = { NEW: "New", READ: "Read", HANDLED: "Handled" };

const SEED = [];

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

function saveLocalInquiries(inquiries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
  } catch {
    // ignore quota / serialization errors
  }
}

const InquiriesContext = createContext(null);

export function InquiriesProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const [inquiries, setInquiries] = useState(() => (firebaseEnabled ? [] : loadInquiries()));
  const inquiriesRef = useRef(inquiries);
  inquiriesRef.current = inquiries;

  useEffect(() => {
    if (firebaseEnabled) return undefined;
    saveLocalInquiries(inquiries);
    return undefined;
  }, [firebaseEnabled, inquiries]);

  useEffect(() => {
    if (!firebaseEnabled) {
      setInquiries(loadInquiries());
      return undefined;
    }

    const auth = getFirebaseAuth();
    if (!auth) return undefined;

    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubFirestore?.();
      unsubFirestore = null;

      if (!user) {
        setInquiries([]);
        return;
      }

      try {
        const token = await user.getIdTokenResult();
        const admin = shouldExposeAdminSession({
          isAdmin: isAdminAccount(user.email, token.claims),
        });

        if (!admin) {
          setInquiries([]);
          return;
        }

        unsubFirestore = subscribeInquiries(
          (rows) => setInquiries(rows),
          (error) => console.error("[inquiries] Firestore sync failed:", error),
        );
      } catch (error) {
        console.error("[inquiries] Auth token failed:", error);
      }
    });

    return () => {
      unsubAuth();
      unsubFirestore?.();
    };
  }, [firebaseEnabled]);

  const api = useMemo(() => {
    const addInquiry = ({ name, email, subject, message }) => {
      const inquiry = {
        id: `q_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: INQUIRY_STATUS.NEW,
        date: new Date().toISOString(),
      };

      if (firebaseEnabled) {
        createInquiryDocument(inquiry).catch((error) => {
          console.error("[inquiries] Failed to save inquiry:", error);
        });
      } else {
        setInquiries((prev) => {
          const next = [inquiry, ...prev];
          saveLocalInquiries(next);
          return next;
        });
      }

      queueInquiryEmails(inquiry);
      return inquiry;
    };

    const setStatus = (id, status) => {
      if (firebaseEnabled) {
        updateInquiryStatus(id, status).catch((error) => {
          console.error("[inquiries] Failed to update status:", error);
        });
        return;
      }
      setInquiries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    };

    const remove = (id) => {
      if (firebaseEnabled) {
        deleteInquiryDocument(id).catch((error) => {
          console.error("[inquiries] Failed to delete inquiry:", error);
        });
        return;
      }
      setInquiries((prev) => prev.filter((q) => q.id !== id));
    };

    const markAllNewAsRead = () => {
      if (firebaseEnabled) {
        const ids = inquiriesRef.current
          .filter((q) => q.status === INQUIRY_STATUS.NEW)
          .map((q) => q.id);
        if (ids.length) {
          markNewInquiriesRead(ids).catch((error) => {
            console.error("[inquiries] Failed to mark read:", error);
          });
        }
        return;
      }
      setInquiries((prev) =>
        prev.map((q) => (q.status === INQUIRY_STATUS.NEW ? { ...q, status: INQUIRY_STATUS.READ } : q)),
      );
    };

    return { addInquiry, setStatus, remove, markAllNewAsRead };
  }, [firebaseEnabled]);

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
