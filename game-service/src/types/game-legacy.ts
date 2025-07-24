// Legacy types - use interfaces from ../interfaces/ for new code

export type Player = {
  id: string;
  number: 1 | 2;
  isAI: boolean;
  isConnected: boolean;
  name?: string;
};

export type GameMessage = {
  type: 
    | 'connection' 
    | 'gameCreated' 
    | 'gameJoined' 
    | 'gameState' 
    | 'score' 
    | 'gameEnd' 
    | 'countdown' 
    | 'error' 
    | 'playerMove' 
    | 'playerJoined' 
    | 'gameStarted' 
    | 'gamesList' 
    | 'playerLeft' 
    | 'gameLeft' 
    | 'playerDisconnected';
  data?: any;
  gameId?: string;
  playerId?: string;
};

export type PlayerInput = {
  type: 'move' | 'pause' | 'resume';
  direction?: 'up' | 'down' | 'stop';
  playerId: string;
  gameId: string;
};

export type GameMode = 'pvp' | 'pve' | 'multiplayer' | 'tournament';
