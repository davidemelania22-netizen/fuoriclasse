import { describe, expect, it } from 'vitest';
import type {
  CareerLegacy,
  CareerTimelineEvent,
  SeasonStatsRow,
} from '../api/client';
import { buildCareerCardData, careerCardFileName } from './careerCard';

const season = (
  seasonLabel: string,
  clubName: string,
  extra: Partial<SeasonStatsRow> = {},
): SeasonStatsRow => ({
  seasonLabel,
  competitionName: 'Italia Prima Divisione',
  clubName,
  appearances: 30,
  goals: 12,
  assists: 5,
  yellowCards: 2,
  redCards: 0,
  averageRating: 7.1,
  ...extra,
});

const legacy: CareerLegacy = {
  playerName: 'Mario Rossi',
  age: 35,
  isRetired: true,
  totals: {
    appearances: 420,
    goals: 180,
    assists: 90,
    averageRating: 7.24,
    trophies: 6,
    personalAwards: 2,
  },
  bestSeason: season('2031/2032', 'Milano Nerazzurra', {
    goals: 28,
    appearances: 34,
  }),
  grade: {
    key: 'LEGGENDA',
    label: 'Leggenda',
    description: 'Il tuo nome è scolpito nella storia di questo sport.',
  },
};

// The API returns seasons newest-first.
const seasons: SeasonStatsRow[] = [
  season('2033/2034', 'Milano Nerazzurra'),
  season('2032/2033', 'Milano Nerazzurra'),
  season('2031/2032', 'Milano Nerazzurra'),
  season('2029/2030', 'Milano Rossonera'),
  season('2026/2027', 'Bologna Felsinea'),
];

const timeline: CareerTimelineEvent[] = [
  {
    date: '2027-05-01',
    type: 'TROPHY',
    title: 'Coppa Nazionale con il Bologna',
    description: '',
  },
  {
    date: '2032-06-01',
    type: 'AWARD',
    title: "Sfera d'Oro",
    description: '',
  },
  {
    date: '2028-01-01',
    type: 'TRANSFER',
    title: 'Passa al Milan',
    description: '',
  },
  { date: '2026-09-01', type: 'DEBUT', title: 'Debutto', description: '' },
];

describe('buildCareerCardData', () => {
  const card = buildCareerCardData({
    legacy,
    seasons,
    timeline,
    avatarDataUrl: null,
  });

  it('reads the career span from both ends of the season list', () => {
    expect(card.seasonSpan).toBe('2026/2027 → 2033/2034');
  });

  it('lists the shirts in the order they were worn, without repeats', () => {
    expect(card.clubs).toEqual([
      'Bologna Felsinea',
      'Milano Rossonera',
      'Milano Nerazzurra',
    ]);
  });

  it('puts personal awards above club trophies, and drops the rest', () => {
    expect(card.honours).toEqual([
      { icon: '🥇', title: "Sfera d'Oro" },
      { icon: '🏆', title: 'Coppa Nazionale con il Bologna' },
    ]);
  });

  it('says plainly whether the career is over', () => {
    expect(card.statusLine).toBe('Ritirato a 35 anni');
    expect(
      buildCareerCardData({
        legacy: { ...legacy, isRetired: false, age: 24 },
        seasons,
        timeline,
        avatarDataUrl: null,
      }).statusLine,
    ).toBe('In attività · 24 anni');
  });

  it('carries the headline numbers in card order', () => {
    expect(card.stats.map((stat) => stat.value)).toEqual([
      '420',
      '180',
      '90',
      '7.24',
      '6',
      '2',
    ]);
  });

  it('survives a career that never got started', () => {
    const empty = buildCareerCardData({
      legacy: { ...legacy, bestSeason: null },
      seasons: [],
      timeline: [],
      avatarDataUrl: null,
    });
    expect(empty.seasonSpan).toBe('');
    expect(empty.clubs).toEqual([]);
    expect(empty.honours).toEqual([]);
    expect(empty.bestSeason).toBeNull();
  });

  it('collapses a single-season career into one label', () => {
    const one = buildCareerCardData({
      legacy,
      seasons: [season('2026/2027', 'Bologna Felsinea')],
      timeline: [],
      avatarDataUrl: null,
    });
    expect(one.seasonSpan).toBe('2026/2027');
  });
});

describe('careerCardFileName', () => {
  it('makes a findable filename out of any name', () => {
    expect(careerCardFileName('Mario Rossi')).toBe('carriera-mario-rossi.png');
    expect(careerCardFileName('Zlatan Ibrahimović')).toBe(
      'carriera-zlatan-ibrahimovic.png',
    );
    expect(careerCardFileName('  ')).toBe('carriera-giocatore.png');
  });
});
