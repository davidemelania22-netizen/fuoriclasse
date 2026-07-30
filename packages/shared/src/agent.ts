import { z } from 'zod';

export const agentSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  /** Cut the agent takes on sponsor/deal money, as a percentage. */
  commissionPct: z.number().min(0).max(50),
  /** Network strength 1..5: better contacts secure bigger raises and sponsors. */
  contacts: z.number().int().min(1).max(5),
  blurb: z.string().min(1),
});

export type Agent = z.infer<typeof agentSchema>;

/** Structured request kinds a player can make to their agent (offline). */
export const AGENT_REQUEST_TYPES = ['sponsor', 'transfer', 'renewal'] as const;
export type AgentRequestType = (typeof AGENT_REQUEST_TYPES)[number];
