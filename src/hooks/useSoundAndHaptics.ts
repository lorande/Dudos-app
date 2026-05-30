import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// Sons gerados via frequência (sem arquivos externos) usando expo-av
// Para uma versão com assets reais, substitua loadSound() por Audio.Sound.createAsync(require(...))

type SoundType = 'roll' | 'bid' | 'dudo' | 'win' | 'lose' | 'tick';

// Cache de sons carregados
const soundCache: Partial<Record<SoundType, Audio.Sound>> = {};

// URLs de sons curtos em domínio público (freesound.org CC0)
const SOUND_URLS: Record<SoundType, string> = {
  roll:  'https://cdn.freesound.org/previews/441/441495_4397622-lq.mp3',  // dice roll
  bid:   'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3',  // click
  dudo:  'https://cdn.freesound.org/previews/242/242501_4284968-lq.mp3',  // alert
  win:   'https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3',  // fanfare
  lose:  'https://cdn.freesound.org/previews/142/142608_1840739-lq.mp3',  // fail
  tick:  'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3',  // tick
};

async function loadSound(type: SoundType): Promise<Audio.Sound | null> {
  if (soundCache[type]) return soundCache[type]!;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri: SOUND_URLS[type] });
    soundCache[type] = sound;
    return sound;
  } catch {
    return null;
  }
}

export function useSoundAndHaptics() {
  const play = useCallback(async (type: SoundType) => {
    try {
      const sound = await loadSound(type);
      if (!sound) return;
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {}
  }, []);

  const rollDice = useCallback(() => {
    play('roll');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [play]);

  const placeBid = useCallback(() => {
    play('bid');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [play]);

  const callDudo = useCallback(() => {
    play('dudo');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [play]);

  const winGame = useCallback(() => {
    play('win');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [play]);

  const loseRound = useCallback(() => {
    play('lose');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [play]);

  return { rollDice, placeBid, callDudo, winGame, loseRound };
}
