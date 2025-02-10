import create from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    {
      name: 'settings-storage',
    }
  )
);