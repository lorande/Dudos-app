import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiceStyle, DEFAULT_THEME_ID, DEFAULT_DICE_STYLE, getTheme, Theme } from '../theme/themes';

const KEY = 'dudos_settings';

// Espelho em nível de módulo para hooks/funções consultarem sem React.
let soundOn = true;
let diceStyleMirror: DiceStyle = DEFAULT_DICE_STYLE;
export function isSoundOn(): boolean {
  return soundOn;
}
export function currentDiceStyle(): DiceStyle {
  return diceStyleMirror;
}

interface SettingsStore {
  soundEnabled: boolean;
  themeId: string;
  diceStyle: DiceStyle;
  loadSettings: () => Promise<void>;
  setSoundEnabled: (v: boolean) => Promise<void>;
  setThemeId: (id: string) => Promise<void>;
  setDiceStyle: (s: DiceStyle) => Promise<void>;
}

async function persist(state: { soundEnabled: boolean; themeId: string; diceStyle: DiceStyle }) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  soundEnabled: true,
  themeId: DEFAULT_THEME_ID,
  diceStyle: DEFAULT_DICE_STYLE,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        soundOn = s.soundEnabled ?? true;
        diceStyleMirror = s.diceStyle ?? DEFAULT_DICE_STYLE;
        set({
          soundEnabled: soundOn,
          themeId: s.themeId ?? DEFAULT_THEME_ID,
          diceStyle: diceStyleMirror,
        });
      }
    } catch {}
  },

  setSoundEnabled: async (v) => {
    soundOn = v;
    set({ soundEnabled: v });
    const { themeId, diceStyle } = get();
    await persist({ soundEnabled: v, themeId, diceStyle });
  },

  setThemeId: async (id) => {
    set({ themeId: id });
    const { soundEnabled, diceStyle } = get();
    await persist({ soundEnabled, themeId: id, diceStyle });
  },

  setDiceStyle: async (s) => {
    diceStyleMirror = s;
    set({ diceStyle: s });
    const { soundEnabled, themeId } = get();
    await persist({ soundEnabled, themeId, diceStyle: s });
  },
}));

// Hook de conveniência: tema ativo (objeto completo).
export function useTheme(): Theme {
  const themeId = useSettingsStore((s) => s.themeId);
  return getTheme(themeId);
}
