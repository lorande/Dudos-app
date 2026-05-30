// Tipos espelhados do game-core (evita importar o pacote mobile no servidor)

export type Face = 1 | 2 | 3 | 4 | 5 | 6;
export const WILD: Face = 1;

export type PunishmentMode = 'lives' | 'dice';

export interface RuleConfig {
  punishmentMode: PunishmentMode;
  startingLives: number;
  startingDice: number;
  wildEnabled: boolean;
  palificoEnabled: boolean;
  passoEnabled: boolean;
  mesaEnabled: boolean;
  turnTimerSeconds: number | null;
  revealBetweenRounds: boolean;
}

export interface Bid {
  quantity: number;
  face: Face;
}

export interface FaceCount {
  face: Face;
  count: number;
}

export interface RevealResult {
  faceCounts: FaceCount[];
  wildCount: number;
  bidFace: Face;
  bidQuantity: number;
  effectiveCount: number;
  bidWasTrue: boolean;
  loserIds: string[];
  kind?: 'bid' | 'passo' | 'manual';
  passoWasDistinct?: boolean;
}

export type GamePhase = 'lobby' | 'bidding' | 'round_end' | 'game_over';

export interface ServerPlayer {
  id: string;       // socket.id
  name: string;
  dice: Face[];
  tableDice: Face[];
  lives: number;
  usedPasso: boolean;
  usedMesa: boolean;
  isEliminated: boolean;
}

export interface ServerGameState {
  roomCode: string;
  rules: RuleConfig;
  players: ServerPlayer[];
  currentBid: Bid | null;
  currentPlayerIndex: number;
  phase: GamePhase;
  lastReveal: RevealResult | null;
  winnerId: string | null;
  palificoActive: boolean;
  pendingPasso: { playerId: string } | null;
  roundNumber: number;
  hostId: string;
  mode: 'online' | 'physical';
}

// Eventos cliente → servidor
export interface ClientToServerEvents {
  'room:create': (payload: { name: string; rules: RuleConfig; mode: 'online' | 'physical' }) => void;
  'room:request_join': (payload: { code: string; name: string }) => void;
  'room:approve': (payload: { socketId: string }) => void;
  'room:reject': (payload: { socketId: string }) => void;
  'room:start': () => void;
  'room:reconnect': (payload: { code: string; name: string }) => void;
  'game:bid': (payload: { quantity: number; face: Face }) => void;
  'game:dudo': () => void;
  'game:passo': () => void;
  'game:dudo_passo': () => void;
  'game:mesa': (payload: { indexes: number[] }) => void;
  'game:resolve_dudo': (payload: { loserId: string }) => void;
  'game:next_round': () => void;
}

// Eventos servidor → cliente
export interface ServerToClientEvents {
  'room:created': (payload: { code: string }) => void;
  'room:joined': (payload: { code: string; players: { id: string; name: string }[] }) => void;
  'room:player_joined': (payload: { id: string; name: string }) => void;
  'room:player_left': (payload: { id: string; name: string }) => void;
  'room:pending_update': (payload: { pending: { id: string; name: string }[] }) => void;
  'room:join_result': (payload: { approved: boolean }) => void;
  'game:state': (state: PublicGameState) => void;
  'game:your_dice': (dice: Face[]) => void;
  'error': (msg: string) => void;
}

// Estado público enviado para todos (sem dados privados de outros jogadores)
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
  currentBid: Bid | null;
  currentPlayerId: string | null;
  phase: GamePhase;
  lastReveal: RevealResult | null;
  winnerId: string | null;
  palificoActive: boolean;
  pendingPasso: { playerId: string } | null;
  roundNumber: number;
  hostId: string;
  mode: 'online' | 'physical';
}
