/**
 * Canonical string enumerations. SQLite has no native enums, so every "enum"
 * column in the Prisma schema is a String validated against these values.
 * Each export pairs a runtime const object with a matching union type.
 */

export const PersonType = {
  Player: 'PLAYER',
  Coach: 'COACH',
  Agent: 'AGENT',
  Family: 'FAMILY',
  Partner: 'PARTNER',
  Other: 'OTHER',
} as const;
export type PersonType = (typeof PersonType)[keyof typeof PersonType];

export const PlayerPosition = {
  Goalkeeper: 'GK',
  Defender: 'DF',
  Midfielder: 'MF',
  Winger: 'WG',
  Forward: 'FW',
} as const;
export type PlayerPosition =
  (typeof PlayerPosition)[keyof typeof PlayerPosition];

export const PreferredFoot = {
  Left: 'LEFT',
  Right: 'RIGHT',
  Both: 'BOTH',
} as const;
export type PreferredFoot = (typeof PreferredFoot)[keyof typeof PreferredFoot];

export const CareerStatus = {
  Youth: 'YOUTH',
  Active: 'ACTIVE',
  Injured: 'INJURED',
  Retired: 'RETIRED',
  Unemployed: 'UNEMPLOYED',
} as const;
export type CareerStatus = (typeof CareerStatus)[keyof typeof CareerStatus];

export const SquadRole = {
  Key: 'KEY',
  FirstTeam: 'FIRST_TEAM',
  Rotation: 'ROTATION',
  Backup: 'BACKUP',
  Prospect: 'PROSPECT',
} as const;
export type SquadRole = (typeof SquadRole)[keyof typeof SquadRole];

export const ContractStatus = {
  Active: 'ACTIVE',
  Expired: 'EXPIRED',
  Terminated: 'TERMINATED',
  Pending: 'PENDING',
} as const;
export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export const CompetitionType = {
  League: 'LEAGUE',
  Cup: 'CUP',
  YouthLeague: 'YOUTH_LEAGUE',
  International: 'INTERNATIONAL',
  Continental: 'CONTINENTAL',
} as const;
export type CompetitionType =
  (typeof CompetitionType)[keyof typeof CompetitionType];

export const SeasonStatus = {
  Scheduled: 'SCHEDULED',
  InProgress: 'IN_PROGRESS',
  Completed: 'COMPLETED',
} as const;
export type SeasonStatus = (typeof SeasonStatus)[keyof typeof SeasonStatus];

export const FixtureStatus = {
  Scheduled: 'SCHEDULED',
  Played: 'PLAYED',
  Postponed: 'POSTPONED',
} as const;
export type FixtureStatus = (typeof FixtureStatus)[keyof typeof FixtureStatus];

export const InjuryStatus = {
  Active: 'ACTIVE',
  Recovering: 'RECOVERING',
  Healed: 'HEALED',
} as const;
export type InjuryStatus = (typeof InjuryStatus)[keyof typeof InjuryStatus];

export const RelationshipType = {
  Family: 'FAMILY',
  Teammate: 'TEAMMATE',
  Coach: 'COACH',
  Agent: 'AGENT',
  Partner: 'PARTNER',
  Rival: 'RIVAL',
  Friend: 'FRIEND',
} as const;
export type RelationshipType =
  (typeof RelationshipType)[keyof typeof RelationshipType];

export const RelationshipStatus = {
  Active: 'ACTIVE',
  Ended: 'ENDED',
} as const;
export type RelationshipStatus =
  (typeof RelationshipStatus)[keyof typeof RelationshipStatus];

export const EventCategory = {
  Football: 'FOOTBALL',
  Coach: 'COACH',
  Teammates: 'TEAMMATES',
  Family: 'FAMILY',
  School: 'SCHOOL',
  Love: 'LOVE',
  Agent: 'AGENT',
  Media: 'MEDIA',
  Sponsor: 'SPONSOR',
  Health: 'HEALTH',
  Finance: 'FINANCE',
  Behaviour: 'BEHAVIOUR',
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export const EventStatus = {
  Pending: 'PENDING',
  Resolved: 'RESOLVED',
  Expired: 'EXPIRED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const TransferOfferStatus = {
  Pending: 'PENDING',
  Accepted: 'ACCEPTED',
  Rejected: 'REJECTED',
  Expired: 'EXPIRED',
  Withdrawn: 'WITHDRAWN',
} as const;
export type TransferOfferStatus =
  (typeof TransferOfferStatus)[keyof typeof TransferOfferStatus];

export const FinancialTransactionType = {
  Wage: 'WAGE',
  Bonus: 'BONUS',
  Sponsor: 'SPONSOR',
  Purchase: 'PURCHASE',
  Investment: 'INVESTMENT',
  Tax: 'TAX',
  Other: 'OTHER',
} as const;
export type FinancialTransactionType =
  (typeof FinancialTransactionType)[keyof typeof FinancialTransactionType];

export const AttributeCategory = {
  Technical: 'TECHNICAL',
  Physical: 'PHYSICAL',
  Mental: 'MENTAL',
  Hidden: 'HIDDEN',
} as const;
export type AttributeCategory =
  (typeof AttributeCategory)[keyof typeof AttributeCategory];

export const SimulationLogLevel = {
  Debug: 'DEBUG',
  Info: 'INFO',
  Warn: 'WARN',
  Error: 'ERROR',
} as const;
export type SimulationLogLevel =
  (typeof SimulationLogLevel)[keyof typeof SimulationLogLevel];

/** ISO-style country codes supported by the MVP world. */
export const COUNTRY_CODES = ['IT', 'EN', 'ES', 'FR', 'DE'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];
