// src/pages/pong/onlineGame.ts

/**
 * Online game controller that extends the base Game class
 * Handles synchronization between players via WebSocket
 */

import { Game } from "./game"
import {
  onlineGameService,
  type GameSyncData,
  type PlayerInputData,
  type MatchFoundData,
} from "../../services/websocket"
import { GAME_STATE, PADDLE_SPEED, CANVAS_HEIGHT, PADDLE_HEIGHT, BALL_RADIUS, CANVAS_WIDTH, MAX_SCORE } from "./constants"
import type { GameMode } from "./index"

export class OnlineGame extends Game {
  private syncInterval: number | null = null
  private lastSyncTime = 0
  private syncRate: number = 1000 / 30 // 30 FPS sync rate
  private inputBuffer: PlayerInputData[] = []
  private isHost = false
  private opponent = ""
  private connectionLost = false
  protected gameStartTime = 0 // Para calcular la duración del juego

  constructor(canvas: HTMLCanvasElement, gameMode: GameMode, isMobile = false) {
    super(canvas, gameMode, "MEDIUM", isMobile)
    this.setupOnlineEventListeners()
  }

  private setupOnlineEventListeners(): void {
    onlineGameService.onGameSyncEvent((data: GameSyncData) => {
      this.handleGameSync(data)
    })

    onlineGameService.onPlayerInputEvent((data: PlayerInputData) => {
      this.handlePlayerInput(data)
    })

    onlineGameService.onOpponentDisconnectedEvent(() => {
      this.handleOpponentDisconnected()
    })

    onlineGameService.onErrorEvent((error: string) => {
      console.error("Online game error:", error)
      this.handleConnectionError(error)
    })

    onlineGameService.onGameEndEvent((data: { winner: string; score1: number; score2: number }) => {
      this.handleGameEnd(data)
    })
  }

  public initOnlineGame(matchData: MatchFoundData): void {
    this.isHost = matchData.isHost
    this.opponent = matchData.opponent
    this.gameStartTime = Date.now() // Marcar el inicio del juego

    console.log(`Online game initialized. Host: ${this.isHost}, Opponent: ${this.opponent}`)

    // Host controls the game state and physics
    if (this.isHost) {
      this.startSyncLoop()
    }

    // Initialize the game
    this.init()
    
    // Update player names display immediately
    this.updateScoreDisplay()
  }

  private startSyncLoop(): void {
    if (!this.isHost) return

    this.syncInterval = window.setInterval(() => {
      if (this.gameState === GAME_STATE.PLAYING) {
        this.sendGameState()
      }
    }, this.syncRate)
  }

  private sendGameState(): void {
    if (!this.isHost) return

    const gameData = {
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        dx: this.ball.currentDx,
        dy: this.ball.currentDy,
      },
      player1: {
        y: this.player1.y,
        paddle2Y: this.player1Paddle2?.y,
      },
      player2: {
        y: this.player2Paddle1.y,
        paddle2Y: this.player2Paddle2?.y,
      },
      score1: this.score1,
      score2: this.score2,
      gameState: this.gameState,
    }

