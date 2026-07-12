import { DesignSettingsProvider, useDesignSettings } from "./designSettings.jsx";

/** @deprecated Prefer DesignSettingsProvider — kept so existing imports keep working. */
export function DesignProposalProvider({ children }) {
  return <DesignSettingsProvider>{children}</DesignSettingsProvider>;
}

export function useDesignProposal() {
  const { proposalId, proposal, setProposalId } = useDesignSettings();
  return { proposalId, proposal, setProposalId };
}
