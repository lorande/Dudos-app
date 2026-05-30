import { create } from 'zustand';
import { getSocket, disconnectSocket } from '../utils/socket';
import { Face, RuleConfig } from '../../packages/game-core/src';

export interface PublicPlayer {
  id: string;
  name: string;
  diceCount: number;
  lives: number;
  isEliminated: boolean;
}

export interface PublicGameState {
  roomCode: string;
  rules: RuleConfig;
  players: PublicPlayer[];
  currentBid: { quantity: number; face: Face } | null;
  currentPlayerId: string | null;
  phase: string;
  lastReveal: any | null;
  winnerId: string | null;
  palificoActive: boolean;
  roundNumber: number;
  hostId: string;
}

interface OnlineGameStore {
  roomCode: string | null;
  myName: string;
  mySocketId: string | null;
  myDice: Face[];
  lobbyPlayers: { id: string; name: string }[];
  game: PublicGameState | null;
  error: string | null;
  connected: boolean;

  connect: () => void;
  createRoom: (name: string, rules: RuleConfig) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: () => void;
  bid: (quantity: number, face: Face) => void;
  dudo: () => void;
  nextRound: () => void;
  disconnect: () => void;
  clearError: () => void;
}

export const useOnlineGameStore = create<OnlineGameStore>((set, get) => ({
  roomCode: null,
  myName: '',
  mySocketId: null,
  myDice: [],
  lobbyPlayers: [],
  game: null,
  error: null,
  connected: false,

  connect: () => {
    const socket = getSocket();
    set({ mySocketId: socket.id, connected: socket.connected });

    socket.on('connect', () => set({ connected: true, mySocketId: socket.id }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('room:created', ({ code }) => set({ roomCode: code }));
    socket.on('room:joined', ({ code, players }) =>
      set({ roomCode: code, lobbyPlayers: players })
    );
    socket.on('room:player_joined', (player) =>
      set((s) => ({ lobbyPlayers: [...s.lobbyPlayers, player] }))
    );
    socket.on('room:player_left', ({ id }) =>
      set((s) => ({ lobbyPlayers: s.lobbyPlayers.filter((p) => p.id !== id) }))
    );
    socket.on('game:state', (state) => set({ game: state as PublicGameState }));
    socket.on('game:your_dice', (dice) => set({ myDice: dice }));
    socket.on('error', (msg) => set({ error: msg }));
  },

  createRoom: (name, rules) => {
    set({ myName: name });
    const socket = getSocket();
    socket.emit('room:create', { name, rules });
  },

  joinRoom: (code, name) => {
    set({ myName: name });
    const socket = getSocket();
    socket.emit('room:join', { code: code.toUpperCase(), name });
  },

  startGame: () => getSocket().emit('room:start'),

  bid: (quantity, face) => getSocket().emit('game:bid', { quantity, face }),

  dudo: () => getSocket().emit('game:dudo'),

  nextRound: () => getSocket().emit('game:next_round'),

  disconnect: () => {
    disconnectSocket();
    set({ roomCode: null, myDice: [], lobbyPlayers: [], game: null, connected: false });
  },

  clearError: () => set({ error: null }),
}));
