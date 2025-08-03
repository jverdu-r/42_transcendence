/**
 * Unified Game Manager - Enhanced game session management
 */
import { UnifiedGame } from './unified-game.js';
import type { PlayerNumber } from '../interfaces/game-interfaces.js';
import type { IPlayer, IGameConfig, IGameDimensions, GameMode } from '../interfaces/index.js';
import { GameConfig } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

export class UnifiedGameManager {
    private games: Map<string, UnifiedGame>;
    private waitingPlayers: Map<string, IPlayer>;
    private defaultConfig: IGameConfig;
    private defaultDimensions: IGameDimensions;
    private broadcastCallback?: (gameId: string, message: any) => void;

    constructor() {
        this.games = new Map();
        this.waitingPlayers = new Map();
        this.defaultConfig = GameConfig.getDefaultConfig();
        this.defaultDimensions = GameConfig.getDefaultDimensions();
    }

    public setBroadcastCallback(callback: (gameId: string, message: any) => void): void {
        this.broadcastCallback = callback;
    }

    public createGame(playerName: string, mode: GameMode = 'pvp', aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium'): string {
        const gameId = uuidv4();
        const gameName = `Game ${gameId.substring(0, 8)}`;
        
        const game = new UnifiedGame(
            gameName,
            this.defaultDimensions,
            this.defaultConfig
        );

        const player: IPlayer = {
            id: uuidv4(),
            number: 1,
            isAI: false,
            isConnected: true,
            name: playerName,
        };

        game.setId(gameId);
        game.setMode(mode === 'pve' ? 'pve' : 'pvp', aiDifficulty);
        game.addPlayer(player);

        // If PvE mode, add AI player
        if (mode === 'pve') {
            const aiPlayer: IPlayer = {
                id: uuidv4(),
                number: 2,
                isAI: true,
                isConnected: true,
                name: `AI (${aiDifficulty})`,
            };
            game.addPlayer(aiPlayer);
        }

        this.games.set(gameId, game);

        // Set up game state broadcast
        this.setupGameBroadcast(gameId);

        console.log(`✅ Game created: ${gameId} by ${playerName} (${mode} mode)`);
        return gameId;
    }

    private setupGameBroadcast(gameId: string): void {
        const game = this.games.get(gameId);
        if (!game || !this.broadcastCallback) return;

        // Set up periodic game state broadcast when game is running
        const broadcastInterval = setInterval(() => {
            if (!this.games.has(gameId)) {
                clearInterval(broadcastInterval);
                return;
            }

            const currentGame = this.games.get(gameId);
            if (!currentGame || currentGame.getStatus() !== 'playing') {
                return;
            }

            const gameState = currentGame.getFullGameState();
            if (this.broadcastCallback) {
                this.broadcastCallback(gameId, {
                    type: 'gameState',
                    data: { gameState }
                });
            }
        }, 1000 / 60); // 60 FPS broadcast rate

        // Clean up interval when game is removed
        const originalRemove = this.removeGame.bind(this);
        this.removeGame = (id: string) => {
            if (id === gameId) {
                clearInterval(broadcastInterval);
            }
            return originalRemove(id);
        };
    }

    public joinGame(gameId: string, playerName: string): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found: ${gameId}`);
            return false;
        }

        // Check if game is already full
        if (game.getPlayers().length >= 2) {
            console.log(`❌ Game ${gameId} is full`);
            return false;
        }

        const players = game.getPlayers();
        // Enforce: Host is always player 1, next join is always player 2
        let joiningPlayerNumber: PlayerNumber = 2;
        if (players.length === 1 && players[0].number === 2) {
            // If for any reason player 2 got in first, force join as 1
            joiningPlayerNumber = 1;
            players[0].number = 2;
        }

        try {
            const player: IPlayer = {
                id: uuidv4(),
                number: joiningPlayerNumber,
                isAI: false,
                isConnected: true,
                name: playerName,
            };

            const success = game.addPlayer(player);
            if (success) {
                console.log(`✅ Player ${playerName} joined game ${gameId} as player #${joiningPlayerNumber}`);
                
                // Notify about player join
                this.broadcastCallback?.(gameId, {
                    type: 'playerJoined',
                    data: { playerName, playerNumber: joiningPlayerNumber }
                });

