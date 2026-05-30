# Dudos App — CLAUDE.md

## Visão geral

App mobile do jogo **Dudos** (estilo Liar's Dice / blefe com dados) para Android e iOS, construído com Expo + React Native + TypeScript.

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native (Expo Managed Workflow) |
| Linguagem | TypeScript |
| Navegação | React Navigation v6 (`@react-navigation/native-stack`) |
| Estado global | Zustand (`src/store/gameStore.ts`) |
| Persistência local | AsyncStorage (templates de regras) |
| Animações | React Native Reanimated 3 |
| Multiplayer | Socket.IO — cliente: `socket.io-client`; servidor: `socket.io` + Node.js |

## Estrutura de pastas

```
dudos-app/
├── App.tsx                        # Entry point — monta AppNavigator
├── src/
│   ├── navigation/AppNavigator.tsx  # Rotas e tipos de parâmetros (RootStackParamList)
│   ├── screens/                   # Telas
│   │   ├── HomeScreen.tsx
│   │   ├── RuleConfigScreen.tsx   # Config de regras + templates nomeados
│   │   ├── GameScreen.tsx         # Jogo local vs bots
│   │   ├── PhysicalGameScreen.tsx # Modo árbitro presencial (sem rede)
│   │   ├── RevealScreen.tsx       # Stub — revelação ocorre via RevealOverlay
│   │   ├── ResultScreen.tsx
│   │   ├── TutorialScreen.tsx
│   │   └── RulesScreen.tsx
│   ├── components/
│   │   └── RevealOverlay.tsx      # Modal de resultado após dudar (6 faces + coringa)
│   ├── bots/
│   │   └── adaptiveBot.ts         # IA adaptativa 3 níveis (Binomial CDF)
│   └── store/
│       └── gameStore.ts           # Zustand: estado do jogo + CRUD de templates
└── packages/
    └── game-core/src/
        ├── types.ts               # Tipos: RuleConfig, GameState, Bid, RevealResult, etc.
        ├── engine.ts              # Lógica pura: initGame, bid, dudo, nextRound
        └── index.ts               # Re-exporta tudo
```

## Regras do jogo implementadas

- **Modos de punição**: Vidas (começa com 3) ou Dados (começa com 5)
- **Coringa** (face 1 / ★): conta para qualquer face apostada — desativável nas regras
- **Palafico**: quando algum jogador fica com 1 dado, coringa é desativado nessa rodada
- **Resolução**: ao dudar, conta-se a face apostada + coringas (se ativos); quem apostou ou quem dudou perde 1 vida/dado
- **Tela de resultado**: lista as 6 faces separadamente; coringa em linha separada (exceto no Palafico)

## Modos de jogo

### Jogo com bots (`GameScreen`)
- 1 humano vs 1–7 bots adaptativos
- Bot começa fácil e sobe de nível conforme o humano vence
- Ações dos bots executadas com delay de ~1s via `runBotsIfNeeded()`

### Modo Físico (`PhysicalGameScreen`)
- Para grupos jogando na mesma mesa, sem rede
- O app lança os dados digitalmente; cada jogador vê os seus em privado (passa o celular)
- Apostas são feitas em voz alta — o app só registra qual aposta foi feita
- Ao dudar, o app contabiliza tudo automaticamente sem input adicional
- Funciona 100% offline

## Templates de regras

- Salvos via `AsyncStorage` com a chave `dudos_rule_templates`
- CRUD em `useGameStore`: `loadTemplates`, `saveTemplate`, `deleteTemplate`
- Carregados na abertura do `RuleConfigScreen`

## Arquitetura multiplayer

```
server/src/
├── index.ts              # Socket.IO server — eventos e handlers
├── game/
│   ├── types.ts          # Tipos server-side (espelha game-core, sem dep. mobile)
│   └── engine.ts         # Engine server-side (autoridade do estado)
└── rooms/
    └── roomManager.ts    # CRUD de salas, mapa socketId → roomCode, reconexão

src/utils/socket.ts       # Singleton do socket cliente
src/store/onlineGameStore.ts  # Zustand para estado online
src/screens/OnlineLobbyScreen.tsx  # Criar/entrar sala, lobby de espera
src/screens/OnlineGameScreen.tsx   # Jogo online (estado público, dados privados)
src/screens/OnlineResultScreen.tsx # Resultado online
```

**Fluxo de dados:**
- Servidor é **autoridade única** do estado — clientes nunca calculam resultado
- Cada cliente recebe `game:state` (público) + `game:your_dice` (privado)
- Reconexão: cliente envia `room:reconnect` com nome → servidor restaura socketId no estado

**URL do servidor:** configurável via `EXPO_PUBLIC_SERVER_URL` (padrão: `http://localhost:3001`)

## Comandos úteis

```bash
# Rodar app em desenvolvimento
npx expo start

# Rodar servidor em desenvolvimento
cd server && npm run dev

# Build Android
npx expo export --platform android

# Verificar TypeScript (app)
npx tsc --noEmit

# Verificar TypeScript (servidor)
cd server && npx tsc --noEmit
```

## Animações e sons

- **`src/components/AnimatedDie.tsx`** — dado animado (shake ao rolar, pop ao revelar) via Reanimated 4
- **`src/components/AnimatedBidBanner.tsx`** — aposta atual com entrada animada (slide + scale)
- **`src/hooks/useSoundAndHaptics.ts`** — sons via `expo-av` + vibração via `expo-haptics`
  - `rollDice`, `placeBid`, `callDudo`, `winGame`, `loseRound`
  - Sons carregados sob demanda (lazy) e cacheados em memória
- **Reanimated v4**: não usa plugin Babel — `babel.config.js` só precisa de `babel-preset-expo`

## Build de produção

**App mobile (Expo EAS):**
```bash
# Configurar projeto no Expo (requer conta expo.dev)
npx eas build:configure

# APK de preview (Android)
npx eas build --platform android --profile preview

# Build de produção
npx eas build --platform all --profile production
```
- Configuração em [`eas.json`](eas.json)
- `EXPO_PUBLIC_SERVER_URL` define a URL do servidor por perfil
- `app.json`: `bundleIdentifier` = `com.dudos.app`, `package` = `com.dudos.app`

**Servidor (Docker):**
```bash
cd server
docker build -t dudos-server .
docker run -p 3001:3001 dudos-server
```
- [`server/Dockerfile`](server/Dockerfile) — imagem Node 20 Alpine
- [`server/railway.json`](server/railway.json) — config para Railway
- [`server/render.yaml`](server/render.yaml) — config para Render (free tier)
- Health check em `GET /health`

## O que ainda falta

- [ ] Assets visuais (ícone, splash screen com tema roxo/dourado)
- [ ] Conta no Expo e `eas build:configure` para gerar `projectId`
- [ ] Credenciais Google Play / Apple Developer para submissão
- [ ] Sons com arquivos locais (assets/) para funcionar offline
