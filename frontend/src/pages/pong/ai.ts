// src/pages/pong/ai.ts

/**
 * @file AI Player implementation for Pong game.
 * Implements an intelligent AI that can compete against human players.
 * Uses prediction algorithms and strategic decision-making without A*.
 */

import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    PADDLE_HEIGHT,
	PADDLE_WIDTH,
    PADDLE_SPEED, // Import PADDLE_SPEED for base movement calculation
    BALL_RADIUS,
    GAME_STATE  
} from './constants';

// AI Configuration
const AI_CONFIG = {
    VISION_UPDATE_INTERVAL: 1000, // AI can only "see" the game state once per second
    PREDICTION_STEPS: 120, // How many frames ahead to predict (2 seconds at 60fps)
    DIFFICULTY_LEVELS: {
        EASY: {
            reaction_delay: 300, // Aumentado para que la IA tarde más en reaccionar
            prediction_accuracy: 0.4, // Reducido para que la predicción sea menos precisa
            max_speed_factor: 0.5, // Reducido ligeramente la velocidad máxima de la paleta
            anticipation_factor: 0.1 // Reducido para que anticipe menos
        },
        MEDIUM: {
            reaction_delay: 100,
            prediction_accuracy: 0.85,
            max_speed_factor: 0.8,
            anticipation_factor: 0.6
        },
        HARD: {
            reaction_delay: 50,
            prediction_accuracy: 0.95,
            max_speed_factor: 1.0,
            anticipation_factor: 0.9
        }
    }
};

interface GameSnapshot {
    ballX: number;
    ballY: number;
    ballDx: number;
    ballDy: number;
    player1Y: number;
    player2Y: number;
    timestamp: number;
}

interface PredictionResult {
    targetY: number;
    confidence: number;
    interceptTime: number;
    strategy: 'INTERCEPT' | 'DEFEND' | 'ATTACK' | 'ANTICIPATE';
}

// === UPDATED AIAction Interface ===
interface AIAction {
    action: 'move' | 'stop'; // 'move' for movement, 'stop' for no movement
    dy?: number;              // The calculated paddle speed/direction (Paddle.dy)
}
// ==================================

/**
 * AI Player class that simulates intelligent gameplay using prediction algorithms
 * and strategic decision-making.
 */
export class AIPlayer {
    private difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    private config: typeof AI_CONFIG.DIFFICULTY_LEVELS.EASY;
    private lastVisionUpdate: number;
    private gameSnapshot: GameSnapshot | null;
    private currentMovementDirection: number; // -1 = up, 0 = stop, 1 = down (This is for internal logic)
    private reactionTimer: number;
    private strategyState: {
        lastBallDirection: number;
        consecutiveHits: number;
        opponentPattern: number[];
        adaptiveOffset: number;
    };

    constructor(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
        this.difficulty = difficulty;
        this.config = AI_CONFIG.DIFFICULTY_LEVELS[difficulty];
        this.lastVisionUpdate = 0;
        this.gameSnapshot = null;
        this.currentMovementDirection = 0; // Renamed to avoid confusion with the output dy
        this.reactionTimer = 0;
        this.strategyState = {
            lastBallDirection: 0,
            consecutiveHits: 0,
            opponentPattern: [],
            adaptiveOffset: 0
        };
    }

    /**
     * Updates the AI's vision of the game state (limited to once per second).
     * This simulates human-like perception limitations.
     */
    public updateVision(gameState: any): void {
        const currentTime = Date.now();
        
        if (currentTime - this.lastVisionUpdate >= AI_CONFIG.VISION_UPDATE_INTERVAL) {
            this.gameSnapshot = {
                ballX: gameState.ball.x,
                ballY: gameState.ball.y,
                ballDx: gameState.ball.currentDx, // Use currentDx/Dy for prediction
                ballDy: gameState.ball.currentDy, // Use currentDx/Dy for prediction
                player1Y: gameState.player1.y,
                player2Y: gameState.player2Paddle1.y, // Use player2Paddle1 for AI's own position
                timestamp: currentTime
            };
            this.lastVisionUpdate = currentTime;
            this.analyzeOpponentPattern(gameState.player1.y);
        }
    }

    /**
     * Analyzes opponent movement patterns to predict their behavior.
     */
    private analyzeOpponentPattern(opponentY: number): void {
        this.strategyState.opponentPattern.push(opponentY);
        
        // Keep only recent positions (last 10 updates)
        if (this.strategyState.opponentPattern.length > 10) {
            this.strategyState.opponentPattern.shift();
        }
    }

