/**
 * AI Keyboard Simulator para Backend
 * Simula entrada de teclado para cumplir con los requisitos del ejercicio
 * 
 * Requisitos del ejercicio:
 * - El AI debe simular keyboard input (no mover directamente la pala)
 * - Solo puede refrescar su vista una vez por segundo
 * - Debe anticipar rebotes y otras acciones
 */

import type { IBall, IPaddle, IGameDimensions } from '../interfaces/index.js';

export interface BallState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export interface PaddleState {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface GameStateAI {
    ball: BallState;
    aiPaddle: PaddleState;
    canvasWidth: number;
    canvasHeight: number;
}

export type AIDecision = 'up' | 'down' | 'stop';
export type MovementCommand = 'up' | 'down' | 'stop';

export class AIKeyboardSimulatorBackend {
    private difficulty: 'easy' | 'medium' | 'hard';
    private lastUpdate: number = 0;
    private updateInterval: number = 1000; // 1 segundo como requiere el ejercicio
    private lastDecision: AIDecision = 'stop';
    private currentMovement: MovementCommand = 'stop';
    
    // Propiedades de dificultad
    private reactionTime: number = 0.85;
    private accuracy: number = 0.8;
    private predictionDepth: number = 1.0; // Qué tan lejos puede predecir la AI
    
    // Sistema de predicción
    private lastKnownGameState: GameStateAI | null = null;
    private predictedBallPath: Array<{x: number, y: number, time: number}> = [];
    
    constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        this.difficulty = difficulty;
        this.setupDifficulty();
    }
    
    private setupDifficulty(): void {
        switch (this.difficulty) {
            case 'easy':
                this.reactionTime = 0.7; // 70% de reacción
                this.accuracy = 0.6; // 60% de precisión
                this.predictionDepth = 0.5; // Predice 0.5 segundos
                break;
            case 'medium':
                this.reactionTime = 0.85; // 85% de reacción
                this.accuracy = 0.8; // 80% de precisión
                this.predictionDepth = 1.0; // Predice 1 segundo
                break;
            case 'hard':
                this.reactionTime = 0.95; // 95% de reacción
                this.accuracy = 0.9; // 90% de precisión
                this.predictionDepth = 1.5; // Predice 1.5 segundos
                break;
        }
    }
    
    /**
     * Actualiza la vista del AI - SOLO UNA VEZ POR SEGUNDO
     * Retorna el comando de movimiento que debe ejecutarse
     */
    public update(gameState: GameStateAI): MovementCommand {
        const now = Date.now();
        
        // RESTRICCIÓN: Solo actualizar vista una vez por segundo
        if (now - this.lastUpdate < this.updateInterval) {
            // Mantener la última decisión mientras no puede "ver"
            return this.currentMovement;
        }
        
        // Actualizar conocimiento del juego
        this.lastKnownGameState = { ...gameState };
        this.lastUpdate = now;
        
        // Generar predicción de trayectoria
        this.calculateBallPrediction(gameState);
        
        // Tomar decisión basada en predicción
        const decision = this.makeDecision(gameState);
        
        // Simular tiempo de reacción humano
        if (Math.random() > this.reactionTime) {
            this.lastDecision = 'stop';
        } else {
            this.lastDecision = decision;
        }
        
        // Convertir decisión a comando de movimiento
        this.currentMovement = this.lastDecision;
        
        return this.currentMovement;
    }
    
    /**
     * Calcula la trayectoria futura de la pelota considerando rebotes
     */
    private calculateBallPrediction(gameState: GameStateAI): void {
        this.predictedBallPath = [];
        
        let ball = { ...gameState.ball };
        const timeStep = 0.016; // ~60 FPS simulation
        const maxTime = this.predictionDepth;
        
        for (let t = 0; t < maxTime; t += timeStep) {
            // Simular movimiento de la pelota
            ball.x += ball.vx * timeStep;
            ball.y += ball.vy * timeStep;
            
            // Simular rebotes en paredes superior e inferior
            if (ball.y <= ball.radius || ball.y >= gameState.canvasHeight - ball.radius) {
                ball.vy = -ball.vy;
                ball.y = Math.max(ball.radius, Math.min(gameState.canvasHeight - ball.radius, ball.y));
            }
            
            // Guardar posición predicha
            this.predictedBallPath.push({
                x: ball.x,
                y: ball.y,
                time: t
            });
            
            // Si la pelota alcanza la pala del AI, parar predicción
            if (ball.x >= gameState.aiPaddle.x - ball.radius) {
                break;
            }
        }
    }
    
    /**
     * Toma una decisión basada en la predicción de trayectoria
     */
    private makeDecision(gameState: GameStateAI): AIDecision {
        const aiPaddle = gameState.aiPaddle;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;
        
        // Encontrar el punto de intercepción predicho
        let targetY = gameState.ball.y; // Fallback a posición actual
        
        // Buscar punto de intercepción en la predicción
        for (const point of this.predictedBallPath) {
            if (point.x >= aiPaddle.x - gameState.ball.radius) {
                targetY = point.y;
                break;
            }
        }
        
        // Añadir imprecisión basada en dificultad
        const inaccuracy = (1 - this.accuracy) * 50;
        targetY += (Math.random() - 0.5) * inaccuracy;
        
        // Calcular diferencia y umbral
        const difference = targetY - paddleCenter;
        const threshold = this.difficulty === 'easy' ? 30 : 
                         this.difficulty === 'medium' ? 20 : 10;
        
        if (Math.abs(difference) < threshold) {
            return 'stop';
        }
        
        return difference > 0 ? 'down' : 'up';
    }
    
    /**
     * Obtiene estadísticas de la AI para debugging
     */
    public getDebugInfo(): any {
        return {
            difficulty: this.difficulty,
            reactionTime: this.reactionTime,
            accuracy: this.accuracy,
            predictionDepth: this.predictionDepth,
            lastDecision: this.lastDecision,
            currentMovement: this.currentMovement,
            predictedPoints: this.predictedBallPath.length,
            lastUpdate: this.lastUpdate,
            nextUpdateIn: Math.max(0, this.updateInterval - (Date.now() - this.lastUpdate))
        };
    }
    
    /**
     * Cambia la dificultad en tiempo real
     */
    public setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
        this.difficulty = difficulty;
        this.setupDifficulty();
    }
    
    /**
     * Para la AI y resetea estado
     */
    public stop(): void {
        this.currentMovement = 'stop';
        this.lastDecision = 'stop';
    }
    
    /**
     * Obtiene el comando actual de movimiento
     */
    public getCurrentMovement(): MovementCommand {
        return this.currentMovement;
    }
    
    /**
     * Verifica si puede actualizar (para debugging)
     */
    public canUpdate(): boolean {
        return (Date.now() - this.lastUpdate) >= this.updateInterval;
    }
}
