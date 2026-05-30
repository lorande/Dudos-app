import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  RuleConfig,
  DEFAULT_RULES,
  initGame,
  bid,
  dudo,
  nextRound,
  Bid,
  passo,
  mesa,
  dudoPasso,
} from '../../packages/game-core/src';
import { botDecide, getHumanWins } from '../bots/adaptiveBot';

export interface RuleTemplate {
  id: string;
  name: string;
  rules: RuleConfig;
}

const TEMPLATES_KEY = 'dudos_rule_templates';

interface GameStore {
  // Estado do jogo
  game: GameState | null;

  // Templates de regras
  templates: RuleTemplate[];
  loadTemplates: () => Promise<void>;
  saveTemplate: (name: string, rules: RuleConfig) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Ações de jogo
  startLocalGame: (rules: RuleConfig, humanName: string, botCount: number) => void;
  playerBid: (playerId: string, newBid: Bid) => void;
  playerDudo: (playerId: string) => void;
  playerPasso: (playerId: string) => void;
  playerMesa: (playerId: string, indexes: number[]) => void;
  playerDudoPasso: (playerId: string) => void;
  advanceRound: () => void;
  runBotsIfNeeded: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  templates: [],

  loadTemplates: async () => {
    try {
      const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
      const templates: RuleTemplate[] = raw ? JSON.parse(raw) : [];
      set({ templates });
    } catch {}
  },

  saveTemplate: async (name, rules) => {
    const template: RuleTemplate = {
      id: Date.now().toString(),
      name,
      rules,
    };
    const updated = [...get().templates, template];
    set({ templates: updated });
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  },

  deleteTemplate: async (id) => {
    const updated = get().templates.filter((t) => t.id !== id);
    set({ templates: updated });
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  },

  startLocalGame: (rules, humanName, botCount) => {
    const players = [
      { id: 'human', name: humanName, isBot: false },
      ...Array.from({ length: botCount }, (_, i) => ({
        id: `bot_${i}`,
        name: `Bot ${i + 1}`,
        isBot: true,
      })),
    ];
    const game = initGame(rules, players);
    set({ game });
  },

  playerBid: (playerId, newBid) => {
    const { game } = get();
    if (!game) return;
    try {
      set({ game: bid(game, playerId, newBid) });
    } catch (e) {
      console.warn(e);
    }
  },

  playerDudo: (playerId) => {
    const { game } = get();
    if (!game) return;
    try {
      set({ game: dudo(game, playerId) });
    } catch (e) {
      console.warn(e);
    }
  },

  playerPasso: (playerId) => {
    const { game } = get();
    if (!game) return;
    try { set({ game: passo(game, playerId) }); } catch (e) { console.warn(e); }
  },

  playerMesa: (playerId, indexes) => {
    const { game } = get();
    if (!game) return;
    try { set({ game: mesa(game, playerId, indexes) }); } catch (e) { console.warn(e); }
  },

  playerDudoPasso: (playerId) => {
    const { game } = get();
    if (!game) return;
    try { set({ game: dudoPasso(game, playerId) }); } catch (e) { console.warn(e); }
  },

  advanceRound: () => {
    const { game } = get();
    if (!game || game.phase !== 'round_end') return;
    set({ game: nextRound(game) });
  },

  runBotsIfNeeded: () => {
    const { game, playerBid, playerDudo } = get();
    if (!game || game.phase !== 'bidding') return;

    const current = game.players[game.currentPlayerIndex];
    if (!current || !current.isBot) return;

    setTimeout(() => {
      const freshGame = get().game;
      if (!freshGame) return;
      const freshCurrent = freshGame.players[freshGame.currentPlayerIndex];
      if (!freshCurrent?.isBot) return;

      const humanWins = getHumanWins('human');
      const decision = botDecide(freshGame, freshCurrent.id, humanWins);

      if (decision.action === 'dudo') {
        playerDudo(freshCurrent.id);
      } else {
        playerBid(freshCurrent.id, decision.bid);
      }
    }, 1000 + Math.random() * 500);
  },

  resetGame: () => set({ game: null }),
}));