    /**
     * Predicts where the ball will be using physics simulation.
     * Uses trajectory analysis and collision prediction.
     */
    private predictBallTrajectory(): PredictionResult {
        if (!this.gameSnapshot) {
            return {
                targetY: CANVAS_HEIGHT / 2,
                confidence: 0,
                interceptTime: 0,
                strategy: 'DEFEND'
            };
        }

        const snapshot = this.gameSnapshot;
        let ballX = snapshot.ballX;
        let ballY = snapshot.ballY;
        let ballDx = snapshot.ballDx;
        let ballDy = snapshot.ballDy;

        // Simulate ball movement until it reaches the AI's paddle area (right side)
        let steps = 0;
        const maxSteps = AI_CONFIG.PREDICTION_STEPS;
        
        // Only predict if ball is moving towards AI
        if (ballDx <= 0) { // Ball is moving away from AI or stationary
            return {
                targetY: snapshot.ballY, // Stay at current ball Y or paddle center
                confidence: 0.1, // Low confidence if not directly approaching
                interceptTime: 0,
                strategy: 'DEFEND'
            };
        }

        while (steps < maxSteps) {
            ballX += ballDx;
            ballY += ballDy;

            // Handle wall collisions (top/bottom)
            if (ballY - BALL_RADIUS < 0) {
                ballY = BALL_RADIUS; // Clamp to boundary
                ballDy *= -1;
            } else if (ballY + BALL_RADIUS > CANVAS_HEIGHT) {
                ballY = CANVAS_HEIGHT - BALL_RADIUS; // Clamp to boundary
                ballDy *= -1;
            }

            // Approximate paddle collisions (player 1 side for rebound prediction)
            // If ball hits left paddle (player 1's side), reverse X and add some random Y-bounce
            if (ballX - BALL_RADIUS <= PADDLE_WIDTH && ballDx < 0) {
                 if (ballY + BALL_RADIUS > snapshot.player1Y && ballY - BALL_RADIUS < snapshot.player1Y + PADDLE_HEIGHT) {
                    ballDx *= -1;
                    ballDy += (Math.random() - 0.5) * 2; // Simulate a slight change in angle
                    ballDx *= 1.05; // Simulate speed increase on bounce
                 }
            }


            // If ball reaches AI's paddle X-coordinate (right side of screen)
            if (ballDx > 0 && ballX + BALL_RADIUS >= CANVAS_WIDTH - PADDLE_WIDTH) {
                // Confidence decreases with distance/steps
                const confidence = Math.max(0, 1 - (steps / maxSteps)) * this.config.prediction_accuracy;
                const strategy = this.determineStrategy(ballX, ballY, ballDx, ballDy);
                
                return {
                    targetY: ballY,
                    confidence: confidence,
                    interceptTime: steps,
                    strategy: strategy
                };
            }

            steps++;
        }

        // Fallback prediction if it doesn't reach the paddle within maxSteps
        // Predict based on current ball trajectory without further bounces
        return {
            targetY: ballY, // Last predicted Y position
            confidence: 0.3 * this.config.prediction_accuracy,
            interceptTime: maxSteps,
            strategy: 'DEFEND' // Default to defend
        };
    }

    /**
     * Determines the best strategy based on game state analysis.
     */
    private determineStrategy(ballX: number, ballY: number, ballDx: number, ballDy: number): 
        'INTERCEPT' | 'DEFEND' | 'ATTACK' | 'ANTICIPATE' {
        
        // Analyze ball speed and position
        const ballSpeed = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
        const distanceToAI = CANVAS_WIDTH - ballX - PADDLE_WIDTH; // Distance to front of AI paddle
        
        // Strategy decision tree
        if (distanceToAI > CANVAS_WIDTH / 4 && ballDx > 0) { // Ball is far and coming towards AI
            return 'ANTICIPATE'; 
        } else if (ballSpeed > 8) { // High-speed ball
            return 'DEFEND'; 
        } else if ((ballY < CANVAS_HEIGHT * 0.3 || ballY > CANVAS_HEIGHT * 0.7) && ballDx > 0) {
            return 'ATTACK'; // Ball in corner and moving towards AI, aggressive positioning
        } else {
            return 'INTERCEPT'; // Standard interception
        }
    }

    /**
     * Calculates optimal paddle position using weighted decision algorithm.
     */
    private calculateOptimalPosition(prediction: PredictionResult, currentPaddleY: number): number {
        const paddleCenter = currentPaddleY + PADDLE_HEIGHT / 2;
        let targetY = prediction.targetY;

        // Apply strategy-specific adjustments
        switch (prediction.strategy) {
            case 'ATTACK':
                // Position to return ball at a sharp angle (e.g., hit top/bottom edge of paddle)
                // If ball is high, move slightly lower to hit top of paddle
                // If ball is low, move slightly higher to hit bottom of paddle
                targetY += (targetY < CANVAS_HEIGHT / 2) ? (PADDLE_HEIGHT / 2 - BALL_RADIUS) * this.config.anticipation_factor :
                                                           -(PADDLE_HEIGHT / 2 - BALL_RADIUS) * this.config.anticipation_factor;
                break;
                
            case 'DEFEND':
                // Stay closer to center of the paddle for better coverage
                targetY = targetY * 0.7 + paddleCenter * 0.3; // Blend with current center
                break;
                
            case 'ANTICIPATE':
                // Use opponent pattern analysis for anticipation
                if (this.strategyState.opponentPattern.length > 3) {
                    const avgOpponentY = this.strategyState.opponentPattern.reduce((a, b) => a + b) / 
                                        this.strategyState.opponentPattern.length;
                    // Counter-position against opponent's typical return spot
                    const counterY = CANVAS_HEIGHT - avgOpponentY; // Simple mirroring
                    targetY = targetY * (1 - this.config.anticipation_factor) + counterY * this.config.anticipation_factor;
                }
                break;
                
            case 'INTERCEPT':
            default:
                // Blend predicted target with current paddle center based on confidence
                targetY = targetY * prediction.confidence + paddleCenter * (1 - prediction.confidence);
                break;
        }

        // Apply adaptive offset based on recent performance
        targetY += this.strategyState.adaptiveOffset;

        // Ensure targetY is within paddle's movement range
        const minY = PADDLE_HEIGHT / 2;
        const maxY = CANVAS_HEIGHT - PADDLE_HEIGHT / 2;
        return Math.max(minY, Math.min(maxY, targetY));
    }

