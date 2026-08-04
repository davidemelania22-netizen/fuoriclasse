/**
 * Fuoriclasse simulation engine.
 *
 * This package is intentionally free of any framework, database or I/O
 * dependency. It must never import React, Fastify or Prisma, never read
 * `process.env`, never touch the system clock and never call `Math.random()`.
 * It receives data in, returns new states and events out.
 */
export const SIMULATION_ENGINE_VERSION = '0.1.0';

export * from './random/random-source';
export * from './random/seeded-random';
export * from './util/math';
export * from './util/time';
export * from './domain/world';
export * from './generation/player-generator';
export * from './generation/club-generator';
export * from './generation/schedule-generator';
export * from './generation/promotion';
export * from './generation/world-generator';
export * from './progression/types';
export * from './progression/age';
export * from './progression/npc-aging';
export * from './progression/manager-trust';
export * from './progression/scouting';
export * from './progression/league-strength';
export * from './progression/naturalization';
export * from './generation/transfer-market';
export * from './generation/youth-intake';
export * from './generation/sackings';
export * from './progression/training-system';
export * from './progression/aging-system';
export * from './match/types';
export * from './match/selection';
export * from './match/form-system';
export * from './match/match-plan';
export * from './match/instructions';
export * from './match/team-strength';
export * from './match/match-engine';
export * from './match/standings';
export * from './match/season';
export * from './match/knockout';
export * from './career/market-value';
export * from './career/contract';
export * from './career/transfer-ai';
export * from './career/selection';
export * from './career/retirement';
export * from './career/career-simulator';
export * from './career/transfer-window';
export * from './career/negotiation';
export * from './career/contract-talks';
export * from './career/payslip';
export * from './wellbeing/injury-system';
export * from './wellbeing/morale-system';
export * from './wellbeing/match-aftermath';
export * from './wellbeing/relationship-system';
export * from './events/trigger-evaluator';
export * from './events/cooldown-manager';
export * from './events/event-selector';
export * from './events/event-resolver';
export * from './events/render-template';
