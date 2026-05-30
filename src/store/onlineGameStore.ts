import { create } from 'zustand';
import { getSocket, disconnectSocket } from '../utils/socket';
import { Face, RuleConfig } from '../../packages/game-core/src';

export type RoomMode = 'online' | 'physical';

export interface PublicPlayer {
  id: string;
  name: string;
  diceCount: number;
  tableDice: Face[];
  lives: number;
  usedPasso: boolean;
  usedMesa: boolean;
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
  pendingPasso: { playerId: string } | null;
  roundNumber: number;
  hostId: string;
  mode: RoomMode;
}

type JoinStatus = 'idle' | 'waiting' | 'approved' | 'rejected';

interface OnlineGameStore {
  roomCode: string | null;
  myName: string;
  mySocketId: string | null;
  myDice: Face[];
  lobbyPlayers: { id: string; name: string }[];
  pending: { id: string; name: string }[];
  joinStatus: JoinStatus;
  game: PublicGameState | null;
  error: string | null;
  connected: boolean;

  connect: () => void;
  createRoom: (name: string, rules: RuleConfig, mode: RoomMode) => void;
  requestJoin: (code: string, name: string) => void;
  approve: (socketId: string) => void;
  reject: (socketId: string) => void;
  startGame: () => void;
  bid: (quantity: number, face: Face) => void;
  dudo: () => void;
  passo: () => void;
  dudoPasso: () => void;
  mesa: (indexes: number[]) => void;
  resolveDudo: (loserId: string) => void;
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
  pending: [],
  joinStatus: 'idle',
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
      set({ roomCode: code, lobbyPlayers: players, joinStatus: 'approved' })
    );
    socket.on('room:player_joined', (player) =>
      set((s) => ({ lobbyPlayers: [...s.lobbyPlayers, player] }))
    );
    socket.on('room:player_left', ({ id }) =>
      set((s) => ({ lobbyPlayers: s.lobbyPlayers.filter((p) => p.id !== id) }))
    );
    socket.on('room:pending_update', ({ pending }) => set({ pending }));
    socket.on('room:join_result', ({ approved }) =>
      set({ joinStatus: approved ? 'approved' : 'rejected' })
    );
    socket.on('game:state', (state) => set({ game: state as PublicGameState }));
    socket.on('game:your_dice', (dice) => set({ myDice: dice }));
    socket.on('error', (msg) => set({ error: msg }));
  },

  createRoom: (name, rules, mode) => {
    set({ myName: name });
    getSocket().emit('room:create', { name, rules, mode });
  },

  requestJoin: (code, name) => {
    set({ myName: name, joinStatus: 'waiting' });
    getSocket().emit('room:request_join', { code: code.toUpperCase(), name });
  },

  approve: (socketId) => getSocket().emit('room:approve', { socketId }),
  reject: (socketId) => getSocket().emit('room:reject', { socketId }),

  startGame: () => getSocket().emit('room:start'),

  bid: (quantity, face) => getSocket().emit('game:bid', { quantity, face }),
  dudo: () => getSocket().emit('game:dudo'),
  passo: () => getSocket().emit('game:passo'),
  dudoPasso: () => getSocket().emit('game:dudo_passo'),
  mesa: (indexes) => getSocket().emit('game:mesa', { indexes }),
  resolveDudo: (loserId) => getSocket().emit('game:resolve_dudo', { loserId }),
  nextRound: () => getSocket().emit('game:next_round'),

  disconnect: () => {
    disconnectSocket();
    set({ roomCode: null, myDice: [], lobbyPlayers: [], pending: [], joinStatus: 'idle', game: null, connected: false });
  },

  clearError: () => set({ error: null }),
}));