    /**
     * Makes movement decision and returns the paddle's dy.
     * Incorporates reaction delay and max speed factor.
     */
    private makeMovementDecision(currentPaddleY: number, targetY: number): number {
        const paddleCenter = currentPaddleY + PADDLE_HEIGHT / 2;
        const difference = targetY - paddleCenter;
        const threshold = 5; // Dead zone to prevent jittering

        // Apply reaction delay
        if (this.reactionTimer > 0) {
            this.reactionTimer -= 1000 / 60; // Assuming 60fps
            // Continue with previous movement direction if still in reaction delay
            return this.currentMovementDirection * PADDLE_SPEED * this.config.max_speed_factor;
        }

        // If the paddle is close enough to the target, stop or move minimally
        if (Math.abs(difference) < threshold) {
            this.currentMovementDirection = 0; // Stay still
        } else if (difference > 0) { // Ball is below paddle center, move down
            this.currentMovementDirection = 1;
        } else { // Ball is above paddle center, move up
            this.currentMovementDirection = -1;
        }

        // Set reaction delay for next decision
        this.reactionTimer = this.config.reaction_delay;
        
        // Return calculated dy based on paddle speed and AI's max speed factor
        return this.currentMovementDirection * PADDLE_SPEED * this.config.max_speed_factor;
    }

    /**
     * Updates AI adaptive behavior based on game outcome.
     */
    public updatePerformance(scored: boolean, ballHitPaddle: boolean): void {
        if (ballHitPaddle) {
            this.strategyState.consecutiveHits++;
            // Successful hit, slightly reduce adaptive offset deviation (stabilize)
            this.strategyState.adaptiveOffset *= 0.95; // Move closer to 0
        } else if (scored) {
            // AI was scored on, adjust strategy with a random offset
            this.strategyState.consecutiveHits = 0;
            this.strategyState.adaptiveOffset += (Math.random() - 0.5) * 20; // Add random adjustment
            // Clamp adaptive offset to prevent it from going too far
            this.strategyState.adaptiveOffset = Math.max(-50, Math.min(50, this.strategyState.adaptiveOffset));
        }
    }

    /**
     * Main AI update function - returns the calculated `dy` value for the paddle.
     */
    public getAIInput(gameState: any): AIAction {
        // Update vision with current game state
        this.updateVision(gameState);
    
        // Only make decisions if we have vision data and game is playing
        if (!this.gameSnapshot || gameState.gameState !== GAME_STATE.PLAYING) {
            return { action: 'stop', dy: 0 };
        }
    
        // Get ball trajectory prediction
        const prediction = this.predictBallTrajectory();
    
        // Calculate optimal paddle position
        const optimalY = this.calculateOptimalPosition(prediction, gameState.player2Paddle1.y);
    
        // Make movement decision and get the dy value
        // This 'dy' value directly translates to how much the AI's paddle should move
        // (e.g., mimicking a prolonged key press).
        const dy = this.makeMovementDecision(gameState.player2Paddle1.y, optimalY);
    
        // Return the AIAction
        if (dy !== 0) {
            return { action: 'move', dy: dy };
        } else {
            return { action: 'stop', dy: 0 };
        }
    }

    /**
     * Gets AI difficulty level
     */
    public getDifficulty(): string {
        return this.difficulty;
    }

    /**
     * Sets AI difficulty level
     */
    public setDifficulty(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): void {
        this.difficulty = difficulty;
        this.config = AI_CONFIG.DIFFICULTY_LEVELS[difficulty];
    }

    /**
     * Gets current AI strategy information for debugging/display
     */
    public getAIStatus(): {
        strategy: string;
        confidence: number;
        targetY: number;
        adaptiveOffset: number;
    } {
        if (!this.gameSnapshot) {
            return {
                strategy: 'WAITING',
                confidence: 0,
                targetY: CANVAS_HEIGHT / 2,
                adaptiveOffset: 0
            };
        }

        const prediction = this.predictBallTrajectory();
        return {
            strategy: prediction.strategy,
            confidence: prediction.confidence,
            targetY: prediction.targetY,
            adaptiveOffset: this.strategyState.adaptiveOffset
        };
    }
}