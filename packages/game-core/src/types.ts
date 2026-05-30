export type Face = 1 | 2 | 3 | 4 | 5 | 6;
export const WILD: Face = 1; // face 1 (estrela/coringa) no dado padrão de Liar's Dice

export const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;
export const FACE_NAMES = ['', 'Bico', 'Duque', 'Terno', 'Quadra', 'Quina', 'Sena'] as const;

export type PunishmentMode = 'lives' | 'dice';

export interface RuleConfig {
  punishmentMode: PunishmentMode;
  startingLives: number;   // usado se punishmentMode === 'lives'
  startingDice: number;    // usado se punishmentMode === 'dice'
  wildEnabled: boolean;    // coringa (face 1) conta para qualquer face
  palificoEnabled: boolean; // variante palafico
  passoEnabled: boolean;    // regra especial Passo
  mesaEnabled: boolean;     // regra especial Mesa
  turnTimerSeconds: number | null; // null = sem timer
  revealBetweenRounds: boolean;
}

export const DEFAULT_RULES: RuleConfig = {
  punishmentMode: 'dice',
  startingLives: 3,
  startingDice: 5,
  wildEnabled: true,
  palificoEnabled: true,
  passoEnabled: true,
  mesaEnabled: true,
  turnTimerSeconds: null,
  revealBetweenRounds: false,
};

export interface Bid {
  quantity: number;
  face: Face;
}

export interface PlayerState {
  id: string;
  name: string;
  dice: Face[];       // dados atuais (ocultos dos outros jogadores)
  tableDice: Face[];   // dados públicos na mesa (regra Mesa)
  usedPasso: boolean;  // reset a cada rodada
  usedMesa: boolean;   // reset a cada rodada
  lives: number;      // se punishmentMode === 'lives'
  isBot: boolean;
  isEliminated: boolean;
}

export interface FaceCount {
  face: Face;
  count: number;
}

export interface RevealResult {
  faceCounts: FaceCount[]; // sempre as 6 faces
  wildCount: number;        // contagem separada do coringa (face 1), 0 se wild desativado ou palafico ativo
  bidFace: Face;
  bidQuantity: number;
  effectiveCount: number;   // faceCounts[bidFace] + wildCount (se aplicável)
  bidWasTrue: boolean;
  loserIds: string[];
  kind?: 'bid' | 'passo' | 'manual'; // default 'bid'
  passoWasDistinct?: boolean;        // só quando kind === 'passo'
}

export type GamePhase =
  | 'lobby'
  | 'rolling'
  | 'bidding'
  | 'challenged'
  | 'round_end'
  | 'game_over';

export interface GameState {
  rules: RuleConfig;
  players: PlayerState[];
  currentBid: Bid | null;
  currentPlayerIndex: number;
  phase: GamePhase;
  lastReveal: RevealResult | null;
  winnerId: string | null;
  palificoActive: boolean; // true quando algum jogador com 1 dado está na rodada
  pendingPasso: { playerId: string } | null; // Passo aguardando possível Dudo
  roundNumber: number;
}
