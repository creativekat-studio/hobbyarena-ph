import { PROPOSAL_1 } from "./proposal1.js";
import { PROPOSAL_2 } from "./proposal2.js";

export const DESIGN_PROPOSALS = {
  1: PROPOSAL_1,
  2: PROPOSAL_2,
};

export const DEFAULT_DESIGN_PROPOSAL = 2;

export function getDesignProposal(id) {
  return DESIGN_PROPOSALS[id] ?? PROPOSAL_2;
}
