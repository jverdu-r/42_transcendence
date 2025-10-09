/**
 * Enhanced AI Player with keyboard simulation and prediction
 * Cumple con todos los requisitos del ejercicio:
 * - Simula keyboard input (no movimiento directo)
 * - Vista limitada a una vez por segundo
 * - Anticipación de rebotes y trayectorias
 */
import type { IBall, IPaddle, IGameDimensions, IPlayer } from '../interfaces/index.js';
import { AIKeyboardSimulatorBackend } from './AIKeyboardSimulatorBackend.js';

export class AIPlayer {
  private difficulty: 'easy' | 'medium' | 'hard';
  private reactionTime: number = 0.85;
  private accuracy: number = 0.8;
  private speed: number = 0.85;
  private aiSimulator: AIKeyboardSimulatorBackend;
  private lastViewUpdate: number = 0;
  private viewUpdateInterval: number = 1000; // 1 segundo como requiere el ejercicio

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.difficulty = difficulty;
    this.setupDifficulty();
    this.aiSimulator = new AIKeyboardSimulatorBackend(difficulty);
  }

  private setupDifficulty(): void {
    switch (this.difficulty) {
      case 'easy':
        this.reactionTime = 0.7; // 70% reacción
        this.accuracy = 0.6; // 60% precisión
        this.speed = 0.7; // 70% velocidad
        break;
      case 'medium':
        this.reactionTime = 0.85; // 85% reacción
        this.accuracy = 0.8; // 80% precisión
        this.speed = 0.85; // 85% velocidad
        break;
      case 'hard':
        this.reactionTime = 0.95; // 95% reacción
        this.accuracy = 0.9; // 90% precisión
        this.speed = 1.0; // 100% velocidad
        break;
    }
  }

  /**
   * NUEVO: Calcula movimiento con simulación de keyboard input
   * Requisito: AI solo puede "ver" el juego una vez por segundo
   */
  public calculateMove(
    paddle: IPaddle,
    ball: IBall,
    dimensions: IGameDimensions
  ): 'up' | 'down' | 'stop' {
    const now = Date.now();
    
    // RESTRICCIÓN: Solo actualizar vista una vez por segundo
    if (now - this.lastViewUpdate < this.viewUpdateInterval) {
      // Mantener último comando mientras no puede "ver"
      return this.aiSimulator.getCurrentMovement();
    }
    
    // Actualizar vista del juego
    this.lastViewUpdate = now;
    
    // Crear estado del juego para el simulador
    const gameState = {
      ball: {
        x: ball.x,
        y: ball.y,
        vx: ball.vx,
        vy: ball.vy,
        radius: ball.radius
      },
      aiPaddle: {
        x: paddle.x,
        y: paddle.y,
        width: paddle.width,
        height: paddle.height
      },
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height
    };
    
    // Usar simulador para calcular movimiento con predicción
    const movement = this.aiSimulator.update(gameState);
    
    // Simular tiempo de reacción humano
    if (Math.random() > this.reactionTime) {
      return 'stop';
    }
    
    return movement;
  }
  
  /**
   * NUEVO: Método que simula input de teclado
   * El AI "presiona" teclas virtuales en lugar de mover directamente la pala
   */
  public simulateKeyboardInput(
    paddle: IPaddle,
    ball: IBall,
    dimensions: IGameDimensions
  ): { key: string; action: 'press' | 'release' } | null {
    const movement = this.calculateMove(paddle, ball, dimensions);
    
    switch (movement) {
      case 'up':
        return { key: 'ArrowUp', action: 'press' };
      case 'down':
        return { key: 'ArrowDown', action: 'press' };
      case 'stop':
        return { key: 'any', action: 'release' };
      default:
        return null;
    }
  }
  
  /**
   * Obtiene información de debug del AI
   */
  public getAIDebugInfo(): any {
    return {
      difficulty: this.difficulty,
      reactionTime: this.reactionTime,
      accuracy: this.accuracy,
      speed: this.speed,
      canSeeGame: this.canUpdateView(),
      nextViewUpdate: Math.max(0, this.viewUpdateInterval - (Date.now() - this.lastViewUpdate)),
      simulatorInfo: this.aiSimulator.getDebugInfo()
    };
  }
  
  /**
   * Verifica si el AI puede actualizar su vista
   */
  public canUpdateView(): boolean {
    return (Date.now() - this.lastViewUpdate) >= this.viewUpdateInterval;
  }

  public getDifficulty(): string {
    return this.difficulty;
  }

  public setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = difficulty;
    this.setupDifficulty();
    this.aiSimulator.setDifficulty(difficulty);
  }

  public getStats(): { reactionTime: number; accuracy: number; speed: number } {
    return {
      reactionTime: this.reactionTime,
      accuracy: this.accuracy,
      speed: this.speed,
    };
  }

  public createAIPlayer(name: string, playerNumber: 1 | 2): IPlayer {
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: playerNumber,
      isAI: true,
      isConnected: true,
      name: name || `AI (${this.difficulty})`,
    };
  }
  
  /**
   * Para el AI y limpia recursos
   */
  public stop(): void {
    this.aiSimulator.stop();
  }
}
