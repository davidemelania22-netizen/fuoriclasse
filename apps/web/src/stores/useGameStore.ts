import { create } from 'zustand';

interface GameStore {
  currentSaveId: string | null;
  selectSave: (id: string) => void;
  clearSave: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  currentSaveId: null,
  selectSave: (id) => set({ currentSaveId: id }),
  clearSave: () => set({ currentSaveId: null }),
}));
