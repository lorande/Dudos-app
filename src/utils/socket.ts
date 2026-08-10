import { io, Socket } from 'socket.io-client';

// Em desenvolvimento, use o IP local da sua máquina.
// Em produção, a URL do servidor deployado (definida em .env / eas.json).
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  // IMPORTANTE: reusar SEMPRE a mesma instância enquanto existir — mesmo que
  // ainda esteja conectando. Recriar o socket aqui perderia os listeners
  // registrados em connect() (era o motivo de "Criar Sala" não responder no
  // app nativo com o servidor em cold start).
  if (!socket) {
    socket = io(SERVER_URL, {
      // websocket + polling: mais robusto em redes móveis/proxies e no
      // "acordar" do servidor gratuito (Render free tier).
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // continua tentando enquanto o servidor acorda
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
