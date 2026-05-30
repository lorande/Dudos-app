import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Efeitos sonoros via expo-audio (substitui o antigo expo-av).
// Para versão offline, troque as URLs por require('../../assets/sons/xxx.mp3').

type SoundType = 'roll' | 'bid' | 'dudo' | 'win' | 'lose' | 'tick';

const SOUND_URLS: Record<SoundType, string> = {
  roll: 'https://cdn.freesound.org/previews/441/441495_4397622-lq.mp3',
  bid:  'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3',
  dudo: 'https://cdn.freesound.org/previews/242/242501_4284968-lq.mp3',
  win:  'https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3',
  lose: 'https://cdn.freesound.org/previews/142/142608_1840739-lq.mp3',
  tick: 'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3',
};

// Configura o áudio uma única vez (toca mesmo no modo silencioso do iOS).
let audioModeSet = false;
function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
}

// Cache de players carregados (lazy).
const playerCache: Partial<Record<SoundType, AudioPlayer>> = {};

function getPlayer(type: SoundType): AudioPlayer | null {
  try {
    if (!playerCache[type]) {
      playerCache[type] = createAudioPlayer({ uri: SOUND_URLS[type] });
    }
    return playerCache[type]!;
  } catch {
    return null;
  }
}

export function useSoundAndHaptics() {
  const play = useCallback((type: SoundType) => {
    try {
      ensureAudioMode();
      const player = getPlayer(type);
      if (!player) return;
      player.seekTo(0);
      player.play();
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
