export interface PromotionSwap {
  clubId: string;
  toCompetitionId: string;
}

/**
 * End-of-season promotion and relegation between two adjacent divisions.
 *
 * The bottom `desiredSlots` clubs of the top flight swap places with the top
 * `desiredSlots` clubs of the second flight. `topRanked` and `secondRanked` are
 * club ids in final standing order (champion first, worst last). The number of
 * slots is clamped so the top flight keeps at least one club and never promotes
 * more clubs than the second flight has.
 */
export function planPromotionRelegation(
  topCompetitionId: string,
  topRanked: readonly string[],
  secondCompetitionId: string,
  secondRanked: readonly string[],
  desiredSlots: number,
): PromotionSwap[] {
  const slots = Math.max(
    0,
    Math.min(desiredSlots, topRanked.length - 1, secondRanked.length),
  );
  if (slots === 0) return [];

  const relegated = topRanked.slice(topRanked.length - slots);
  const promoted = secondRanked.slice(0, slots);

  return [
    ...relegated.map((clubId) => ({
      clubId,
      toCompetitionId: secondCompetitionId,
    })),
    ...promoted.map((clubId) => ({
      clubId,
      toCompetitionId: topCompetitionId,
    })),
  ];
}
