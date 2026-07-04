import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DESIGN_PROPOSAL, getDesignProposal } from "../themes/index.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveDesignSettings, subscribeDesignSettings } from "./firebase/repositories/design.js";

const DESIGN_PROPOSAL_STORAGE_KEY = "hobbyarena:design-proposal";

const DesignProposalContext = createContext({
  proposalId: DEFAULT_DESIGN_PROPOSAL,
  proposal: getDesignProposal(DEFAULT_DESIGN_PROPOSAL),
  setProposalId: () => {},
});

function readLocalProposalId() {
  if (typeof window === "undefined") return DEFAULT_DESIGN_PROPOSAL;
  const stored = window.localStorage.getItem(DESIGN_PROPOSAL_STORAGE_KEY);
  const parsed = Number(stored);
  return parsed === 1 || parsed === 2 ? parsed : DEFAULT_DESIGN_PROPOSAL;
}

function normalizeProposalId(value) {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 ? parsed : DEFAULT_DESIGN_PROPOSAL;
}

export function DesignProposalProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [proposalId, setProposalIdState] = useState(() =>
    firebaseEnabled ? DEFAULT_DESIGN_PROPOSAL : readLocalProposalId(),
  );
  const syncingRemote = useRef(false);
  const pendingSeed = useRef(null);
  const proposal = useMemo(() => getDesignProposal(proposalId), [proposalId]);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;

    return subscribeDesignSettings(
      (remote) => {
        syncingRemote.current = true;
        if (!remote) {
          const localId = readLocalProposalId();
          setProposalIdState(localId);
          pendingSeed.current = localId;
        } else {
          pendingSeed.current = null;
          setProposalIdState(normalizeProposalId(remote.proposalId));
        }
        queueMicrotask(() => {
          syncingRemote.current = false;
        });
      },
      (error) => console.error("[design] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!firebaseEnabled || !adminWrite.ready || !adminWrite.allowed) return undefined;
    if (pendingSeed.current == null) return undefined;

    const seedId = pendingSeed.current;
    pendingSeed.current = null;
    saveDesignSettings({ proposalId: seedId }).catch((error) => {
      console.error("[design] Failed to seed Firestore:", error);
    });
  }, [firebaseEnabled, adminWrite]);

  useEffect(() => {
    if (firebaseEnabled || syncingRemote.current) return;
    window.localStorage.setItem(DESIGN_PROPOSAL_STORAGE_KEY, String(proposalId));
  }, [proposalId, firebaseEnabled]);

  const setProposalId = useCallback(
    (nextId) => {
      const normalized = normalizeProposalId(nextId);
      setProposalIdState(normalized);
      if (firebaseEnabled && adminWrite.allowed) {
        saveDesignSettings({ proposalId: normalized }).catch((error) => {
          console.error("[design] Failed to save settings:", error);
        });
      }
    },
    [firebaseEnabled, adminWrite.allowed],
  );

  const value = useMemo(
    () => ({
      proposalId,
      proposal,
      setProposalId,
    }),
    [proposalId, proposal, setProposalId],
  );

  return (
    <DesignProposalContext.Provider value={value}>
      {children}
    </DesignProposalContext.Provider>
  );
}

export function useDesignProposal() {
  return useContext(DesignProposalContext);
}
