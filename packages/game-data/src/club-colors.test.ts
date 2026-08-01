import { describe, expect, it } from 'vitest';
import { clubColors } from './club-colors';
import { DEFAULT_WORLD_CONFIG } from './world-config';

const allClubNames = Object.values(DEFAULT_WORLD_CONFIG.namePools).flatMap(
  (pool) => [
    ...(pool.featuredClubs ?? []),
    ...(pool.secondDivisionClubs ?? []),
  ],
);

describe('clubColors', () => {
  it('reads the colour out of the club name', () => {
    expect(clubColors('Milano Rossonera').primary).toBe('#c8102e');
    expect(clubColors('Milano Rossonera').secondary).toBe('#12141a');
    expect(clubColors('Firenze Viola').primary).toBe('#5c2d91');
    expect(clubColors('Tyneside Magpies').primary).toBe('#12141a');
  });

  it('prefers the longer colour word when one contains another', () => {
    // "biancorossa" contains "rossa": the compound must win.
    expect(clubColors('Bari Biancorossa').primary).toBe('#f4f6fb');
    expect(clubColors('Hannover Rossa').primary).toBe('#c8102e');
  });

  it('works for a club renamed in the world editor', () => {
    expect(clubColors('Verona Gialloblù').primary).toBe('#f5d907');
    expect(clubColors('Verona Gialloblù').secondary).toBe('#1b5faa');
  });

  it('is deterministic for names it cannot read', () => {
    const a = clubColors('Qualcosa Di Ignoto');
    const b = clubColors('Qualcosa Di Ignoto');
    expect(a).toEqual(b);
  });

  it('gives every club in the default world a colour', () => {
    // Derived, not a literal: league size is a balance knob, and a hard 120
    // here only ever failed the day someone tuned it.
    const expected =
      Object.keys(DEFAULT_WORLD_CONFIG.namePools).length *
      (DEFAULT_WORLD_CONFIG.clubsPerTopDivision +
        DEFAULT_WORLD_CONFIG.clubsPerSecondDivision);
    expect(allClubNames).toHaveLength(expected);
    for (const name of allClubNames) {
      const colors = clubColors(name);
      expect(colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.primary).not.toBe(colors.secondary);
    }
  });

  it('picks text that stays readable on the shirt colour', () => {
    // White shirt -> dark text; navy shirt -> light text.
    expect(clubColors('Torino Bianconera').onPrimary).toBe('#12141a');
    expect(clubColors('Milano Nerazzurra').onPrimary).toBe('#f4f6fb');
  });
});

describe('clubColors — leggibilità su fondo scuro', () => {
  /** Same formula the palette uses, so the test checks the outcome, not the code. */
  const luminance = (hex: string): number => {
    const v = hex.replace('#', '');
    const linear = (o: number) => {
      const s = parseInt(v.slice(o, o + 2), 16) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(0) + 0.7152 * linear(2) + 0.0722 * linear(4);
  };

  it('lifts a club whose colours are both dark', () => {
    // Red and black: writing the name in black on a dark stage made it vanish.
    const milan = clubColors('Milano Rossonera');
    expect(luminance(milan.secondary)).toBeLessThan(0.05);
    expect(luminance(milan.onDark)).toBeGreaterThan(0.22);
  });

  it('gives every club in the default world a readable name colour', () => {
    for (const name of allClubNames) {
      expect(luminance(clubColors(name).onDark)).toBeGreaterThan(0.2);
    }
  });

  it('keeps the hue while lifting', () => {
    // A red club stays red: the red channel still dominates.
    const onDark = clubColors('Milano Rossonera').onDark;
    const [r, g, b] = [1, 3, 5].map((o) =>
      parseInt(onDark.replace('#', '').slice(o - 1, o + 1), 16),
    );
    expect(r).toBeGreaterThan(g!);
    expect(r).toBeGreaterThan(b!);
  });
});
