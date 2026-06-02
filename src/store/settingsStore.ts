import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dudos_settings';

// Espelho em nível de módulo para o hook de áudio consultar sem React.
let soundOn = true;
export function isSoundOn(): boolean {
  return soundOn;
}

interface SettingsStore {
  soundEnabled: boolean;
  loadSettings: () => Promise<void>;
  setSoundEnabled: (v: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  soundEnabled: true,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        soundOn = s.soundEnabled ?? true;
        set({ soundEnabled: soundOn });
      }
    } catch {}
  },

  setSoundEnabled: async (v) => {
    soundOn = v;
    set({ soundEnabled: v });
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify({ soundEnabled: v }));
    } catch {}
  },
}));
