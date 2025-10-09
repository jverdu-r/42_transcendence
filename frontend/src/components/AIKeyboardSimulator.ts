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
export type KeyboardKey = 'o' | 'l' | null;  // AI usa teclas O/L para paleta derecha

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
    
    // NUEVAS PROPIEDADES ESTRATÉGICAS
    private gameHistory: Array<{ballX: number, ballY: number, ballVx: number, ballVy: number, timestamp: number}> = [];
    private opponentBehavior: {
        averageSpeed: number;
        preferredPositions: number[];
        reactionPattern: number[];
    } = { averageSpeed: 0, preferredPositions: [], reactionPattern: [] };
    
    // Estrategias adaptativas
    private aggressiveness: number = 0.5; // 0 = defensivo, 1 = agresivo
    private adaptiveStrategy: 'defensive' | 'balanced' | 'aggressive' = 'balanced';
    private consecutiveLosses: number = 0;
    private gamePerformance: { hits: number; misses: number; } = { hits: 0, misses: 0 };
    
    // Sistema de aprendizaje simple
    private learningMemory: Array<{
        ballState: BallState;
        decision: AIDecision;
        success: boolean;
        gameContext: string;
    }> = [];
    
    constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        this.difficulty = difficulty;
        this.setupDifficulty();
    }
    
    private setupDifficulty(): void {
        switch (this.difficulty) {
            case 'easy':
                this.reactionTime = 0.65; // 65% de reacción - más errores humanos
                this.accuracy = 0.55; // 55% de precisión - bastante impreciso
                this.predictionDepth = 0.8; // Predice 0.8 segundos - visión limitada
                break;
            case 'medium':
                this.reactionTime = 0.80; // 80% de reacción - algunos errores
                this.accuracy = 0.75; // 75% de precisión - ocasionalmente impreciso
                this.predictionDepth = 1.2; // Predice 1.2 segundos - buena visión
                break;
            case 'hard':
                this.reactionTime = 0.92; // 92% de reacción - muy pocos errores
                this.accuracy = 0.88; // 88% de precisión - muy preciso pero no perfecto
                this.predictionDepth = 1.8; // Predice 1.8 segundos - excelente visión
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
     * Calcula la trayectoria futura de la pelota considerando rebotes y física avanzada
     */
    private calculateBallPrediction(gameState: GameState): void {
        this.predictedBallPath = [];
        
        let ball = { ...gameState.ball };
        const timeStep = 0.016; // ~60 FPS simulation
        const maxTime = this.predictionDepth;
        
        // Registrar estado actual para análisis histórico
        this.updateGameHistory(ball);
        
        for (let t = 0; t < maxTime; t += timeStep) {
            // Simular movimiento de la pelota con física mejorada
            ball.x += ball.vx * timeStep;
            ball.y += ball.vy * timeStep;
            
            // Simular rebotes en paredes superior e inferior con realismo
            if (ball.y <= ball.radius) {
                ball.vy = Math.abs(ball.vy) * 0.98; // Pérdida de energía por rebote
                ball.y = ball.radius;
            } else if (ball.y >= gameState.canvasHeight - ball.radius) {
                ball.vy = -Math.abs(ball.vy) * 0.98; // Pérdida de energía por rebote
                ball.y = gameState.canvasHeight - ball.radius;
            }
            
            // Simular ligera fricción (más realista)
            ball.vx *= 0.9999;
            ball.vy *= 0.9999;
            
            // Guardar posición predicha con metadatos
            this.predictedBallPath.push({
                x: ball.x,
                y: ball.y,
                time: t
            });
            
            // Si la pelota alcanza la pala del AI, parar predicción
            if (ball.x >= gameState.aiPaddle.x - ball.radius) {
                break;
            }
            
            // Si la pelota sale del campo, parar predicción
            if (ball.x <= 0 || ball.x >= gameState.canvasWidth) {
                break;
            }
        }
        
        console.log(`[AI Prediction] Calculados ${this.predictedBallPath.length} puntos, profundidad: ${this.predictionDepth}s`);
    }
    
    /**
     * Actualiza el historial del juego para análisis de patrones
     */
    private updateGameHistory(ball: BallState): void {
        const now = Date.now();
        
        this.gameHistory.push({
            ballX: ball.x,
            ballY: ball.y,
            ballVx: ball.vx,
            ballVy: ball.vy,
            timestamp: now
        });
        
        // Mantener solo los últimos 10 segundos de historia
        const tenSecondsAgo = now - 10000;
        this.gameHistory = this.gameHistory.filter(entry => entry.timestamp > tenSecondsAgo);
    }
    
    /**
     * Toma una decisión basada en la predicción de trayectoria y estrategia adaptativa
     */
    private makeDecision(gameState: GameState): AIDecision {
        const aiPaddle = gameState.aiPaddle;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;
        
        // ANÁLISIS ESTRATÉGICO: Evaluar situación del juego
        const ballDirection = gameState.ball.vx > 0 ? 'towards_ai' : 'away_from_ai';
        const ballSpeed = Math.sqrt(gameState.ball.vx * gameState.ball.vx + gameState.ball.vy * gameState.ball.vy);
        const timeToReach = ballDirection === 'towards_ai' ? 
            Math.abs(aiPaddle.x - gameState.ball.x) / Math.abs(gameState.ball.vx) : Infinity;
        
        // Determinar estrategia según contexto
        this.adaptStrategy(gameState, ballDirection, timeToReach);
        
        // Encontrar el punto de intercepción predicho
        let targetY = this.calculateOptimalTarget(gameState, ballDirection, timeToReach);
        
        // Aplicar estrategia específica
        targetY = this.applyStrategicAdjustment(targetY, gameState, ballDirection);
        
        // Añadir error humano basado en dificultad y presión
        const pressureFactor = timeToReach < 0.5 ? 1.5 : 1.0; // Más errores bajo presión
        const inaccuracy = (1 - this.accuracy) * 60 * pressureFactor;
        targetY += (Math.random() - 0.5) * inaccuracy;
        
        // Calcular diferencia y umbral adaptativo
        const difference = targetY - paddleCenter;
        let threshold = this.calculateAdaptiveThreshold(gameState, ballDirection, timeToReach);
        
        console.log(`[AI Strategy] ${this.adaptiveStrategy} | Target: ${targetY.toFixed(1)} | Paddle: ${paddleCenter.toFixed(1)} | Diff: ${difference.toFixed(1)} | Threshold: ${threshold}`);
        
        if (Math.abs(difference) < threshold) {
            console.log('[AI Decision] STOP - dentro del umbral adaptativo');
            return 'stop';
        }
        
        const decision = difference > 0 ? 'down' : 'up';
        console.log(`[AI Decision] ${decision.toUpperCase()} - estrategia: ${this.adaptiveStrategy}, presión: ${pressureFactor.toFixed(1)}x`);
        
        // Registrar decisión para aprendizaje
        this.recordDecision(gameState, decision);
        
        return decision;
    }
    
    /**
     * Calcula el objetivo óptimo considerando estrategia y predicción
     */
    private calculateOptimalTarget(gameState: GameState, ballDirection: string, timeToReach: number): number {
        let targetY = gameState.ball.y; // Fallback a posición actual
        
        // Usar predicción avanzada
        for (const point of this.predictedBallPath) {
            if (point.x >= gameState.aiPaddle.x - gameState.ball.radius) {
                targetY = point.y;
                break;
            }
        }
        
        // Si la pelota se aleja, usar estrategia de posicionamiento
        if (ballDirection === 'away_from_ai') {
            targetY = this.calculatePositionalTarget(gameState);
        }
        
        return targetY;
    }
    
    /**
     * Calcula posición estratégica cuando la pelota se aleja
     */
    private calculatePositionalTarget(gameState: GameState): number {
        const canvasCenter = gameState.canvasHeight / 2;
        const ballY = gameState.ball.y;
        
        switch (this.adaptiveStrategy) {
            case 'defensive':
                // Mantener posición central con ligero bias hacia la pelota
                return canvasCenter + (ballY - canvasCenter) * 0.3;
            
            case 'balanced':
                // Posición intermedia
                return canvasCenter + (ballY - canvasCenter) * 0.5;
            
            case 'aggressive':
                // Seguir más activamente la pelota incluso cuando se aleja
                return canvasCenter + (ballY - canvasCenter) * 0.7;
                
            default:
                return canvasCenter;
        }
    }
    
    /**
     * Aplica ajustes estratégicos al objetivo
     */
    private applyStrategicAdjustment(targetY: number, gameState: GameState, ballDirection: string): number {
        const paddleHeight = gameState.aiPaddle.height;
        
        // Ajuste por agresividad: intentar devolver en ángulos específicos
        if (ballDirection === 'towards_ai' && this.adaptiveStrategy === 'aggressive') {
            // Intentar golpear desde los extremos para crear ángulos difíciles
            const paddleCenter = gameState.aiPaddle.y + paddleHeight / 2;
            const relativeHitPoint = (targetY - paddleCenter) / (paddleHeight / 2);
            
            // Exagerar el punto de impacto para crear más ángulo
            if (Math.abs(relativeHitPoint) < 0.7) {
                const sign = relativeHitPoint >= 0 ? 1 : -1;
                targetY = paddleCenter + sign * paddleHeight * 0.35;
            }
        }
        
        return targetY;
    }
    
    /**
     * Calcula umbral adaptativo basado en contexto
     */
    private calculateAdaptiveThreshold(gameState: GameState, ballDirection: string, timeToReach: number): number {
        let baseThreshold = this.difficulty === 'easy' ? 35 : 
                           this.difficulty === 'medium' ? 25 : 15;
        
        // Ajustar por estrategia
        switch (this.adaptiveStrategy) {
            case 'defensive':
                baseThreshold *= 1.3; // Más conservador
                break;
            case 'aggressive':
                baseThreshold *= 0.7; // Más reactivo
                break;
        }
        
        // Ajustar por tiempo disponible
        if (timeToReach < 0.3 && ballDirection === 'towards_ai') {
            baseThreshold *= 0.5; // Reaccionar más rápido bajo presión
        }
        
        return baseThreshold;
    }
    
    /**
     * Adapta la estrategia basada en el contexto del juego
     */
    private adaptStrategy(gameState: GameState, ballDirection: string, timeToReach: number): void {
        // Cambiar estrategia basada en rendimiento
        if (this.gamePerformance.misses > this.gamePerformance.hits * 2) {
            this.adaptiveStrategy = 'defensive';
            this.aggressiveness = Math.max(0.1, this.aggressiveness - 0.1);
        } else if (this.gamePerformance.hits > this.gamePerformance.misses * 1.5) {
            this.adaptiveStrategy = 'aggressive';
            this.aggressiveness = Math.min(0.9, this.aggressiveness + 0.1);
        } else {
            this.adaptiveStrategy = 'balanced';
        }
        
        // Ajuste por pérdidas consecutivas
        if (this.consecutiveLosses > 2) {
            this.adaptiveStrategy = 'aggressive';
            this.aggressiveness = Math.min(0.8, this.aggressiveness + 0.2);
        }
    }
    
    /**
     * Registra decisión para sistema de aprendizaje
     */
    private recordDecision(gameState: GameState, decision: AIDecision): void {
        const gameContext = `${this.adaptiveStrategy}_${gameState.ball.vx > 0 ? 'incoming' : 'outgoing'}`;
        
        this.learningMemory.push({
            ballState: {...gameState.ball},
            decision,
            success: false, // Se actualizará cuando sepamos el resultado
            gameContext
        });
        
        // Mantener memoria limitada
        if (this.learningMemory.length > 50) {
            this.learningMemory.shift();
        }
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
                keyToPress = 'o';  // Tecla O mueve paleta derecha hacia arriba
                break;
            case 'down':
                keyToPress = 'l';  // Tecla L mueve paleta derecha hacia abajo
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
        console.log(`[AI] Simulando presionar tecla: ${key}`);
        
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
        console.log(`[AI] Simulando soltar tecla: ${key}`);
        
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
            case 'o':
            case 'O':
                return 79;  // Tecla O
            case 'l':
            case 'L':
                return 76;  // Tecla L
            default:
                return 0;
        }
    }
    
    /**
     * Obtiene estadísticas de la AI para debugging
     */
    public getDebugInfo(): any {
        return {
            // Información básica
            difficulty: this.difficulty,
            reactionTime: this.reactionTime,
            accuracy: this.accuracy,
            predictionDepth: this.predictionDepth,
            lastDecision: this.lastDecision,
            currentKey: this.currentKeyPressed,
            predictedPoints: this.predictedBallPath.length,
            lastUpdate: this.lastUpdate,
            nextUpdateIn: Math.max(0, this.updateInterval - (Date.now() - this.lastUpdate)),
            
            // Información estratégica
            adaptiveStrategy: this.adaptiveStrategy,
            aggressiveness: this.aggressiveness,
            consecutiveLosses: this.consecutiveLosses,
            gamePerformance: this.gamePerformance,
            learningMemorySize: this.learningMemory.length,
            gameHistorySize: this.gameHistory.length
        };
    }
    
    /**
     * Registra el resultado de una jugada para aprendizaje
     */
    public recordPlayResult(hit: boolean, won: boolean = false): void {
        if (hit) {
            this.gamePerformance.hits++;
            this.consecutiveLosses = 0;
        } else {
            this.gamePerformance.misses++;
        }
        
        if (!won) {
            this.consecutiveLosses++;
        }
        
        // Actualizar memoria de aprendizaje
        if (this.learningMemory.length > 0) {
            const lastDecision = this.learningMemory[this.learningMemory.length - 1];
            lastDecision.success = hit;
        }
        
        console.log(`[AI Learning] Hit: ${hit}, Performance: ${this.gamePerformance.hits}/${this.gamePerformance.hits + this.gamePerformance.misses}, Strategy: ${this.adaptiveStrategy}`);
    }
    
    /**
     * Reinicia estadísticas para nuevo juego
     */
    public resetGameStats(): void {
        this.gamePerformance = { hits: 0, misses: 0 };
        this.consecutiveLosses = 0;
        this.gameHistory = [];
        this.learningMemory = [];
        this.adaptiveStrategy = 'balanced';
        this.aggressiveness = 0.5;
        
        console.log('[AI] Estadísticas reiniciadas para nuevo juego');
    }
    
    /**
     * Ajusta la dificultad dinámicamente basada en rendimiento
     */
    public adjustDifficultyDynamically(): void {
        const totalPlays = this.gamePerformance.hits + this.gamePerformance.misses;
        if (totalPlays < 10) return; // Necesita datos suficientes
        
        const successRate = this.gamePerformance.hits / totalPlays;
        
        // Si la IA está ganando demasiado, reducir habilidades
        if (successRate > 0.8) {
            this.accuracy = Math.max(0.4, this.accuracy - 0.05);
            this.reactionTime = Math.max(0.5, this.reactionTime - 0.05);
            console.log(`[AI Adaptation] Reduciendo dificultad - Success rate: ${(successRate * 100).toFixed(1)}%`);
        }
        // Si la IA está perdiendo mucho, mejorar habilidades
        else if (successRate < 0.3) {
            this.accuracy = Math.min(0.95, this.accuracy + 0.05);
            this.reactionTime = Math.min(0.95, this.reactionTime + 0.05);
            console.log(`[AI Adaptation] Aumentando dificultad - Success rate: ${(successRate * 100).toFixed(1)}%`);
        }
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
