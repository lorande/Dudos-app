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
}

export type GamePhase = 'lobby' | 'bidding' | 'round_end' | 'game_over';

export interface ServerPlayer {
  id: string;       // socket.id
  name: string;
  dice: Face[];
  lives: number;
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
  roundNumber: number;
  hostId: string;
}

// Eventos cliente → servidor
export interface ClientToServerEvents {
  'room:create': (payload: { name: string; rules: RuleConfig }) => void;
  'room:join': (payload: { code: string; name: string }) => void;
  'room:start': () => void;
  'game:bid': (payload: { quantity: number; face: Face }) => void;
  'game:dudo': () => void;
  'game:next_round': () => void;
  'room:reconnect': (payload: { code: string; name: string }) => void;
}

// Eventos servidor → cliente
export interface ServerToClientEvents {
  'room:created': (payload: { code: string }) => void;
  'room:joined': (payload: { code: string; players: { id: string; name: string }[] }) => void;
  'room:player_joined': (payload: { id: string; name: string }) => void;
  'room:player_left': (payload: { id: string; name: string }) => void;
  'game:state': (state: PublicGameState) => void;
  'game:your_dice': (dice: Face[]) => void;
  'error': (msg: string) => void;
}

// Estado público enviado para todos (sem dados privados de outros jogadores)
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
  currentBid: Bid | null;
  currentPlayerId: string | null;
  phase: GamePhase;
  lastReveal: RevealResult | null;
  winnerId: string | null;
  palificoActive: boolean;
  roundNumber: number;
  hostId: string;
}
