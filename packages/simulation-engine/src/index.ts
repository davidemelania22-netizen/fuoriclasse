/**
 * Football Life simulation engine.
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
export * from './generation/world-generator';
export * from './progression/types';
export * from './progression/age';
export * from './progression/training-system';
export * from './progression/aging-system';
export * from './match/types';
export * from './match/selection';
export * from './match/team-strength';
export * from './match/match-engine';
export * from './match/standings';
export * from './match/season';
export * from './career/market-value';
export * from './career/contract';
export * from './career/transfer-ai';
export * from './career/selection';
export * from './wellbeing/injury-system';
export * from './wellbeing/morale-system';
export * from './wellbeing/relationship-system';
