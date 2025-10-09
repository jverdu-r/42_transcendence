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
    
    // PROPIEDADES PARA COMPORTAMIENTO HUMANO REALISTA
    private gameHistory: Array<{ballX: number, ballY: number, ballVx: number, ballVy: number, timestamp: number}> = [];
    private opponentBehavior: {
        averageSpeed: number;
        preferredPositions: number[];
        reactionPattern: number[];
    } = { averageSpeed: 0, preferredPositions: [], reactionPattern: [] };
    
    // Estados emocionales humanos que afectan el rendimiento
    private emotionalState: {
        confidence: number;      // 0-1: Baja confianza = más errores
        frustration: number;     // 0-1: Alta frustración = decisiones impulsivas
        focus: number;           // 0-1: Poca concentración = lapsos
        fatigue: number;         // 0-1: Cansancio mental = reacciones más lentas
        pressure: number;        // 0-1: Presión = nerviosismo
    } = { confidence: 0.7, frustration: 0.2, focus: 0.8, fatigue: 0.1, pressure: 0.3 };
    
    // Características humanas individuales
    private humanTraits!: {
        reflexSpeed: number;           // Velocidad natural de reflejos
        handEyeCoordination: number;   // Coordinación mano-ojo
        anticipationSkill: number;     // Habilidad de anticipación
        pressureHandling: number;      // Manejo bajo presión
        learning_rate: number;         // Qué tan rápido aprende de errores
        preferredStrategy: 'aggressive' | 'defensive' | 'adaptive';
        personalityType: 'risk_taker' | 'cautious' | 'balanced';
    };
    
    // Patrones de comportamiento humano
    private behaviorPatterns!: {
        reactionTimeVariability: number;  // Cuánto varían los tiempos de reacción
        concentrationSpans: number[];     // Períodos de alta/baja concentración
        mistakeRecoveryTime: number;      // Tiempo para recuperarse de errores
        currentConcentrationLevel: number;
        lastConcentrationChange: number;
    };
    
    // Sistema de errores humanos realistas
    private humanErrors: {
        overthinking: boolean;          // Sobrepensar y perder la oportunidad
        earlyCommitment: boolean;       // Comprometerse muy temprano
        lateReaction: boolean;          // Reaccionar tarde
        overcompensation: boolean;      // Sobrecompensar después de error
        panicMode: boolean;             // Modo pánico cuando está perdiendo
    } = { overthinking: false, earlyCommitment: false, lateReaction: false, overcompensation: false, panicMode: false };
    
    // Estrategias adaptativas
    private aggressiveness: number = 0.5; // 0 = defensivo, 1 = agresivo
    private adaptiveStrategy: 'defensive' | 'balanced' | 'aggressive' = 'balanced';
    private consecutiveLosses: number = 0;
    private gamePerformance: { hits: number; misses: number; } = { hits: 0, misses: 0 };
    
    // Sistema de aprendizaje humano (no perfecto)
    private learningMemory: Array<{
        ballState: BallState;
        decision: AIDecision;
        success: boolean;
        gameContext: string;
        emotionalContext: any;
    }> = [];
    
    constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        this.difficulty = difficulty;
        this.initializeHumanTraits();
        this.initializeBehaviorPatterns();
        this.setupDifficulty();
    }
    
    private initializeHumanTraits(): void {
        // Generar características humanas únicas para esta instancia de IA
        this.humanTraits = {
            reflexSpeed: 0.6 + Math.random() * 0.3,           // 0.6-0.9
            handEyeCoordination: 0.5 + Math.random() * 0.4,   // 0.5-0.9
            anticipationSkill: 0.4 + Math.random() * 0.5,     // 0.4-0.9
            pressureHandling: 0.3 + Math.random() * 0.6,      // 0.3-0.9
            learning_rate: 0.1 + Math.random() * 0.3,         // 0.1-0.4
            preferredStrategy: Math.random() < 0.33 ? 'aggressive' : 
                             Math.random() < 0.5 ? 'defensive' : 'adaptive',
            personalityType: Math.random() < 0.33 ? 'risk_taker' : 
                           Math.random() < 0.5 ? 'cautious' : 'balanced'
        };
    }
    
    private initializeBehaviorPatterns(): void {
        this.behaviorPatterns = {
            reactionTimeVariability: 0.1 + Math.random() * 0.3,  // Variabilidad en reacciones
            concentrationSpans: this.generateConcentrationPattern(),
            mistakeRecoveryTime: 2000 + Math.random() * 3000,    // 2-5 segundos
            currentConcentrationLevel: 0.8,
            lastConcentrationChange: Date.now()
        };
    }
    
    private generateConcentrationPattern(): number[] {
        // Simular períodos naturales de concentración alta/baja como un humano
        const pattern = [];
        for (let i = 0; i < 20; i++) {
            // Fluctuaciones naturales de concentración
            if (Math.random() < 0.7) {
                pattern.push(0.7 + Math.random() * 0.3); // Alta concentración
            } else {
                pattern.push(0.3 + Math.random() * 0.4); // Baja concentración (lapso)
            }
        }
        return pattern;
    }
    
    private setupDifficulty(): void {
        // Configuración base por dificultad
        switch (this.difficulty) {
            case 'easy':
                this.reactionTime = 0.65;
                this.accuracy = 0.55;
                this.predictionDepth = 0.8;
                // Estados emocionales para principiante
                this.emotionalState.confidence = 0.4 + Math.random() * 0.2;
                this.emotionalState.frustration = 0.4 + Math.random() * 0.3;
                this.emotionalState.focus = 0.5 + Math.random() * 0.3;
                break;
            case 'medium':
                this.reactionTime = 0.80;
                this.accuracy = 0.75;
                this.predictionDepth = 1.2;
                // Estados emocionales para intermedio
                this.emotionalState.confidence = 0.6 + Math.random() * 0.2;
                this.emotionalState.frustration = 0.2 + Math.random() * 0.3;
                this.emotionalState.focus = 0.7 + Math.random() * 0.2;
                break;
            case 'hard':
                this.reactionTime = 0.92;
                this.accuracy = 0.88;
                this.predictionDepth = 1.8;
                // Estados emocionales para experto
                this.emotionalState.confidence = 0.7 + Math.random() * 0.2;
                this.emotionalState.frustration = 0.1 + Math.random() * 0.2;
                this.emotionalState.focus = 0.8 + Math.random() * 0.2;
                break;
        }
        
        // Aplicar modificadores de características humanas
        this.reactionTime *= this.humanTraits.reflexSpeed;
        this.accuracy *= this.humanTraits.handEyeCoordination;
        this.predictionDepth *= this.humanTraits.anticipationSkill;
    }
    
    /**
     * NUEVO: Actualiza estados emocionales basados en rendimiento del juego
     */
    private updateEmotionalState(): void {
        const totalPlays = this.gamePerformance.hits + this.gamePerformance.misses;
        const successRate = totalPlays > 0 ? this.gamePerformance.hits / totalPlays : 0.5;
        
        // Actualizar confianza basada en éxito reciente
        if (successRate > 0.7) {
            this.emotionalState.confidence = Math.min(1, this.emotionalState.confidence + 0.05);
            this.emotionalState.frustration = Math.max(0, this.emotionalState.frustration - 0.03);
        } else if (successRate < 0.3) {
            this.emotionalState.confidence = Math.max(0.2, this.emotionalState.confidence - 0.08);
            this.emotionalState.frustration = Math.min(1, this.emotionalState.frustration + 0.1);
        }
        
        // Actualizar presión basada en pérdidas consecutivas
        if (this.consecutiveLosses > 2) {
            this.emotionalState.pressure = Math.min(1, 0.5 + (this.consecutiveLosses * 0.15));
            this.humanErrors.panicMode = this.consecutiveLosses > 4;
        } else {
            this.emotionalState.pressure = Math.max(0.1, this.emotionalState.pressure - 0.05);
            this.humanErrors.panicMode = false;
        }
        
        // Simular fatiga mental durante partidas largas
        this.emotionalState.fatigue = Math.min(0.8, this.emotionalState.fatigue + 0.001);
        
        // Cambios naturales de concentración
        this.updateConcentration();
    }
    
    /**
     * NUEVO: Simula cambios naturales de concentración como un humano
     */
    private updateConcentration(): void {
        const now = Date.now();
        const timeSinceLastChange = now - this.behaviorPatterns.lastConcentrationChange;
        
        // Cambiar concentración cada 5-15 segundos
        if (timeSinceLastChange > (5000 + Math.random() * 10000)) {
            const currentIndex = Math.floor(Math.random() * this.behaviorPatterns.concentrationSpans.length);
            this.behaviorPatterns.currentConcentrationLevel = this.behaviorPatterns.concentrationSpans[currentIndex];
            this.behaviorPatterns.lastConcentrationChange = now;
            
            // Lapsos de concentración afectan el focus
            if (this.behaviorPatterns.currentConcentrationLevel < 0.5) {
                this.emotionalState.focus = Math.max(0.2, this.emotionalState.focus - 0.3);
                console.log(`[AI Behavior] Lapso de concentración - Focus reducido a ${this.emotionalState.focus.toFixed(2)}`);
            } else {
                this.emotionalState.focus = Math.min(1, this.emotionalState.focus + 0.2);
            }
        }
    }
    
    /**
     * NUEVO: Simula errores humanos típicos basados en estado emocional
     */
    private simulateHumanErrors(decision: AIDecision, gameState: GameState): AIDecision {
        const ball = gameState.ball;
        const timeToReach = Math.abs(gameState.aiPaddle.x - ball.x) / Math.abs(ball.vx);
        
        // Error: Overthinking (sobrepensar) cuando hay mucho tiempo
        if (timeToReach > 1.5 && this.emotionalState.confidence < 0.4 && Math.random() < 0.3) {
            this.humanErrors.overthinking = true;
            // Cambiar de decisión en el último momento
            return decision === 'up' ? 'down' : decision === 'down' ? 'up' : decision;
        }
        
        // Error: Reacción tardía bajo presión
        if (this.emotionalState.pressure > 0.6 && timeToReach < 0.8 && Math.random() < 0.4) {
            this.humanErrors.lateReaction = true;
            // Quedarse paralizado momentáneamente
            return 'stop';
        }
        
        // Error: Compromiso temprano por nerviosismo
        if (this.emotionalState.frustration > 0.5 && timeToReach > 1.0 && Math.random() < 0.25) {
            this.humanErrors.earlyCommitment = true;
            // Moverse demasiado pronto basado en predicción incorrecta
            return Math.random() < 0.5 ? 'up' : 'down';
        }
        
        // Error: Sobrecompensación después de fallar
        if (this.humanErrors.overcompensation && Math.random() < 0.4) {
            this.humanErrors.overcompensation = false;
            // Movimiento exagerado en dirección opuesta
            return decision === 'up' ? 'down' : decision === 'down' ? 'up' : decision;
        }
        
        // Modo pánico: decisiones erráticas
        if (this.humanErrors.panicMode && Math.random() < 0.3) {
            const panicDecisions: AIDecision[] = ['up', 'down', 'stop'];
            return panicDecisions[Math.floor(Math.random() * panicDecisions.length)];
        }
        
        return decision;
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
        
        // NUEVO: Actualizar estados emocionales y comportamiento humano
        this.updateEmotionalState();
        
        // Actualizar conocimiento del juego
        this.lastKnownGameState = { ...gameState };
        this.lastUpdate = now;
        
        // Generar predicción de trayectoria (afectada por concentración)
        this.calculateBallPrediction(gameState);
        
        // Tomar decisión basada en predicción
        let decision = this.makeDecision(gameState);
        
        // NUEVO: Aplicar errores humanos realistas
        decision = this.simulateHumanErrors(decision, gameState);
        
        // Simular tiempo de reacción humano variable
        const currentReactionTime = this.calculateDynamicReactionTime();
        if (Math.random() > currentReactionTime) {
            this.lastDecision = 'stop';
            console.log(`[AI Behavior] Fallo de reacción - RT: ${currentReactionTime.toFixed(3)}`);
        } else {
            this.lastDecision = decision;
        }
        
        // Ejecutar la decisión
        this.executeCurrentDecision();
    }
    
    /**
     * NUEVO: Calcula tiempo de reacción dinámico basado en estado emocional
     */
    private calculateDynamicReactionTime(): number {
        let dynamicRT = this.reactionTime;
        
        // Factores que afectan la reacción
        dynamicRT *= this.emotionalState.focus;                    // Concentración
        dynamicRT *= (1 - this.emotionalState.fatigue * 0.3);      // Fatiga mental
        dynamicRT *= (1 - this.emotionalState.pressure * 0.2);     // Presión
        dynamicRT *= this.behaviorPatterns.currentConcentrationLevel; // Concentración actual
        
        // Variabilidad humana natural
        const variability = this.behaviorPatterns.reactionTimeVariability;
        dynamicRT += (Math.random() - 0.5) * variability;
        
        // Mantener dentro de límites realistas
        return Math.max(0.1, Math.min(1.0, dynamicRT));
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
     * MEJORADO: Toma una decisión humana basada en predicción, emociones y características personales
     */
    private makeDecision(gameState: GameState): AIDecision {
        const aiPaddle = gameState.aiPaddle;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;
        
        // ANÁLISIS ESTRATÉGICO: Evaluar situación del juego
        const ballDirection = gameState.ball.vx > 0 ? 'towards_ai' : 'away_from_ai';
        const ballSpeed = Math.sqrt(gameState.ball.vx * gameState.ball.vx + gameState.ball.vy * gameState.ball.vy);
        const timeToReach = ballDirection === 'towards_ai' ? 
            Math.abs(aiPaddle.x - gameState.ball.x) / Math.abs(gameState.ball.vx) : Infinity;
        
        // NUEVO: Aplicar características humanas únicas
        let targetY = this.calculateHumanlikeTarget(gameState, ballDirection, timeToReach);
        
        // NUEVO: Considerar tipo de personalidad
        targetY = this.applyPersonalityBias(targetY, gameState, ballDirection);
        
        // NUEVO: Aplicar fatiga y estado emocional
        targetY = this.applyEmotionalModifiers(targetY, gameState, timeToReach);
        
        // Error humano más realista basado en múltiples factores
        const errorFactor = this.calculateHumanError(timeToReach, ballSpeed);
        targetY += (Math.random() - 0.5) * errorFactor;
        
        // Calcular diferencia y umbral dinámico
        const difference = targetY - paddleCenter;
        let threshold = this.calculateHumanThreshold(gameState, ballDirection, timeToReach);
        
        console.log(`[AI Human] ${this.humanTraits.personalityType} | Conf:${this.emotionalState.confidence.toFixed(2)} | Focus:${this.emotionalState.focus.toFixed(2)} | Target:${targetY.toFixed(1)}`);
        
        if (Math.abs(difference) < threshold) {
            console.log('[AI Decision] STOP - dentro del umbral humano');
            return 'stop';
        }
        
        const decision = difference > 0 ? 'down' : 'up';
        console.log(`[AI Decision] ${decision.toUpperCase()} - estado emocional aplicado`);
        
        // Registrar decisión para aprendizaje
        this.recordDecision(gameState, decision);
        
        return decision;
    }
    
    /**
     * NUEVO: Calcula objetivo como lo haría un humano
     */
    private calculateHumanlikeTarget(gameState: GameState, ballDirection: string, timeToReach: number): number {
        let targetY = gameState.ball.y; // Base
        
        // Los humanos no siempre usan la predicción perfecta
        if (this.predictedBallPath.length > 0 && this.emotionalState.focus > 0.6) {
            // Usar predicción solo si hay buena concentración
            const futureBallPos = this.predictedBallPath[Math.min(5, this.predictedBallPath.length - 1)];
            targetY = futureBallPos.y;
        }
        
        // Los humanos tienen preferencias posicionales
        const canvasCenter = gameState.canvasHeight / 2;
        if (this.humanTraits.preferredStrategy === 'defensive') {
            // Preferencia por mantenerse cerca del centro
            targetY = targetY * 0.7 + canvasCenter * 0.3;
        } else if (this.humanTraits.preferredStrategy === 'aggressive') {
            // Preferencia por posiciones extremas para crear ángulos
            if (targetY > canvasCenter) {
                targetY += 30; // Más agresivo hacia arriba
            } else {
                targetY -= 30; // Más agresivo hacia abajo
            }
        }
        
        return targetY;
    }
    
    /**
     * NUEVO: Aplica sesgos basados en tipo de personalidad
     */
    private applyPersonalityBias(targetY: number, gameState: GameState, ballDirection: string): number {
        const canvasCenter = gameState.canvasHeight / 2;
        
        switch (this.humanTraits.personalityType) {
            case 'risk_taker':
                // Los arriesgados van por golpes en ángulos extremos
                if (Math.abs(targetY - canvasCenter) < 50) {
                    targetY += targetY > canvasCenter ? 40 : -40;
                }
                break;
                
            case 'cautious':
                // Los cautelosos prefieren el centro
                targetY = targetY * 0.6 + canvasCenter * 0.4;
                break;
                
            case 'balanced':
                // Los balanceados ajustan según la situación
                if (ballDirection === 'away_from_ai') {
                    targetY = targetY * 0.8 + canvasCenter * 0.2;
                }
                break;
        }
        
        return targetY;
    }
    
    /**
     * NUEVO: Aplica modificadores emocionales realistas
     */
    private applyEmotionalModifiers(targetY: number, gameState: GameState, timeToReach: number): number {
        // Frustración causa sobrereacción
        if (this.emotionalState.frustration > 0.6) {
            const overreaction = (this.emotionalState.frustration - 0.6) * 100;
            targetY += Math.random() < 0.5 ? overreaction : -overreaction;
        }
        
        // Baja confianza causa indecisión (tender hacia el centro)
        if (this.emotionalState.confidence < 0.4) {
            const centerPull = (0.4 - this.emotionalState.confidence) * 0.5;
            targetY = targetY * (1 - centerPull) + (gameState.canvasHeight / 2) * centerPull;
        }
        
        // Presión causa errores de cálculo
        if (this.emotionalState.pressure > 0.5 && timeToReach < 1.0) {
            const pressureError = this.emotionalState.pressure * 60 * (1.5 - timeToReach);
            targetY += (Math.random() - 0.5) * pressureError;
        }
        
        return targetY;
    }
    
    /**
     * NUEVO: Calcula error humano realista
     */
    private calculateHumanError(timeToReach: number, ballSpeed: number): number {
        let baseError = (1 - this.accuracy) * 80;
        
        // Más errores con pelotas rápidas
        if (ballSpeed > 300) {
            baseError *= 1.4;
        }
        
        // Más errores bajo presión de tiempo
        if (timeToReach < 0.8) {
            baseError *= (1.5 - timeToReach);
        }
        
        // Factores emocionales
        baseError *= (1 + this.emotionalState.fatigue * 0.5);
        baseError *= (1 + this.emotionalState.pressure * 0.3);
        baseError *= (1 + (1 - this.emotionalState.focus) * 0.4);
        
        return baseError;
    }
    
    /**
     * NUEVO: Calcula umbral de movimiento humano dinámico
     */
    private calculateHumanThreshold(gameState: GameState, ballDirection: string, timeToReach: number): number {
        let threshold = 25; // Base
        
        // Los humanos son menos precisos cuando están nerviosos
        if (this.emotionalState.pressure > 0.5) {
            threshold *= (1 + this.emotionalState.pressure * 0.8);
        }
        
        // Fatiga aumenta la zona "suficientemente buena"
        if (this.emotionalState.fatigue > 0.3) {
            threshold *= (1 + this.emotionalState.fatigue * 0.6);
        }
        
        // Tipo de personalidad afecta precisión
        switch (this.humanTraits.personalityType) {
            case 'cautious':
                threshold *= 0.8; // Más precisos
                break;
            case 'risk_taker':
                threshold *= 1.3; // Menos precisos, más agresivos
                break;
        }
        
        return threshold;
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
            gameContext,
            emotionalContext: {...this.emotionalState}
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
     * MEJORADO: Registra resultado con reacciones emocionales humanas
     */
    public recordPlayResult(hit: boolean, won: boolean = false): void {
        if (hit) {
            this.gamePerformance.hits++;
            this.consecutiveLosses = 0;
            
            // Reacción emocional positiva (como un humano)
            this.emotionalState.confidence = Math.min(1, this.emotionalState.confidence + 0.05);
            this.emotionalState.frustration = Math.max(0, this.emotionalState.frustration - 0.03);
            
            // Resetear errores después de éxito
            this.humanErrors.overcompensation = false;
            this.humanErrors.overthinking = false;
            
        } else {
            this.gamePerformance.misses++;
            
            // Reacción emocional negativa realista
            this.emotionalState.confidence = Math.max(0.1, this.emotionalState.confidence - 0.08);
            this.emotionalState.frustration = Math.min(1, this.emotionalState.frustration + 0.1);
            
            // Activar errores humanos después de fallar
            if (Math.random() < 0.4) {
                this.humanErrors.overcompensation = true;
            }
            
            // Aprender del error (como un humano imperfecto)
            this.learnFromMistake();
        }
        
        if (!won) {
            this.consecutiveLosses++;
            
            // Presión aumenta con pérdidas consecutivas
            if (this.consecutiveLosses > 2) {
                this.emotionalState.pressure = Math.min(1, 0.3 + (this.consecutiveLosses * 0.15));
            }
        } else {
            // Victoria reduce presión y aumenta confianza
            this.emotionalState.pressure = Math.max(0.1, this.emotionalState.pressure - 0.2);
            this.emotionalState.confidence = Math.min(1, this.emotionalState.confidence + 0.1);
        }
        
        // Actualizar memoria de aprendizaje
        if (this.learningMemory.length > 0) {
            const lastDecision = this.learningMemory[this.learningMemory.length - 1];
            lastDecision.success = hit;
        }
        
        console.log(`[AI Emotion] Hit: ${hit} | Conf: ${this.emotionalState.confidence.toFixed(2)} | Frust: ${this.emotionalState.frustration.toFixed(2)} | Press: ${this.emotionalState.pressure.toFixed(2)}`);
    }
    
    /**
     * NUEVO: Aprende de errores como un humano (imperfecto)
     */
    private learnFromMistake(): void {
        // Los humanos no siempre aprenden de todos los errores
        if (Math.random() > this.humanTraits.learning_rate) {
            return; // A veces ignoran las lecciones
        }
        
        // Ajustar estrategia basada en el tipo de error
        const totalErrors = this.gamePerformance.misses;
        
        if (totalErrors > 3) {
            // Cambio de estrategia después de varios errores (comportamiento humano)
            if (this.humanTraits.personalityType === 'risk_taker') {
                // Los arriesgados se vuelven más agresivos cuando fallan
                this.aggressiveness = Math.min(1, this.aggressiveness + 0.1);
            } else if (this.humanTraits.personalityType === 'cautious') {
                // Los cautelosos se vuelven más defensivos
                this.aggressiveness = Math.max(0, this.aggressiveness - 0.1);
            }
        }
        
        // Pequeño ajuste en características (aprendizaje gradual)
        if (this.gamePerformance.misses > this.gamePerformance.hits) {
            // Intentar mejorar ligeramente si está perdiendo
            this.reactionTime = Math.min(0.95, this.reactionTime + 0.01);
            this.accuracy = Math.min(0.9, this.accuracy + 0.005);
        }
    }
    
    /**
     * Reinicia estadísticas para nuevo juego
     */
    /**
     * MEJORADO: Reinicia estadísticas y estado emocional para nuevo juego
     */
    public resetGameStats(): void {
        this.gamePerformance = { hits: 0, misses: 0 };
        this.consecutiveLosses = 0;
        this.gameHistory = [];
        this.learningMemory = [];
        this.adaptiveStrategy = 'balanced';
        this.aggressiveness = 0.5;
        
        // NUEVO: Reiniciar estado emocional para nuevo juego (como un humano)
        this.emotionalState.confidence = 0.6 + Math.random() * 0.2;  // Confianza inicial variada
        this.emotionalState.frustration = 0.1 + Math.random() * 0.2; // Frustración inicial baja
        this.emotionalState.focus = 0.7 + Math.random() * 0.2;       // Focus inicial bueno
        this.emotionalState.fatigue = 0.05;                          // Sin fatiga al empezar
        this.emotionalState.pressure = 0.2 + Math.random() * 0.2;    // Presión inicial ligera
        
        // Reiniciar errores humanos
        this.humanErrors = { 
            overthinking: false, 
            earlyCommitment: false, 
            lateReaction: false, 
            overcompensation: false, 
            panicMode: false 
        };
        
        console.log(`[AI Reset] Nuevo juego iniciado - Personalidad: ${this.humanTraits.personalityType}, Confianza inicial: ${this.emotionalState.confidence.toFixed(2)}`);
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