    onlineGameService.sendGameSync(gameData)
    this.lastSyncTime = Date.now()
  }

  private handleGameSync(data: GameSyncData): void {
    // Only non-host players should apply sync data
    if (this.isHost) return

    // Apply ball state
    this.ball.x = data.ball.x
    this.ball.y = data.ball.y
    this.ball.currentDx = data.ball.dx
    this.ball.currentDy = data.ball.dy

    // Apply paddle states from guest perspective:
    // Guest is player2, so data.player1 goes to opponent (player1) and data.player2 goes to self (player2)
    this.player1.y = data.player1.y
    if (this.player1Paddle2 && data.player1.paddle2Y !== undefined) {
      this.player1Paddle2.y = data.player1.paddle2Y
    }

    this.player2Paddle1.y = data.player2.y
    if (this.player2Paddle2 && data.player2.paddle2Y !== undefined) {
      this.player2Paddle2.y = data.player2.paddle2Y
    }

    // Apply scores and game state
    this.score1 = data.score1
    this.score2 = data.score2
    this.gameState = data.gameState

    // Update score display
    this.updateScoreDisplay()
  }

  private handlePlayerInput(data: PlayerInputData): void {
    // Buffer input for smooth interpolation
    this.inputBuffer.push(data)

    // Keep only recent inputs (last 100ms)
    const cutoffTime = Date.now() - 100
    this.inputBuffer = this.inputBuffer.filter((input) => input.timestamp > cutoffTime)

    // Apply the most recent input
    this.applyPlayerInput(data)
  }

  private applyPlayerInput(data: PlayerInputData): void {
    const isOpponentInput = data.playerId !== onlineGameService.getPlayerName()

    if (isOpponentInput) {
      // Apply opponent's input to their paddles
      if (this.isHost) {
        // Host applies opponent input to player2 paddles
        this.player2Paddle1.dy = data.input.paddle1.dy
        if (this.player2Paddle2 && data.input.paddle2) {
          this.player2Paddle2.dy = data.input.paddle2.dy
        }
      } else {
        // Non-host applies opponent input to player1 paddles
        this.player1.dy = data.input.paddle1.dy
        if (this.player1Paddle2 && data.input.paddle2) {
          this.player1Paddle2.dy = data.input.paddle2.dy
        }
      }
    }
  }

  private handleOpponentDisconnected(): void {
    this.connectionLost = true
    this.gameState = GAME_STATE.GAME_OVER
    this.showConnectionLostMessage()
  }

  private handleConnectionError(error: string): void {
    this.connectionLost = true
    this.gameState = GAME_STATE.GAME_OVER
    this.showConnectionErrorMessage(error)
  }

  private handleGameEnd(data: { winner: string; score1: number; score2: number }): void {
    console.log('Game end received:', data)
    this.gameState = GAME_STATE.GAME_OVER
    this.isRunning = false
    this.score1 = data.score1
    this.score2 = data.score2
    
    // Show victory screen for both players
    setTimeout(() => this.showOnlineVictoryScreen(), 500)
  }

  private showConnectionLostMessage(): void {
    // You can implement a custom message display here
    console.log("Opponent disconnected")
    alert("Opponent disconnected. Game ended.")
  }

  private showConnectionErrorMessage(error: string): void {
    console.log("Connection error:", error)
    alert(`Connection error: ${error}`)
  }

  // Override movement methods to control appropriate paddles based on player role
  public movePlayer1Up(): void {
    if (this.isHost) {
      // Host controls Player 1 paddles (left side)
      super.movePlayer1Up()
    } else {
      // Non-host controls Player 2 paddles (right side) - control them directly
      this.player2Paddle1.dy = -PADDLE_SPEED
    }
    this.sendPlayerInput()
  }

  public movePlayer1Down(): void {
    if (this.isHost) {
      // Host controls Player 1 paddles (left side)
      super.movePlayer1Down()
    } else {
      // Non-host controls Player 2 paddles (right side) - control them directly
      this.player2Paddle1.dy = PADDLE_SPEED
    }
    this.sendPlayerInput()
  }

  public stopPlayer1(): void {
    if (this.isHost) {
      // Host stops Player 1 paddles (left side)
      super.stopPlayer1()
    } else {
      // Non-host stops Player 2 paddles (right side) - control them directly
      this.player2Paddle1.dy = 0
    }
    this.sendPlayerInput()
  }

  public movePlayer1Paddle2Up(): void {
    if (this.isHost) {
      // Host controls Player 1 second paddle (left side)
      super.movePlayer1Paddle2Up()
    } else {
      // Non-host controls Player 2 second paddle (right side) - control them directly
      if (this.player2Paddle2) {
        this.player2Paddle2.dy = -PADDLE_SPEED
      }
    }
    this.sendPlayerInput()
  }

  public movePlayer1Paddle2Down(): void {
    if (this.isHost) {
      // Host controls Player 1 second paddle (left side)
      super.movePlayer1Paddle2Down()
    } else {
      // Non-host controls Player 2 second paddle (right side) - control them directly
      if (this.player2Paddle2) {
        this.player2Paddle2.dy = PADDLE_SPEED
      }
    }
    this.sendPlayerInput()
  }

  public stopPlayer1Paddle2(): void {
    if (this.isHost) {
      // Host stops Player 1 second paddle (left side)
      super.stopPlayer1Paddle2()
    } else {
      // Non-host stops Player 2 second paddle (right side) - control them directly
      if (this.player2Paddle2) {
        this.player2Paddle2.dy = 0
      }
    }
    this.sendPlayerInput()
  }

  // Helper methods for non-host to control Player 2 paddles
  private moveRemotePlayer2Up(): void {
    if (this.gameMode === '1v2_local' || this.gameMode === '2v2_local') {
      // In multi-paddle modes, control the front paddle
      this.player2Paddle1.dy = -PADDLE_SPEED
    } else {
      // In single paddle mode, control the main paddle
      this.player2Paddle1.dy = -PADDLE_SPEED
    }
  }

  private moveRemotePlayer2Down(): void {
    if (this.gameMode === '1v2_local' || this.gameMode === '2v2_local') {
      // In multi-paddle modes, control the front paddle
      this.player2Paddle1.dy = PADDLE_SPEED
    } else {
      // In single paddle mode, control the main paddle
      this.player2Paddle1.dy = PADDLE_SPEED
    }
  }

  private stopRemotePlayer2(): void {
    this.player2Paddle1.dy = 0
  }

  private moveRemotePlayer2Paddle2Up(): void {
    if (this.player2Paddle2) {
      this.player2Paddle2.dy = -PADDLE_SPEED
    }
  }

  private moveRemotePlayer2Paddle2Down(): void {
    if (this.player2Paddle2) {
      this.player2Paddle2.dy = PADDLE_SPEED
    }
  }

  private stopRemotePlayer2Paddle2(): void {
    if (this.player2Paddle2) {
      this.player2Paddle2.dy = 0
    }
  }

  private sendPlayerInput(): void {
    const input = {
      paddle1: { dy: this.getLocalPlayerPaddle1().dy },
      paddle2: this.getLocalPlayerPaddle2() ? { dy: this.getLocalPlayerPaddle2()!.dy } : undefined,
    }

    onlineGameService.sendPlayerInput(input)
  }

  private getLocalPlayerPaddle1() {
    return this.isHost ? this.player1 : this.player2Paddle1
  }

  private getLocalPlayerPaddle2() {
    if (this.isHost) {
      return this.player1Paddle2
    } else {
      return this.player2Paddle2
    }
  }

  public startCountdown(): void {
    // Only host can start the countdown
    if (this.isHost) {
      super.startCountdown()
      onlineGameService.sendGameStart()
    }
  }

  private updateScoreDisplay(): void {
    const player1ScoreElement = document.getElementById("player1-score")
    const player2ScoreElement = document.getElementById("player2-score")

    // Get real player names
    const currentPlayerName = onlineGameService.getPlayerName()
    const opponentName = this.opponent
    
    // Determine which name goes where based on host status
    const player1Name = this.isHost ? currentPlayerName : opponentName
    const player2Name = this.isHost ? opponentName : currentPlayerName

    if (player1ScoreElement) {
      player1ScoreElement.textContent = `${player1Name}: ${this.score1}`
    }
    if (player2ScoreElement) {
      player2ScoreElement.textContent = `${player2Name}: ${this.score2}`
    }
  }

  public stop(): void {
    super.stop()

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Send game end notification with duration
    if (this.isHost) {
      const winner = this.score1 >= 5 ? "player1" : this.score2 >= 5 ? "player2" : "none"
      const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000) // Duración en segundos
      onlineGameService.sendGameEnd(winner, this.score1, this.score2, gameDuration)
    }

    onlineGameService.disconnect()
  }

  /**
   * Shows the victory screen for online games with winner info
   */
  protected showOnlineVictoryScreen(): void {
    // Check if victory overlay already exists
    let victoryOverlay = document.getElementById('victory-overlay');
    if (victoryOverlay) {
        return; // Already showing
    }

    const winnerName = this.score1 >= MAX_SCORE ? 
        (this.isHost ? "You" : this.opponent) : 
        (this.isHost ? this.opponent : "You");
    
    const winnerMessage = this.score1 >= MAX_SCORE ? 
        `🏆 ${winnerName} wins!` : 
        `🏆 ${winnerName} wins!`;

    // Create victory overlay
    victoryOverlay = document.createElement('div');
    victoryOverlay.id = 'victory-overlay';
    victoryOverlay.className = 'absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20 rounded-lg';
    
    const victoryContent = document.createElement('div');
    victoryContent.className = 'text-center p-6 bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl rounded-xl border border-[#003566] max-w-sm w-full mx-4';
    
    const victoryTitle = document.createElement('h3');
    victoryTitle.className = 'text-2xl md:text-3xl font-bold text-[#ffc300] mb-4';
    victoryTitle.textContent = winnerMessage;
    
    const scoreInfo = document.createElement('p');
    scoreInfo.className = 'text-lg text-gray-300 mb-4';
    scoreInfo.textContent = `Final Score: ${this.score1} - ${this.score2}`;
    
    const victoryButton = document.createElement('button');
    victoryButton.className = 'bg-[#ffc300] text-[#000814] py-3 px-6 rounded-lg font-semibold hover:bg-[#ffd60a] transition-colors text-base';
    victoryButton.textContent = 'Back to Game Modes';
    victoryButton.onclick = () => {
        this.stop();
        import('../../router').then(({ navigateTo }) => {
            navigateTo('/play');
        });
    };
    
    victoryContent.appendChild(victoryTitle);
    victoryContent.appendChild(scoreInfo);
    victoryContent.appendChild(victoryButton);
    victoryOverlay.appendChild(victoryContent);
    
    // Add to canvas container
    const canvasContainer = this.canvas.parentElement;
    if (canvasContainer) {
        canvasContainer.style.position = 'relative';
        canvasContainer.appendChild(victoryOverlay);
    }
  }

  // Override the base game's keyboard input to handle online player separation
  protected updateGameLogic(): void {
    // Handle countdown logic first (same as parent)
    if (this.gameState === GAME_STATE.COUNTDOWN) {
      this.countdownTimer -= (1000 / 60); // Assuming 60 FPS
      this.countdownValue = Math.ceil(this.countdownTimer / 1000);

      if (this.countdownValue <= 0) {
        this.gameState = GAME_STATE.PLAYING;
        this.countdownValue = 0;
        console.log('Countdown finished. Game state:', this.gameState);
        this.resetBall();
        this.isRunning = true;
      }

      if (this.gameState !== GAME_STATE.PLAYING) {
        return;
      }
    }

    if (this.gameState !== GAME_STATE.PLAYING) {
      return;
    }

    // Handle player movement based on role
    if (!this.isMobile) {
      this.handleOnlineKeyboardInput();
    }

    // Apply paddle movements (same as parent)
    this.player1.y += this.player1.dy;
    this.player1.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player1.y));
    if (this.player1Paddle2) {
      this.player1Paddle2.y += this.player1Paddle2.dy;
      this.player1Paddle2.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player1Paddle2.y));
    }
    this.player2Paddle1.y += this.player2Paddle1.dy;
    this.player2Paddle1.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player2Paddle1.y));
    if (this.player2Paddle2) {
      this.player2Paddle2.y += this.player2Paddle2.dy;
      this.player2Paddle2.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player2Paddle2.y));
    }

    // Only the host handles ball physics and collision detection
    if (this.isHost) {
      // Store previous ball position
      const prevBallX = this.ball.x;

      // Move the ball
      this.ball.x += this.ball.currentDx;
      this.ball.y += this.ball.currentDy;

      // Ball collision with top/bottom walls
      if (this.ball.y - BALL_RADIUS < 0 || this.ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
        this.ball.currentDy *= -1.05; // BALL_SPEED_INCREASE_FACTOR
        this.ball.currentDy = Math.sign(this.ball.currentDy) * Math.min(Math.abs(this.ball.currentDy), 15); // MAX_BALL_SPEED
      }

      // Ball collision with paddles (simplified)
      this.checkPaddleCollision(this.player1, prevBallX);
      if (this.player1Paddle2) {
        this.checkPaddleCollision(this.player1Paddle2, prevBallX);
      }
      this.checkPaddleCollision(this.player2Paddle1, prevBallX);
      if (this.player2Paddle2) {
        this.checkPaddleCollision(this.player2Paddle2, prevBallX);
      }

      // Scoring
      if (this.ball.x - BALL_RADIUS < 0) {
        this.score2++;
        this.resetBall();
      } else if (this.ball.x + BALL_RADIUS > CANVAS_WIDTH) {
        this.score1++;
        this.resetBall();
      }

      // Check for game over
      if (this.score1 >= MAX_SCORE || this.score2 >= MAX_SCORE) {
        this.gameState = GAME_STATE.GAME_OVER;
        this.isRunning = false;
        
        // Send game end notification with complete data
        const winner = this.score1 >= MAX_SCORE ? "player1" : "player2";
        const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
        onlineGameService.sendGameEnd(winner, this.score1, this.score2, gameDuration);
        
        // Show online victory screen instead of the regular one
        setTimeout(() => this.showOnlineVictoryScreen(), 500);
      }
    }
  }

  private handleOnlineKeyboardInput(): void {
    if (this.isHost) {
      // Host controls player1 paddles using standard keys
      this.handleHostKeyboardInput();
    } else {
      // Non-host controls player2 paddles but using W/S keys (like player1)
      this.handleGuestKeyboardInput();
    }
  }

  private handleHostKeyboardInput(): void {
    // Host uses the standard player1 controls
    if (this.gameMode === '2v1_online' || this.gameMode === '2v2_online') {
      // Player 1, Paddle 1 (front) - T/G
      if (this.keysPressed['t'] || this.keysPressed['T']) {
        this.player1.dy = -PADDLE_SPEED;
      } else if (this.keysPressed['g'] || this.keysPressed['G']) {
        this.player1.dy = PADDLE_SPEED;
      } else {
        this.player1.dy = 0;
      }

      // Player 1, Paddle 2 (back) - W/S
      if (this.player1Paddle2) {
        if (this.keysPressed['w'] || this.keysPressed['W']) {
          this.player1Paddle2.dy = -PADDLE_SPEED;
        } else if (this.keysPressed['s'] || this.keysPressed['S']) {
          this.player1Paddle2.dy = PADDLE_SPEED;
        } else {
          this.player1Paddle2.dy = 0;
        }
      }
    } else {
      // Single paddle mode - W/S
      if (this.keysPressed['w'] || this.keysPressed['W']) {
        this.player1.dy = -PADDLE_SPEED;
      } else if (this.keysPressed['s'] || this.keysPressed['S']) {
        this.player1.dy = PADDLE_SPEED;
      } else {
        this.player1.dy = 0;
      }
    }

    // Send input to server
    this.sendPlayerInput();
  }

  private handleGuestKeyboardInput(): void {
    // Non-host uses Arrow keys to control their paddles (which are player2 paddles on the right side)
    if (this.gameMode === '1v2_online' || this.gameMode === '2v2_online') {
      // Player 2, Paddle 1 (front) - Arrow keys (mapped to guest's front paddle)
      if (this.keysPressed['ArrowUp']) {
        this.player2Paddle1.dy = -PADDLE_SPEED;
      } else if (this.keysPressed['ArrowDown']) {
        this.player2Paddle1.dy = PADDLE_SPEED;
      } else {
        this.player2Paddle1.dy = 0;
      }

      // Player 2, Paddle 2 (back) - O/L keys
      if (this.player2Paddle2) {
        if (this.keysPressed['o'] || this.keysPressed['O']) {
          this.player2Paddle2.dy = -PADDLE_SPEED;
        } else if (this.keysPressed['l'] || this.keysPressed['L']) {
          this.player2Paddle2.dy = PADDLE_SPEED;
        } else {
          this.player2Paddle2.dy = 0;
        }
      }
    } else {
      // Single paddle mode - Arrow keys control the guest's paddle (right side)
      if (this.keysPressed['ArrowUp']) {
        this.player2Paddle1.dy = -PADDLE_SPEED;
      } else if (this.keysPressed['ArrowDown']) {
        this.player2Paddle1.dy = PADDLE_SPEED;
      } else {
        this.player2Paddle1.dy = 0;
      }
    }

    // Send input to server
    this.sendPlayerInput();
  }

  // Add missing Player 2 methods that are called from mobile controls
  public movePlayer2Up(): void {
    if (this.isHost) {
      // Host shouldn't control Player 2 directly in most cases
      // unless it's a specific game mode where host controls both
      return
    } else {
      // Guest controls Player 2 paddles - use the remote methods
      this.moveRemotePlayer2Up()
      this.sendPlayerInput()
    }
  }

  public movePlayer2Down(): void {
    if (this.isHost) {
      // Host shouldn't control Player 2 directly in most cases
      return
    } else {
      // Guest controls Player 2 paddles - use the remote methods
      this.moveRemotePlayer2Down()
      this.sendPlayerInput()
    }
  }

  public stopPlayer2(): void {
    if (this.isHost) {
      // Host shouldn't control Player 2 directly in most cases
      return
    } else {
      // Guest controls Player 2 paddles - use the remote methods
      this.stopRemotePlayer2()
      this.sendPlayerInput()
    }
  }

  public movePlayer2Paddle2Up(): void {
    if (this.isHost) {
      // Host shouldn't control Player 2 directly in most cases
      return
    } else {
      // Guest controls Player 2 second paddle - use the remote methods
      this.moveRemotePlayer2Paddle2Up()
      this.sendPlayerInput()
    }
  }

  public movePlayer2Paddle2Down(): void {
    if (this.isHost) {
      // Host shouldn't control Player 2 directly in most cases
      return
    } else {
      // Guest controls Player 2 second paddle - use the remote methods
      this.moveRemotePlayer2Paddle2Down()
      this.sendPlayerInput()
    }
  }

  public stopPlayer2Paddle2(): void {
    if (this.isHost) {
      // Host shouldn't control Player 2 directly in most cases
      return
    } else {
      // Guest controls Player 2 second paddle - use the remote methods
      this.stopRemotePlayer2Paddle2()
      this.sendPlayerInput()
    }
  }

  public getGameStatus(): {
    isOnline: boolean
    isHost: boolean
    opponent: string
    connectionLost: boolean
    lastSyncTime: number
  } {
    return {
      isOnline: true,
      isHost: this.isHost,
      opponent: this.opponent,
      connectionLost: this.connectionLost,
      lastSyncTime: this.lastSyncTime,
    }
  }
}
