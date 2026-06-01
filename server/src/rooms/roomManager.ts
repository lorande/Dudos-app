import { ServerGameState, RuleConfig } from '../game/types';
import {
  initServerGame, applyBid, applyDudo, applyNextRound,
  applyPasso, applyDudoPasso, applyMesa, applyManualDudo, applyReveal,
} from '../game/engine';

interface RoomMeta {
  code: string;
  hostId: string;
  mode: 'online' | 'physical';
  playerNames: Map<string, string>;  // aprovados (na sala)
  pending: Map<string, string>;       // aguardando aprovação
  state: ServerGameState | null;      // null = lobby
  phase: 'lobby' | 'playing';
  rules: RuleConfig;
}

const rooms = new Map<string, RoomMeta>();
// Mapeia socketId → roomCode para reconexão
const socketRoomMap = new Map<string, string>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(socketId: string, name: string, rules: RuleConfig, mode: 'online' | 'physical'): string {
  const code = generateCode();
  const playerNames = new Map<string, string>();
  playerNames.set(socketId, name);
  rooms.set(code, { code, hostId: socketId, mode, playerNames, pending: new Map(), state: null, phase: 'lobby', rules });
  socketRoomMap.set(socketId, code);
  return code;
}

export function requestJoin(socketId: string, code: string, name: string): RoomMeta | null {
  const room = rooms.get(code);
  if (!room || room.phase !== 'lobby') return null;
  // Entra na fila de aprovação do host.
  room.pending.set(socketId, name);
  socketRoomMap.set(socketId, code);
  return room;
}

export function approveJoin(hostId: string, socketId: string): RoomMeta | null {
  const room = getRoomBySocket(hostId);
  if (!room || room.hostId !== hostId) return null;
  const name = room.pending.get(socketId);
  if (name === undefined) return null;
  room.pending.delete(socketId);
  room.playerNames.set(socketId, name);
  return room;
}

export function rejectJoin(hostId: string, socketId: string): RoomMeta | null {
  const room = getRoomBySocket(hostId);
  if (!room || room.hostId !== hostId) return null;
  room.pending.delete(socketId);
  socketRoomMap.delete(socketId);
  return room;
}

export function getPending(code: string): { id: string; name: string }[] {
  const room = rooms.get(code);
  if (!room) return [];
  return [...room.pending.entries()].map(([id, name]) => ({ id, name }));
}

export function reconnectToRoom(socketId: string, code: string, name: string): RoomMeta | null {
  const room = rooms.get(code);
  if (!room) return null;
  // Procura jogador pelo nome (o socket antigo já disconnectou)
  const existingEntry = [...room.playerNames.entries()].find(([, n]) => n === name);
  if (!existingEntry) return null;
  const [oldSocketId] = existingEntry;
  // Atualiza socketId
  room.playerNames.delete(oldSocketId);
  room.playerNames.set(socketId, name);
  socketRoomMap.delete(oldSocketId);
  socketRoomMap.set(socketId, code);
  // Atualiza id no estado do jogo se já iniciado
  if (room.state) {
    const player = room.state.players.find((p) => p.id === oldSocketId);
    if (player) player.id = socketId;
    if (room.state.hostId === oldSocketId) room.state.hostId = socketId;
  }
  if (room.hostId === oldSocketId) room.hostId = socketId;
  return room;
}

export function startGame(code: string): ServerGameState | null {
  const room = rooms.get(code);
  if (!room || room.phase !== 'lobby') return null;
  const players = [...room.playerNames.entries()].map(([id, name]) => ({ id, name }));
  if (players.length < 2) return null;
  const state = initServerGame(room.rules, players, code, room.hostId, room.mode);
  room.state = state;
  room.phase = 'playing';
  return state;
}

export function getRoomBySocket(socketId: string): RoomMeta | null {
  const code = socketRoomMap.get(socketId);
  if (!code) return null;
  return rooms.get(code) ?? null;
}

export function getRoomByCode(code: string): RoomMeta | null {
  return rooms.get(code) ?? null;
}

export function performBid(
  socketId: string,
  quantity: number,
  face: 1 | 2 | 3 | 4 | 5 | 6
): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyBid(room.state, socketId, { quantity, face });
  return room.state;
}

export function performDudo(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyDudo(room.state, socketId);
  return room.state;
}

export function performNextRound(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyNextRound(room.state);
  return room.state;
}

export function performPasso(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyPasso(room.state, socketId);
  return room.state;
}

export function performDudoPasso(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyDudoPasso(room.state, socketId);
  return room.state;
}

export function performMesa(socketId: string, indexes: number[]): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyMesa(room.state, socketId, indexes);
  return room.state;
}

export function performManualDudo(socketId: string, loserId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyManualDudo(room.state, loserId);
  return room.state;
}

export function performReveal(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyReveal(room.state);
  return room.state;
}

export function removeSocket(socketId: string): { room: RoomMeta; name: string } | null {
  const code = socketRoomMap.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;
  const name = room.playerNames.get(socketId) ?? room.pending.get(socketId) ?? 'Jogador';
  socketRoomMap.delete(socketId);
  room.pending.delete(socketId);
  if (room.phase === 'lobby') {
    room.playerNames.delete(socketId);
    if (room.playerNames.size === 0) rooms.delete(code);
  }
  // Em partida: mantém o jogador para reconexão
  return { room, name };
}

export function getLobbyPlayers(code: string): { id: string; name: string }[] {
  const room = rooms.get(code);
  if (!room) return [];
  return [...room.playerNames.entries()].map(([id, name]) => ({ id, name }));
}
