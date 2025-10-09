/**
 * AIKeyboardSimulator - Simula entrada de teclado para cumplir con los requisitos del ejercicio
 * 
 * Requisitos del ejercicio:
 * - El AI debe simular keyboard input (no mover directamente la pala)
 * - Solo puede refrescar su vista una vez por segundo
 * - Debe anticipar rebotes y otras acciones
 */

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

export interface GameState {
    ball: BallState;
    aiPaddle: PaddleState;
    canvasWidth: number;
    canvasHeight: number;
}

export type AIDecision = 'up' | 'down' | 'stop';
export type KeyboardKey = 'ArrowUp' | 'ArrowDown' | null;

export class AIKeyboardSimulator {
    private difficulty: 'easy' | 'medium' | 'hard';
    private lastUpdate: number = 0;
    private updateInterval: number = 1000; // 1 segundo como requiere el ejercicio
    private lastDecision: AIDecision = 'stop';
    private currentKeyPressed: KeyboardKey = null;
    
    // Propiedades de dificultad
    private reactionTime: number = 0.85;
    private accuracy: number = 0.8;
    private predictionDepth: number = 1.0; // Qué tan lejos puede predecir la AI
    
    // Sistema de predicción
    private lastKnownGameState: GameState | null = null;
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
     * Este es el método principal que debe ser llamado en cada frame
     */
    public update(gameState: GameState): void {
        const now = Date.now();
        
        // RESTRICCIÓN: Solo actualizar vista una vez por segundo
        if (now - this.lastUpdate < this.updateInterval) {
            // Mantener la última decisión mientras no puede "ver"
            this.executeCurrentDecision();
            return;
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
        
        // Ejecutar la decisión
        this.executeCurrentDecision();
    }
    
    /**
     * Calcula la trayectoria futura de la pelota considerando rebotes
     */
    private calculateBallPrediction(gameState: GameState): void {
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
    private makeDecision(gameState: GameState): AIDecision {
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
     * Ejecuta la decisión actual simulando keyboard input
     */
    private executeCurrentDecision(): void {
        // Liberar tecla anterior si existe
        if (this.currentKeyPressed) {
            this.simulateKeyRelease(this.currentKeyPressed);
            this.currentKeyPressed = null;
        }
        
        // Presionar nueva tecla según decisión
        let keyToPress: KeyboardKey = null;
        
        switch (this.lastDecision) {
            case 'up':
                keyToPress = 'ArrowUp';
                break;
            case 'down':
                keyToPress = 'ArrowDown';
                break;
            case 'stop':
                // No presionar ninguna tecla
                break;
        }
        
        if (keyToPress) {
            this.simulateKeyPress(keyToPress);
            this.currentKeyPressed = keyToPress;
        }
    }
    
    /**
     * Simula presionar una tecla del teclado
     */
    private simulateKeyPress(key: string): void {
        const keydownEvent = new KeyboardEvent('keydown', {
            key: key,
            code: key,
            keyCode: this.getKeyCode(key),
            which: this.getKeyCode(key),
            bubbles: true,
            cancelable: true
        });
        
        document.dispatchEvent(keydownEvent);
    }
    
    /**
     * Simula soltar una tecla del teclado
     */
    private simulateKeyRelease(key: string): void {
        const keyupEvent = new KeyboardEvent('keyup', {
            key: key,
            code: key,
            keyCode: this.getKeyCode(key),
            which: this.getKeyCode(key),
            bubbles: true,
            cancelable: true
        });
        
        document.dispatchEvent(keyupEvent);
    }
    
    /**
     * Obtiene el código de tecla para eventos de teclado
     */
    private getKeyCode(key: string): number {
        switch (key) {
            case 'ArrowUp':
                return 38;
            case 'ArrowDown':
                return 40;
            default:
                return 0;
        }
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
            currentKey: this.currentKeyPressed,
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
     * Para la AI y libera recursos
     */
    public stop(): void {
        if (this.currentKeyPressed) {
            this.simulateKeyRelease(this.currentKeyPressed);
            this.currentKeyPressed = null;
        }
        this.lastDecision = 'stop';
    }
}
