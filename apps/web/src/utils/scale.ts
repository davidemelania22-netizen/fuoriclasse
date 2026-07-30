/**
 * The engine stores abilities/attributes on a 1-100 scale, but the UI shows
 * them on the Football-Manager-style 0-20 scale. These helpers convert between
 * the two at the display/edit boundary only — internals stay 1-100.
 */
export const to20 = (value: number): number => Math.round(value / 5);

export const from20 = (value: number): number =>
  Math.max(1, Math.min(100, Math.round(value * 5)));
