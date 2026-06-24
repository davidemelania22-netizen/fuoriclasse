// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerSummary, SaveGameSummary } from '@football-life/shared';
import { PlayerCard } from './PlayerCard';
import { SavesList } from './SavesList';

const player: PlayerSummary = {
  id: 'p',
  personId: 'pe',
  firstName: 'Alex',
  lastName: 'Rossi',
  birthDate: '2010-07-01T00:00:00.000Z',
  ageYears: 14,
  nationalityId: 'IT',
  primaryPosition: 'MF',
  preferredFoot: 'RIGHT',
  careerStatus: 'YOUTH',
  currentAbility: 25,
  potentialAbility: 65,
  clubId: null,
  condition: 100,
  fatigue: 0,
  morale: 60,
  form: 50,
  stress: 20,
  marketValue: 50000,
};

const save: SaveGameSummary = {
  id: 's',
  name: 'Test Career',
  seed: 'football-life',
  currentDate: '2024-07-01T00:00:00.000Z',
  playerPersonId: 'pe',
  simulationVersion: '0.1.0',
  isCompleted: false,
  createdAt: '2024-07-01T00:00:00.000Z',
  updatedAt: '2024-07-01T00:00:00.000Z',
  lastPlayedAt: '2024-07-01T00:00:00.000Z',
};

describe('PlayerCard', () => {
  it('renders the player profile', () => {
    render(<PlayerCard player={player} save={save} />);
    expect(screen.getByText('Alex Rossi')).toBeInTheDocument();
    expect(screen.getByText('Svincolato')).toBeInTheDocument();
    expect(screen.getByText('Settore giovanile')).toBeInTheDocument();
  });
});

describe('SavesList', () => {
  it('shows an empty state when there are no saves', () => {
    render(<SavesList saves={[]} onSelect={() => undefined} />);
    expect(screen.getByText(/Nessuna carriera salvata/i)).toBeInTheDocument();
  });

  it('renders saves and reports a selection', () => {
    const onSelect = vi.fn();
    render(<SavesList saves={[save]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Test Career/ }));
    expect(onSelect).toHaveBeenCalledWith('s');
  });
});
