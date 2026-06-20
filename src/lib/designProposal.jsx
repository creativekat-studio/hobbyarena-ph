import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DESIGN_PROPOSAL, getDesignProposal } from "../themes/index.js";

const DESIGN_PROPOSAL_STORAGE_KEY = "hobbyarena:design-proposal";

const DesignProposalContext = createContext({
  proposalId: DEFAULT_DESIGN_PROPOSAL,
  proposal: getDesignProposal(DEFAULT_DESIGN_PROPOSAL),
  setProposalId: () => {},
});

function getInitialProposalId() {
  if (typeof window === "undefined") return DEFAULT_DESIGN_PROPOSAL;
  const stored = window.localStorage.getItem(DESIGN_PROPOSAL_STORAGE_KEY);
  const parsed = Number(stored);
  return parsed === 1 || parsed === 2 ? parsed : DEFAULT_DESIGN_PROPOSAL;
}

export function DesignProposalProvider({ children }) {
  const [proposalId, setProposalIdState] = useState(getInitialProposalId);
  const proposal = useMemo(() => getDesignProposal(proposalId), [proposalId]);

  useEffect(() => {
    window.localStorage.setItem(DESIGN_PROPOSAL_STORAGE_KEY, String(proposalId));
  }, [proposalId]);

  const value = useMemo(
    () => ({
      proposalId,
      proposal,
      setProposalId: setProposalIdState,
    }),
    [proposalId, proposal],
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
