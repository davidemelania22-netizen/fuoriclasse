import { create } from 'zustand';

interface GameStore {
  currentSaveId: string | null;
  editing: boolean;
  selectSave: (id: string) => void;
  clearSave: () => void;
  openEditor: () => void;
  closeEditor: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  currentSaveId: null,
  editing: false,
  selectSave: (id) => set({ currentSaveId: id, editing: false }),
  clearSave: () => set({ currentSaveId: null, editing: false }),
  openEditor: () => set({ editing: true }),
  closeEditor: () => set({ editing: false }),
}));
