import { describe, expect, it } from 'vitest';
import { createRandomSource } from '../random/seeded-random';
import {
  KEY_MOMENTS_PER_MATCH,
  keyMomentPrompts,
  resolveMatchPlan,
} from './match-plan';

describe('keyMomentPrompts', () => {
  it('presents a fixed number of distinct moments, deterministically per seed', () => {
    const a = keyMomentPrompts(createRandomSource('fx:1'));
    const b = keyMomentPrompts(createRandomSource('fx:1'));
    const c = keyMomentPrompts(createRandomSource('fx:2'));

    expect(a).toHaveLength(KEY_MOMENTS_PER_MATCH);
    expect(a).toEqual(b); // same seed → same moments (matches the later resolve)
    expect(new Set(a.map((m) => m.id)).size).toBe(a.length); // distinct
    // Different fixtures generally surface different situations.
    expect(a.map((m) => m.id).join()).not.toBe(c.map((m) => m.id).join());
  });

  it('never leaks outcome effects into the prompt options', () => {
    const prompts = keyMomentPrompts(createRandomSource('fx:leak'));
    for (const moment of prompts) {
      for (const option of moment.options) {
        expect(Object.keys(option).sort()).toEqual(['key', 'label']);
      }
    }
  });
});

describe('resolveMatchPlan', () => {
  const planFor = (choices: Record<string, string>, isDerby = false) => ({
    approach: 'BALANCED' as const,
    choices,
    isDerby,
  });

  it('resolves the same moments the player was shown', () => {
    const prompts = keyMomentPrompts(createRandomSource('fx:same'));
    const outcome = resolveMatchPlan(
      createRandomSource('fx:same'),
      createRandomSource('fx:same:roll'),
      planFor({}),
    );
    expect(outcome.moments.map((m) => m.momentId)).toEqual(
      prompts.map((p) => p.id),
    );
  });

  it('is deterministic for the same seeds and choices', () => {
    const a = resolveMatchPlan(
      createRandomSource('fx:det'),
      createRandomSource('fx:det:roll'),
      planFor({}),
    );
    const b = resolveMatchPlan(
      createRandomSource('fx:det'),
      createRandomSource('fx:det:roll'),
      planFor({}),
    );
    expect(a).toEqual(b);
  });

  it('counts a scored/created chance toward the team score', () => {
    // Find a roll seed where the first (one-on-one) moment succeeds on a shot.
    const prompts = keyMomentPrompts(createRandomSource('fx:goal'));
    const shootable = prompts.find((p) =>
      p.options.some((o) => o.key === 'shoot' || o.key === 'attack'),
    );
    expect(shootable).toBeDefined();
    const choiceKey = shootable!.options.find(
      (o) => o.key === 'shoot' || o.key === 'attack',
    )!.key;

    let sawTeamGoal = false;
    for (let i = 0; i < 40 && !sawTeamGoal; i += 1) {
      const outcome = resolveMatchPlan(
        createRandomSource('fx:goal'),
        createRandomSource(`fx:goal:roll:${i}`),
        planFor({ [shootable!.id]: choiceKey }),
      );
      const moment = outcome.moments.find((m) => m.momentId === shootable!.id)!;
      if (moment.success) {
        // A successful offensive moment must add a goal or assist to the team.
        expect(outcome.teamGoalDelta).toBeGreaterThanOrEqual(1);
        expect(outcome.goals + outcome.assists).toBeGreaterThanOrEqual(1);
        sawTeamGoal = true;
      }
    }
    expect(sawTeamGoal).toBe(true);
  });

  it('amplifies the rating swing in a derby', () => {
    // Same seeds, derby vs not: the magnitude of the rating swing grows.
    const normal = resolveMatchPlan(
      createRandomSource('fx:derby'),
      createRandomSource('fx:derby:roll'),
      planFor({}, false),
    );
    const derby = resolveMatchPlan(
      createRandomSource('fx:derby'),
      createRandomSource('fx:derby:roll'),
      planFor({}, true),
    );
    // Identical moment outcomes, only the swing multiplier differs.
    expect(derby.moments).toEqual(normal.moments);
    if (normal.ratingDelta !== 0) {
      expect(Math.abs(derby.ratingDelta)).toBeGreaterThan(
        Math.abs(normal.ratingDelta),
      );
    }
  });

  it('an attacking approach lifts offensive success rates over a cautious one', () => {
    const prompts = keyMomentPrompts(createRandomSource('fx:appr'));
    const offensiveMoment = prompts.find((p) =>
      p.options.some((o) => ['shoot', 'dribble', 'attack'].includes(o.key)),
    )!;
    const offensiveKey = offensiveMoment.options.find((o) =>
      ['shoot', 'dribble', 'attack'].includes(o.key),
    )!.key;
    const choices = { [offensiveMoment.id]: offensiveKey };

    let attackingGoals = 0;
    let defensiveGoals = 0;
    for (let i = 0; i < 300; i += 1) {
      const roll = () => createRandomSource(`fx:appr:roll:${i}`);
      const att = resolveMatchPlan(createRandomSource('fx:appr'), roll(), {
        approach: 'ATTACKING',
        choices,
        isDerby: false,
      });
      const def = resolveMatchPlan(createRandomSource('fx:appr'), roll(), {
        approach: 'DEFENSIVE',
        choices,
        isDerby: false,
      });
      const attM = att.moments.find((m) => m.momentId === offensiveMoment.id)!;
      const defM = def.moments.find((m) => m.momentId === offensiveMoment.id)!;
      if (attM.success) attackingGoals += 1;
      if (defM.success) defensiveGoals += 1;
    }
    expect(attackingGoals).toBeGreaterThan(defensiveGoals);
  });
});
