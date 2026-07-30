import { create } from 'zustand';

type View =
  | 'dashboard'
  | 'editor'
  | 'shop'
  | 'agent'
  | 'lifestyle'
  | 'interview'
  | 'cups'
  | 'history'
  | 'standings'
  | 'match'
  | 'news'
  | 'career'
  | 'tactics'
  | 'calendar'
  | 'world';

interface GameStore {
  currentSaveId: string | null;
  view: View;
  selectSave: (id: string) => void;
  clearSave: () => void;
  openEditor: () => void;
  openShop: () => void;
  openAgent: () => void;
  openLifestyle: () => void;
  openInterview: () => void;
  openCups: () => void;
  openHistory: () => void;
  openStandings: () => void;
  openMatch: () => void;
  openNews: () => void;
  openTactics: () => void;
  openCalendar: () => void;
  openWorldEditor: () => void;
  openCareer: () => void;
  closeOverlay: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  currentSaveId: null,
  view: 'dashboard',
  selectSave: (id) => set({ currentSaveId: id, view: 'dashboard' }),
  clearSave: () => set({ currentSaveId: null, view: 'dashboard' }),
  openEditor: () => set({ view: 'editor' }),
  openShop: () => set({ view: 'shop' }),
  openAgent: () => set({ view: 'agent' }),
  openLifestyle: () => set({ view: 'lifestyle' }),
  openInterview: () => set({ view: 'interview' }),
  openCups: () => set({ view: 'cups' }),
  openHistory: () => set({ view: 'history' }),
  openStandings: () => set({ view: 'standings' }),
  openMatch: () => set({ view: 'match' }),
  openNews: () => set({ view: 'news' }),
  openTactics: () => set({ view: 'tactics' }),
  openCalendar: () => set({ view: 'calendar' }),
  openWorldEditor: () => set({ view: 'world' }),
  openCareer: () => set({ view: 'career' }),
  closeOverlay: () => set({ view: 'dashboard' }),
}));