                return true;
            } else {
                console.log(`❌ Failed to add player to game ${gameId}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Failed to join game ${gameId}: ${error}`);
            return false;
        }
    }

    public startGame(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found: ${gameId}`);
            return false;
        }

        try {
            const success = game.start();
            if (success) {
                console.log(`🎮 Game started: ${gameId}`);
                
                // Notify about game start
                this.broadcastCallback?.(gameId, {
                    type: 'gameStarted',
                    data: { gameId }
                });

                return true;
            } else {
                console.log(`❌ Cannot start game ${gameId}: insufficient players`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Failed to start game ${gameId}: ${error}`);
            return false;
        }
    }

    public pauseGame(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found: ${gameId}`);
            return false;
        }

        try {
            game.pause();
            console.log(`⏸️ Game paused: ${gameId}`);
            
            // Notify about game pause
            this.broadcastCallback?.(gameId, {
                type: 'gamePaused',
                data: { gameId }
            });

            return true;
        } catch (error) {
            console.log(`❌ Failed to pause game ${gameId}: ${error}`);
            return false;
        }
    }

    public resumeGame(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found: ${gameId}`);
            return false;
        }

        try {
            game.resume();
            console.log(`▶️ Game resumed: ${gameId}`);
            
            // Notify about game resume
            this.broadcastCallback?.(gameId, {
                type: 'gameResumed',
                data: { gameId }
            });

            return true;
        } catch (error) {
            console.log(`❌ Failed to resume game ${gameId}: ${error}`);
            return false;
        }
    }

    public stopGame(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found: ${gameId}`);
            return false;
        }

        try {
            game.stop();
            console.log(`⏸️ Game stopped: ${gameId}`);
            
            // Notify about game end
            const gameState = game.getFullGameState();
            const winner = gameState.score.left > gameState.score.right ? 
                (game.getPlayers()[0]?.name || 'Player 1') : 
                (game.getPlayers()[1]?.name || 'Player 2');

            this.broadcastCallback?.(gameId, {
                type: 'gameEnded',
                data: { 
                    gameId, 
                    winner,
                    score: gameState.score,
                    finalStats: {
                        duration: Date.now() - gameState.lastUpdate,
                        rallies: gameState.rallieCount
                    }
                }
            });

            return true;
        } catch (error) {
            console.log(`❌ Failed to stop game ${gameId}: ${error}`);
            return false;
        }
    }

    public removeGame(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found: ${gameId}`);
            return false;
        }

        game.stop();
        this.games.delete(gameId);
        console.log(`🗑️ Game removed: ${gameId}`);
        return true;
    }

    public handlePlayerInput(gameId: string, playerId: string, input: any): boolean {
        const game = this.games.get(gameId);
        if (!game) {
            console.log(`❌ Game not found for input: ${gameId}`);
            return false;
        }

        try {
            game.handlePlayerInput(playerId, input);
            return true;
        } catch (error) {
            console.log(`❌ Failed to handle player input: ${error}`);
            return false;
        }
    }

    public getGame(gameId: string): UnifiedGame | undefined {
        return this.games.get(gameId);
    }

    public getAllGames(): UnifiedGame[] {
        return Array.from(this.games.values());
    }

    public getGameCount(): number {
        return this.games.size;
    }

    public getActiveGames(): UnifiedGame[] {
        return this.getAllGames().filter(game => game.getStatus() === 'playing');
    }

    public getWaitingGames(): UnifiedGame[] {
        return this.getAllGames().filter(game => game.getStatus() === 'waiting');
    }

    public getPausedGames(): UnifiedGame[] {
        return this.getAllGames().filter(game => game.getStatus() === 'paused');
    }

    public getGameStats(gameId: string): any {
        const game = this.games.get(gameId);
        if (!game) return null;

        const gameState = game.getFullGameState();
        return {
            id: gameId,
            players: game.getPlayers(),
            score: gameState.score,
            status: game.getStatus(),
            rallies: gameState.rallieCount,
            duration: Date.now() - gameState.lastUpdate
        };
    }

    public cleanup(): void {
        this.games.forEach(game => game.stop());
        this.games.clear();
        this.waitingPlayers.clear();
        console.log('🧹 UnifiedGameManager cleaned up');
    }
}
