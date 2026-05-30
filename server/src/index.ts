import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom, requestJoin, approveJoin, rejectJoin, getPending, startGame,
  performBid, performDudo, performPasso, performDudoPasso, performMesa,
  performManualDudo, performNextRound, removeSocket, getLobbyPlayers,
  reconnectToRoom, getRoomBySocket,
} from './rooms/roomManager';
import { toPublicState } from './game/engine';
import { ClientToServerEvents, ServerToClientEvents, Face } from './game/types';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 20000,
  pingInterval: 10000,
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Criar sala ──────────────────────────────────────────────────────────────
  socket.on('room:create', ({ name, rules, mode }) => {
    try {
      const code = createRoom(socket.id, name, rules, mode);
      socket.join(code);
      socket.emit('room:created', { code });
      socket.emit('room:joined', { code, players: getLobbyPlayers(code) });
      console.log(`[room:create] ${name} criou sala ${code} (${mode})`);
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Pedir entrada (vai para fila de aprovação) ───────────────────────────────
  socket.on('room:request_join', ({ code, name }) => {
    try {
      const room = requestJoin(socket.id, code, name);
      if (!room) { socket.emit('error', 'Sala não encontrada ou já iniciada'); return; }
      io.to(room.hostId).emit('room:pending_update', { pending: getPending(code) });
      console.log(`[room:request_join] ${name} pediu entrada em ${code}`);
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Aprovar jogador ──────────────────────────────────────────────────────────
  socket.on('room:approve', ({ socketId }) => {
    const room = approveJoin(socket.id, socketId);
    if (!room) return;
    const s = io.sockets.sockets.get(socketId);
    if (!s) { removeSocket(socketId); return; } // jogador desconectou antes da aprovação
    s.join(room.code);
    io.to(socketId).emit('room:join_result', { approved: true });
    io.to(room.code).emit('room:joined', { code: room.code, players: getLobbyPlayers(room.code) });
    io.to(room.hostId).emit('room:pending_update', { pending: getPending(room.code) });
  });

  // ── Recusar jogador ──────────────────────────────────────────────────────────
  socket.on('room:reject', ({ socketId }) => {
    const room = rejectJoin(socket.id, socketId);
    if (!room) return;
    io.to(socketId).emit('room:join_result', { approved: false });
    io.to(room.hostId).emit('room:pending_update', { pending: getPending(room.code) });
  });

  // ── Reconexão ───────────────────────────────────────────────────────────────
  socket.on('room:reconnect', ({ code, name }) => {
    try {
      const room = reconnectToRoom(socket.id, code, name);
      if (!room) { socket.emit('error', 'Não foi possível reconectar'); return; }
      socket.join(code);
      if (room.state) {
        socket.emit('game:state', toPublicState(room.state));
        // Envia os dados privados do jogador
        const player = room.state.players.find((p) => p.id === socket.id);
        if (player) socket.emit('game:your_dice', player.dice);
      }
      console.log(`[room:reconnect] ${name} reconectou em ${code}`);
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Iniciar partida ─────────────────────────────────────────────────────────
  socket.on('room:start', () => {
    try {
      const room = getRoomBySocket(socket.id);
      if (!room) { socket.emit('error', 'Sala não encontrada'); return; }
      if (room.hostId !== socket.id) { socket.emit('error', 'Apenas o host pode iniciar'); return; }
      const state = startGame(room.code);
      if (!state) { socket.emit('error', 'Mínimo 2 jogadores'); return; }
      // Broadcast estado público
      io.to(room.code).emit('game:state', toPublicState(state));
      // Envia dados privados para cada jogador
      for (const player of state.players) {
        io.to(player.id).emit('game:your_dice', player.dice);
      }
      console.log(`[room:start] Sala ${room.code} iniciada com ${state.players.length} jogadores`);
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Apostar ─────────────────────────────────────────────────────────────────
  socket.on('game:bid', ({ quantity, face }) => {
    try {
      const state = performBid(socket.id, quantity, face as Face);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Dudar ───────────────────────────────────────────────────────────────────
  socket.on('game:dudo', () => {
    try {
      const state = performDudo(socket.id);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Passo ───────────────────────────────────────────────────────────────────
  socket.on('game:passo', () => {
    try {
      const state = performPasso(socket.id);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Dudar o Passo ────────────────────────────────────────────────────────────
  socket.on('game:dudo_passo', () => {
    try {
      const state = performDudoPasso(socket.id);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Mesa ─────────────────────────────────────────────────────────────────────
  socket.on('game:mesa', ({ indexes }) => {
    try {
      const state = performMesa(socket.id, indexes);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
      const player = state.players.find((p) => p.id === socket.id);
      io.to(socket.id).emit('game:your_dice', player?.dice ?? []);
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Resolver Dudo manual (Modo Físico) ──────────────────────────────────────
  socket.on('game:resolve_dudo', ({ loserId }) => {
    try {
      const state = performManualDudo(socket.id, loserId);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Próxima rodada ──────────────────────────────────────────────────────────
  socket.on('game:next_round', () => {
    try {
      const currentRoom = getRoomBySocket(socket.id);
      if (!currentRoom?.state) return;
      if (currentRoom.hostId !== socket.id) return; // só host avança rodada
      const state = performNextRound(socket.id);
      io.to(state.roomCode).emit('game:state', toPublicState(state));
      // Envia novos dados privados
      for (const player of state.players) {
        if (!player.isEliminated) {
          io.to(player.id).emit('game:your_dice', player.dice);
        }
      }
    } catch (e: any) {
      socket.emit('error', e.message);
    }
  });

  // ── Desconexão ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const result = removeSocket(socket.id);
    if (result) {
      const { room, name } = result;
      io.to(room.code).emit('room:player_left', { id: socket.id, name });
      io.to(room.hostId).emit('room:pending_update', { pending: getPending(room.code) });
      console.log(`[disconnect] ${name} saiu de ${room.code}`);
    }
    console.log(`[disconnect] ${socket.id}`);
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`Dudos server rodando na porta ${PORT}`));
