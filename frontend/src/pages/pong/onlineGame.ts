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
import { GAME_STATE } from "./constants"
import type { GameMode } from "./index"

export class OnlineGame extends Game {
  private syncInterval: number | null = null
  private lastSyncTime = 0
  private syncRate: number = 1000 / 30 // 30 FPS sync rate
  private inputBuffer: PlayerInputData[] = []
  private isHost = false
  private opponent = ""
  private connectionLost = false

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
  }

  public initOnlineGame(matchData: MatchFoundData): void {
    this.isHost = matchData.isHost
    this.opponent = matchData.opponent

    console.log(`Online game initialized. Host: ${this.isHost}, Opponent: ${this.opponent}`)

    // Host controls the game state and physics
    if (this.isHost) {
      this.startSyncLoop()
    }

    // Initialize the game
    this.init()
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

    // Apply paddle states
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

  private showConnectionLostMessage(): void {
    // You can implement a custom message display here
    console.log("Opponent disconnected")
    alert("Opponent disconnected. Game ended.")
  }

  private showConnectionErrorMessage(error: string): void {
    console.log("Connection error:", error)
    alert(`Connection error: ${error}`)
  }

  // Override movement methods to send input to opponent
  public movePlayer1Up(): void {
    super.movePlayer1Up()
    this.sendPlayerInput()
  }

  public movePlayer1Down(): void {
    super.movePlayer1Down()
    this.sendPlayerInput()
  }

  public stopPlayer1(): void {
    super.stopPlayer1()
    this.sendPlayerInput()
  }

  public movePlayer1Paddle2Up(): void {
    super.movePlayer1Paddle2Up()
    this.sendPlayerInput()
  }

  public movePlayer1Paddle2Down(): void {
    super.movePlayer1Paddle2Down()
    this.sendPlayerInput()
  }

  public stopPlayer1Paddle2(): void {
    super.stopPlayer1Paddle2()
    this.sendPlayerInput()
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

    if (player1ScoreElement) {
      player1ScoreElement.textContent = `Player 1: ${this.score1}`
    }
    if (player2ScoreElement) {
      player2ScoreElement.textContent = `Player 2: ${this.score2}`
    }
  }

  public stop(): void {
    super.stop()

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Send game end notification
    if (this.isHost) {
      const winner = this.score1 >= 5 ? "player1" : this.score2 >= 5 ? "player2" : "none"
      onlineGameService.sendGameEnd(winner, this.score1, this.score2)
    }

    onlineGameService.disconnect()
  }

  // Override keyboard input handling for online games
  protected handleKeyboardInput(): void {
    // Only handle local player input
    if (this.isHost) {
      // Host controls player1 paddles
      this.handlePlayer1KeyboardInput()
    } else {
      // Non-host controls player2 paddles
      this.handlePlayer2KeyboardInput()
    }
  }

  private handlePlayer1KeyboardInput(): void {
    // Handle player1 input (same as original game logic)
    // This will be called by the parent class update loop
  }

  private handlePlayer2KeyboardInput(): void {
    // Handle player2 input for non-host player
    // This will be called by the parent class update loop
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
