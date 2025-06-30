// src/pages/pong/game.ts

/**
 * @file Game logic for the Pong game.
 * Manages game state, updates, collisions, and input.
 */

import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    PADDLE_SPEED,
    BALL_RADIUS,
    BALL_SPEED_X,
    BALL_SPEED_Y,
    BALL_SPEED_INCREASE_FACTOR,
    MAX_SCORE,
    COLORS,
    GAME_STATE,
    MESSAGES, // This import is correct
    MAX_BALL_SPEED,
    PADDLE_VERTICAL_SPACING,
    PADDLE_ADVANCE_OFFSET
} from './constants';
import {
    clearCanvas,
    drawBackground,
    drawBall,
    drawPaddle,
    drawScore,
    drawMessage
} from './draw';
import { AIPlayer } from './ai'; // Importa la clase AIPlayer
import { navigateTo } from '../../router'; // Importar navegación

// NEW: Import GameMode and AIDifficulty from index.ts to ensure type consistency
import { GameMode, AIDifficulty } from './index';

// Define the shape for game entities (Ball and Paddles)
interface Paddle {
    x: number;
    y: number;
    dy: number; // Direction/speed for paddle movement
}

interface Ball {
    x: number;
    y: number;
    dx: number; // Direction/speed for ball movement on X-axis (initial direction)
    dy: number; // Direction/speed for ball demovement on Y-axis (initial direction)
    currentDx: number; // Current speed in X-axis (changes with bounces)
    currentDy: number; // Current speed in Y-axis (changes with bounces)
}

/**
 * The main Game class responsible for managing the Pong game.
 */

export class Game {
    protected canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    protected player1: Paddle; // <--- CAMBIAR
    protected player1Paddle2: Paddle | null; // <--- CAMBIAR
    protected player2Paddle1: Paddle; // <--- CAMBIAR
    protected player2Paddle2: Paddle | null; // <--- CAMBIAR
    protected ball: Ball; // <--- CAMBIAR
    protected score1: number; // <--- CAMBIAR
    protected score2: number; // <--- CAMBIAR
    protected gameState: string;
    private animationFrameId: number | null;
    protected keysPressed: { [key: string]: boolean };
    protected gameMode: GameMode;
    private aiPlayer: AIPlayer | null;
    protected isMobile: boolean;
    protected countdownTimer: number;
    protected countdownValue: number;
    public isRunning: boolean;

    // Updated constructor to use the imported GameMode and AIDifficulty types
    // Removed `context` as it's not passed from index.ts in the snippet
    constructor(canvas: HTMLCanvasElement, gameMode: GameMode = '1v1_local', aiDifficulty: AIDifficulty = 'MEDIUM', isMobile: boolean = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;

        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.gameMode = gameMode;
        this.aiPlayer = null; // Inicialmente nulo
        this.isMobile = isMobile; // Asigna la propiedad isMobile
        this.isRunning = false; // Initialize isRunning

        // Initialize paddles based on game mode
        this.player1Paddle2 = null; // Default to null
        this.player2Paddle2 = null; // Default to null

        if (this.gameMode === '2v1_local' || this.gameMode === '2v2_local') {
            // For 2 vs 1 or 2 vs 2, Player 1 has two paddles
            this.player1 = { // Player 1 - Top paddle (advanced)
                x: PADDLE_ADVANCE_OFFSET, // Advanced position
                y: (CANVAS_HEIGHT / 2) - PADDLE_HEIGHT - (PADDLE_VERTICAL_SPACING / 2),
                dy: 0
            };
            this.player1Paddle2 = { // Player 1 - Bottom paddle (normal)
                x: 0, // Normal position
                y: (CANVAS_HEIGHT / 2) + (PADDLE_VERTICAL_SPACING / 2),
                dy: 0
            };
        } else {
            // For 1 vs 1, 1 vs 2 or vs AI, Player 1 has one paddle
            this.player1 = {
                x: 0,
                y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
                dy: 0
            };
        }

        if (this.gameMode === '1v2_local' || this.gameMode === '2v2_local') {
            // For 1 vs 2 or 2 vs 2, Player 2 has two paddles
            this.player2Paddle1 = { // Player 2 - Top paddle (advanced)
                x: CANVAS_WIDTH - PADDLE_WIDTH - PADDLE_ADVANCE_OFFSET, // Advanced position
                y: (CANVAS_HEIGHT / 2) - PADDLE_HEIGHT - (PADDLE_VERTICAL_SPACING / 2),
                dy: 0
            };
            this.player2Paddle2 = { // Player 2 - Bottom paddle (normal)
                x: CANVAS_WIDTH - PADDLE_WIDTH, // Normal position
                y: (CANVAS_HEIGHT / 2) + (PADDLE_VERTICAL_SPACING / 2),
                dy: 0
            };
        } else {
            // For 1 vs 1, 2 vs 1 or vs AI, Player 2 has one paddle
            this.player2Paddle1 = {
                x: CANVAS_WIDTH - PADDLE_WIDTH,
                y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
                dy: 0
            };
        }

        // Initialize the AI if the mode is 'vs_ai'
        if (this.gameMode === 'vs_ai') {
            this.aiPlayer = new AIPlayer(aiDifficulty);
        }

        this.ball = {
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            dx: BALL_SPEED_X, // Base speed for X
            dy: BALL_SPEED_Y, // Base speed for Y
            currentDx: BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1),
            currentDy: BALL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1)
        };

        this.score1 = 0;
        this.score2 = 0;

        this.gameState = GAME_STATE.INITIAL;
        this.animationFrameId = null;
        this.keysPressed = {};

        this.countdownTimer = 0; // Inicializa el temporizador de cuenta regresiva
        this.countdownValue = 5; // Inicia la cuenta regresiva en 5

        this.addEventListeners();
        // Removed `this.loop()` call here; it will be called by `init()`
    }

    /**
     * Public method to initialize the game state, positions, and start the loop.
     */
    public init(): void {
        this.resetPositions(); // Ensure paddles are reset at start
        this.score1 = 0;
        this.score2 = 0;
        this.gameState = GAME_STATE.INITIAL;
        this.isRunning = false; // Game starts as not running, waiting for countdown
        this.countdownTimer = 0; // Reset countdown
        this.countdownValue = 5; // Reset countdown value
        this.draw(); // Draw initial state

        // Start the game loop only if it's not already running
        if (!this.animationFrameId) {
            this.loop();
        }
    }

    private resetPositions(): void {
        // Reset player 1 paddles based on game mode
        if (this.gameMode === '2v1_local' || this.gameMode === '2v2_local') {
            this.player1.x = PADDLE_ADVANCE_OFFSET;
            this.player1.y = (CANVAS_HEIGHT / 2) - PADDLE_HEIGHT - (PADDLE_VERTICAL_SPACING / 2);
            if (this.player1Paddle2) {
                this.player1Paddle2.x = 0;
                this.player1Paddle2.y = (CANVAS_HEIGHT / 2) + (PADDLE_VERTICAL_SPACING / 2);
            }
        } else {
            this.player1.x = 0;
            this.player1.y = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
        }

        // Reset player 2 paddles based on game mode
        if (this.gameMode === '1v2_local' || this.gameMode === '2v2_local') {
            this.player2Paddle1.x = CANVAS_WIDTH - PADDLE_WIDTH - PADDLE_ADVANCE_OFFSET;
            this.player2Paddle1.y = (CANVAS_HEIGHT / 2) - PADDLE_HEIGHT - (PADDLE_VERTICAL_SPACING / 2);
            if (this.player2Paddle2) {
                this.player2Paddle2.x = CANVAS_WIDTH - PADDLE_WIDTH;
                this.player2Paddle2.y = (CANVAS_HEIGHT / 2) + (PADDLE_VERTICAL_SPACING / 2);
            }
        } else {
            this.player2Paddle1.x = CANVAS_WIDTH - PADDLE_WIDTH;
            this.player2Paddle1.y = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
        }

        this.resetBall();
    }


    private addEventListeners(): void {
        // Only add keyboard listeners if it's NOT a mobile device
        if (!this.isMobile) {
            window.addEventListener('keydown', (e: KeyboardEvent) => {
                this.keysPressed[e.key] = true;
                // Prevent default behavior for specific keys to avoid scrolling or other browser actions
                // Added i and k for 2v2 P2 controls
                if ([' ', 'ArrowUp', 'ArrowDown', 'w', 's', 'q', 'a', 'k', 'm', 't', 'g', 'i'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
                if (e.key === ' ' || e.key === 'Spacebar') {
                    if (this.gameState === GAME_STATE.INITIAL) {
                        this.startCountdown(); // Start countdown
                    }
                }
            });

            window.addEventListener('keyup', (e: KeyboardEvent) => {
                this.keysPressed[e.key] = false;
            });
        }

        // Keep canvas touch for initial countdown on mobile
        if (this.isMobile) {
            this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
                e.preventDefault(); // Prevent scrolling
                if (this.gameState === GAME_STATE.INITIAL) {
                    this.startCountdown(); // Start countdown with canvas touch
                    return;
                }
            });
        }
    }

    /**
     * Public method to move Player 1's main paddle up.
     * In 2v1 or 2v2 mode, this controls player1's top paddle.
     */
    public movePlayer1Up(): void {
        if (this.gameState === GAME_STATE.INITIAL) {
            this.startCountdown();
        }
        if (this.gameState === GAME_STATE.PLAYING) {
            this.player1.dy = -PADDLE_SPEED;
        }
    }

    /**
     * Public method to move Player 1's main paddle down.
     * In 2v1 or 2v2 mode, this controls player1's top paddle.
     */
    public movePlayer1Down(): void {
        if (this.gameState === GAME_STATE.INITIAL) {
            this.startCountdown();
        }
        if (this.gameState === GAME_STATE.PLAYING) {
            this.player1.dy = PADDLE_SPEED;
        }
    }

    /**
     * Public method to stop Player 1's main paddle movement.
     * In 2v1 or 2v2 mode, this stops player1's top paddle.
     */
    public stopPlayer1(): void {
        if (this.gameState === GAME_STATE.PLAYING) {
            this.player1.dy = 0;
        }
    }

    /**
     * Public method to move Player 1's second paddle up (only for 2v1 or 2v2 mode).
     */
    public movePlayer1Paddle2Up(): void {
        if (this.gameState === GAME_STATE.INITIAL) {
            this.startCountdown(); // Can also start from second paddle's button
        }
        if (this.gameState === GAME_STATE.PLAYING && this.player1Paddle2) {
            this.player1Paddle2.dy = -PADDLE_SPEED;
        }
    }

    /**
     * Public method to move Player 1's second paddle down (only for 2v1 or 2v2 mode).
     */
    public movePlayer1Paddle2Down(): void {
        if (this.gameState === GAME_STATE.INITIAL) {
            this.startCountdown(); // Can also start from second paddle's button
        }
        if (this.gameState === GAME_STATE.PLAYING && this.player1Paddle2) {
            this.player1Paddle2.dy = PADDLE_SPEED;
        }
    }

    /**
     * Public method to stop Player 1's second paddle movement (only for 2v1 or 2v2 mode).
     */
    public stopPlayer1Paddle2(): void {
        if (this.gameState === GAME_STATE.PLAYING && this.player1Paddle2) {
            this.player1Paddle2.dy = 0;
        }
    }


    protected updateGameLogic(): void { // Renamed from `update` to avoid confusion with the public `update` in loop
        // Handle countdown logic first.
        if (this.gameState === GAME_STATE.COUNTDOWN) {
            this.countdownTimer -= (1000 / 60); // Assuming 60 FPS
            this.countdownValue = Math.ceil(this.countdownTimer / 1000);

            // If countdown finishes, transition to PLAYING state and reset the ball.
            if (this.countdownValue <= 0) {
                this.gameState = GAME_STATE.PLAYING;
                this.countdownValue = 0; // Don't show 0 or negative
                console.log('Countdown finished. Game state:', this.gameState);
                this.resetBall(); // Reset ball position and initial direction
                this.isRunning = true; // Set isRunning to true when game starts
            }

            // If the game state is still COUNTDOWN (i.e., countdown hasn't finished yet),
            // then we exit this update cycle. The game logic below only runs for PLAYING.
            if (this.gameState !== GAME_STATE.PLAYING) {
                return;
            }
        }

        // All game logic below this point should only run if the game is in the PLAYING state.
        // This prevents paddles, ball, and scoring from updating during INITIAL, COUNTDOWN, or GAME_OVER states.
        if (this.gameState !== GAME_STATE.PLAYING) {
            return;
        }

        // --- Handle Player 1 Movement ---
        if (this.isMobile) {
            // Player 1 movement on mobile is handled by public methods (buttons),
            // so we don't apply keyboard input here.
            // dy for player1 and player1Paddle2 is set by the public methods (movePlayer1Up/Down, etc.)
        } else {
            // Player 1 movement on desktop (keyboard input)
            if (this.gameMode === '2v1_local' || this.gameMode === '2v2_local') {
                // Player 1, Paddle 1 (front/delantera) - T/G
                if (this.keysPressed['t'] || this.keysPressed['T']) {
                    this.player1.dy = -PADDLE_SPEED;
                } else if (this.keysPressed['g'] || this.keysPressed['G']) {
                    this.player1.dy = PADDLE_SPEED;
                } else {
                    this.player1.dy = 0;
                }

                // Player 1, Paddle 2 (back/trasera) - W/S
                if (this.player1Paddle2) {
                    if (this.keysPressed['w'] || this.keysPressed['W']) {
                        this.player1Paddle2.dy = -PADDLE_SPEED;
                    } else if (this.keysPressed['s'] || this.keysPressed['S']) {
                        this.player1Paddle2.dy = PADDLE_SPEED;
                    } else {
                        this.player1Paddle2.dy = 0;
                    }
                }
            } else { // 1v1_local, 1v2_local, vs_ai - Player 1 has one paddle (W/S)
                if (this.keysPressed['w'] || this.keysPressed['W']) {
                    this.player1.dy = -PADDLE_SPEED;
                } else if (this.keysPressed['s'] || this.keysPressed['S']) {
                    this.player1.dy = PADDLE_SPEED;
                } else {
                    this.player1.dy = 0;
                }
            }
        }

        // --- Handle Player 2 Movement (AI or Human) ---
        if (this.gameMode === 'vs_ai' && this.aiPlayer) {
            // AI controls player2Paddle1 regardless of mobile status
            const aiInput = this.aiPlayer.getAIInput({
                ball: this.ball,
                player1: this.player1,
                player2Paddle1: this.player2Paddle1,
                gameState: this.gameState
            });

            if (aiInput.action === 'move' && aiInput.dy !== undefined) {
                this.player2Paddle1.dy = aiInput.dy;
            } else {
                this.player2Paddle1.dy = 0;
            }
        } else if (!this.isMobile) { // Only human Player 2 controls on desktop
            if (this.gameMode === '1v1_local' || this.gameMode === '2v1_local') {
                // Player 2 has one paddle (ArrowUp/ArrowDown)
                if (this.keysPressed['ArrowUp']) {
                    this.player2Paddle1.dy = -PADDLE_SPEED;
                } else if (this.keysPressed['ArrowDown']) {
                    this.player2Paddle1.dy = PADDLE_SPEED;
                } else {
                    this.player2Paddle1.dy = 0;
                }
            } else if (this.gameMode === '1v2_local') {
                // Player 2, Paddle 1 (front/delantera) - K/M
                if (this.keysPressed['k'] || this.keysPressed['K']) {
                    this.player2Paddle1.dy = -PADDLE_SPEED;
                } else if (this.keysPressed['m'] || this.keysPressed['M']) {
                    this.player2Paddle1.dy = PADDLE_SPEED;
                } else {
                    this.player2Paddle1.dy = 0;
                }

                // Player 2, Paddle 2 (back/trasera) - ArrowUp/ArrowDown
                if (this.player2Paddle2) {
                    if (this.keysPressed['ArrowUp']) {
                        this.player2Paddle2.dy = -PADDLE_SPEED;
                    } else if (this.keysPressed['ArrowDown']) {
                        this.player2Paddle2.dy = PADDLE_SPEED;
                    } else {
                        this.player2Paddle2.dy = 0;
                    }
                }
            } else if (this.gameMode === '2v2_local') { // New 2 vs 2 local mode controls for Player 2
                // Player 2, Paddle 1 (front/delantera) - I/K
                if (this.keysPressed['i'] || this.keysPressed['I']) {
                    this.player2Paddle1.dy = -PADDLE_SPEED;
                } else if (this.keysPressed['k'] || this.keysPressed['K']) {
                    this.player2Paddle1.dy = PADDLE_SPEED;
                } else {
                    this.player2Paddle1.dy = 0;
                }

                // Player 2, Paddle 2 (back/trasera) - ArrowUp/ArrowDown
                if (this.player2Paddle2) {
                    if (this.keysPressed['ArrowUp']) {
                        this.player2Paddle2.dy = -PADDLE_SPEED;
                    } else if (this.keysPressed['ArrowDown']) {
                        this.player2Paddle2.dy = PADDLE_SPEED;
                    } else {
                        this.player2Paddle2.dy = 0;
                    }
                }
            }
        } else {
            // If it's mobile and not AI mode, Player 2's paddles remain still
            this.player2Paddle1.dy = 0;
            if (this.player2Paddle2) {
                this.player2Paddle2.dy = 0;
            }
        }

        // Apply paddle movements
        this.player1.y += this.player1.dy;
        this.player1.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player1.y));
        if (this.player1Paddle2) {
            this.player1Paddle2.y += this.player1Paddle2.dy;
            this.player1Paddle2.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player1Paddle2.y));
        }
        this.player2Paddle1.y += this.player2Paddle1.dy;
        this.player2Paddle1.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player2Paddle1.y));
        if (this.player2Paddle2) { // Update position for player2Paddle2
            this.player2Paddle2.y += this.player2Paddle2.dy;
            this.player2Paddle2.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.player2Paddle2.y));
        }

        // Store previous ball position (useful for tunnel detection in collisions)
        const prevBallX = this.ball.x;

        // Move the ball
        this.ball.x += this.ball.currentDx;
        this.ball.y += this.ball.currentDy;

        // Ball collision with top/bottom walls
        if (this.ball.y - BALL_RADIUS < 0 || this.ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
            this.ball.currentDy *= -BALL_SPEED_INCREASE_FACTOR;
            this.ball.currentDy = Math.sign(this.ball.currentDy) * Math.min(Math.abs(this.ball.currentDy), MAX_BALL_SPEED);
        }

        // Ball collision with paddles
        this.checkPaddleCollision(this.player1, prevBallX);
        if (this.player1Paddle2) { // Check for player1Paddle2 in 2v1 and 2v2
            this.checkPaddleCollision(this.player1Paddle2, prevBallX);
        }

        this.checkPaddleCollision(this.player2Paddle1, prevBallX);
        if (this.player2Paddle2) { // Check for player2Paddle2 in 1v2 and 2v2
            this.checkPaddleCollision(this.player2Paddle2, prevBallX);
        }

        // Scoring and ball reset
        if (this.ball.x - BALL_RADIUS < 0) {
            this.score2++;
            if (this.score2 >= MAX_SCORE) {
                this.gameState = GAME_STATE.GAME_OVER;
            } else {
                this.resetBall();
            }
        } else if (this.ball.x + BALL_RADIUS > CANVAS_WIDTH) {
            this.score1++;
            if (this.score1 >= MAX_SCORE) {
                this.gameState = GAME_STATE.GAME_OVER;
            } else {
                this.resetBall();
            }
        }
    }

    /**
     * Helper function to check and resolve paddle collision for a given paddle.
     * @param paddle The paddle to check collision against.
     * @param prevBallX The ball's X position in the previous frame.
     */
    protected checkPaddleCollision(paddle: Paddle, prevBallX: number): boolean {
        const ballLeft = this.ball.x - BALL_RADIUS;
        const ballRight = this.ball.x + BALL_RADIUS;
        const ballTop = this.ball.y - BALL_RADIUS;
        const ballBottom = this.ball.y + BALL_RADIUS;

        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + PADDLE_WIDTH;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + PADDLE_HEIGHT;

        // AABB (Axis-Aligned Bounding Box) collision detection
        if (ballRight > paddleLeft && ballLeft < paddleRight &&
            ballBottom > paddleTop && ballTop < paddleBottom) {

            // Clamp ball position to prevent tunneling, ensuring it doesn't go through the paddle
            // Check if ball crossed from left to right (hitting right paddle)
            if (this.ball.currentDx > 0 && prevBallX + BALL_RADIUS <= paddleLeft) {
                this.ball.x = paddleLeft - BALL_RADIUS;
            }
            // Check if ball crossed from right to left (hitting left paddle)
            else if (this.ball.currentDx < 0 && prevBallX - BALL_RADIUS >= paddleRight) {
                this.ball.x = paddleRight + BALL_RADIUS;
            }

            // Invert horizontal direction and apply increase factor
            this.ball.currentDx *= -BALL_SPEED_INCREASE_FACTOR;
            // Limit the magnitude of horizontal speed
            this.ball.currentDx = Math.sign(this.ball.currentDx) * Math.min(Math.abs(this.ball.currentDx), MAX_BALL_SPEED);

            // Adjust vertical speed (currentDy) based on hit point
            const hitPoint = (this.ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
            this.ball.currentDy = hitPoint * this.ball.dy; // Use base dy for angle calculation

            return true;
        }
        return false;
    }

    /**
     * Resets the ball to the center of the canvas and randomizes its initial direction.
     * Ball speed is reset to original values.
     */
    protected resetBall(): void {
        this.ball.x = CANVAS_WIDTH / 2;
        this.ball.y = CANVAS_HEIGHT / 2;
        // Reset current speeds to original base speeds, with a random initial horizontal direction
        this.ball.currentDx = this.ball.dx * (Math.random() > 0.5 ? 1 : -1);
        this.ball.currentDy = this.ball.dy * (Math.random() > 0.5 ? 1 : -1);
    }

    private draw(): void {
        clearCanvas(this.ctx);
        drawBackground(this.ctx);

        // Draw Player 1's paddles based on game mode
        drawPaddle(this.ctx, this.player1.x, this.player1.y);
        if (this.player1Paddle2) { // Draw player1Paddle2 if it exists (2v1 or 2v2)
            drawPaddle(this.ctx, this.player1Paddle2.x, this.player1Paddle2.y);
        }

        // Draw Player 2's paddles based on game mode
        drawPaddle(this.ctx, this.player2Paddle1.x, this.player2Paddle1.y);
        if (this.player2Paddle2) { // Draw player2Paddle2 if it exists (1v2 or 2v2)
            drawPaddle(this.ctx, this.player2Paddle2.x, this.player2Paddle2.y);
        }

        drawBall(this.ctx, this.ball.x, this.ball.y);
        drawScore(this.ctx, this.score1, this.score2);

        if (this.gameState === GAME_STATE.INITIAL) {
            // Changed from MESSAGES.INITIAL to MESSAGES.PRESS_SPACE
            drawMessage(this.ctx, MESSAGES.PRESS_SPACE);
        } else if (this.gameState === GAME_STATE.GAME_OVER) {
            const winnerMessage = this.score1 >= MAX_SCORE ? MESSAGES.PLAYER1_WINS : MESSAGES.PLAYER2_WINS;
            drawMessage(this.ctx, winnerMessage);
            this.showVictoryScreen(winnerMessage);
        } else if (this.gameState === GAME_STATE.COUNTDOWN) { // Dibuja la cuenta regresiva
            drawMessage(this.ctx, this.countdownValue.toString());
        }
    }

    private loop(): void {
        if (this.gameState === GAME_STATE.PLAYING || this.gameState === GAME_STATE.COUNTDOWN) {
            this.updateGameLogic(); // Call the renamed update method
        }
        this.draw();

        if (this.gameState !== GAME_STATE.STOPPED && this.gameState !== GAME_STATE.GAME_OVER) {
            this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        } else if (this.gameState === GAME_STATE.GAME_OVER && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Starts the countdown before the game begins.
     */
    public startCountdown(): void {
        // Only start countdown if currently in INITIAL state and not already counting down
        if (this.gameState === GAME_STATE.INITIAL) {
            this.gameState = GAME_STATE.COUNTDOWN;
            this.countdownTimer = 5000; // 5 seconds
            this.countdownValue = 5;
            console.log('Starting countdown. Game state:', this.gameState);
            if (!this.animationFrameId) {
                this.loop(); // Ensure loop is running for countdown
            }
        }
    }

    /**
     * This method is now used to officially start the game after countdown.
     * Changed to public so index.ts can call it (though countdown handles the actual state change).
     */
    public start(): void { // Changed from private to public
        if (this.gameState === GAME_STATE.COUNTDOWN) {
            this.gameState = GAME_STATE.PLAYING;
            this.isRunning = true; // Set isRunning when game starts
            console.log('Game started after countdown. New game state:', this.gameState);
        }
    }

    public pause(): void {
        console.warn("Pausing functionality has been removed.");
    }

    public resetGame(): void {
        this.score1 = 0;
        this.score2 = 0;

        // Reset player 1 paddles based on game mode
        if (this.gameMode === '2v1_local' || this.gameMode === '2v2_local') {
            this.player1.x = PADDLE_ADVANCE_OFFSET;
            this.player1.y = (CANVAS_HEIGHT / 2) - PADDLE_HEIGHT - (PADDLE_VERTICAL_SPACING / 2);
            if (this.player1Paddle2) {
                this.player1Paddle2.x = 0;
                this.player1Paddle2.y = (CANVAS_HEIGHT / 2) + (PADDLE_VERTICAL_SPACING / 2);
            }
        } else {
            this.player1.x = 0;
            this.player1.y = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
        }

        // Reset player 2 paddles based on game mode
        if (this.gameMode === '1v2_local' || this.gameMode === '2v2_local') {
            this.player2Paddle1.x = CANVAS_WIDTH - PADDLE_WIDTH - PADDLE_ADVANCE_OFFSET;
            this.player2Paddle1.y = (CANVAS_HEIGHT / 2) - PADDLE_HEIGHT - (PADDLE_VERTICAL_SPACING / 2);
            if (this.player2Paddle2) {
                this.player2Paddle2.x = CANVAS_WIDTH - PADDLE_WIDTH;
                this.player2Paddle2.y = (CANVAS_HEIGHT / 2) + (PADDLE_VERTICAL_SPACING / 2);
            }
        } else {
            this.player2Paddle1.x = CANVAS_WIDTH - PADDLE_WIDTH;
            this.player2Paddle1.y = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
        }

        this.resetBall();
        this.gameState = GAME_STATE.INITIAL;
        this.keysPressed = {};
        this.countdownTimer = 0; // Reiniciar temporizador
        this.countdownValue = 5; // Reiniciar valor de la cuenta
        this.isRunning = false; // Game is not running after reset, waiting for start
    }

    public stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.gameState = GAME_STATE.STOPPED;
        this.isRunning = false; // Ensure isRunning is false when stopped
    }

    /**
     * Shows the victory screen with a button to return to game mode selection
     */
    private showVictoryScreen(winnerMessage: string): void {
        // Check if victory overlay already exists
        let victoryOverlay = document.getElementById('victory-overlay');
        if (victoryOverlay) {
            return; // Already showing
        }

        // Create victory overlay
        victoryOverlay = document.createElement('div');
        victoryOverlay.id = 'victory-overlay';
        victoryOverlay.className = 'absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20 rounded-lg';
        
        const victoryContent = document.createElement('div');
        victoryContent.className = 'text-center p-6 bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl rounded-xl border border-[#003566] max-w-sm w-full mx-4';
        
        const victoryTitle = document.createElement('h3');
        victoryTitle.className = 'text-2xl md:text-3xl font-bold text-[#ffc300] mb-4';
        victoryTitle.textContent = winnerMessage;
        
        const victoryButton = document.createElement('button');
        victoryButton.className = 'bg-[#ffc300] text-[#000814] py-3 px-6 rounded-lg font-semibold hover:bg-[#ffd60a] transition-colors text-base';
        victoryButton.textContent = 'Volver al menú de selección';
        victoryButton.onclick = () => {
            this.stop();
            navigateTo('/play');
        };
        
        victoryContent.appendChild(victoryTitle);
        victoryContent.appendChild(victoryButton);
        victoryOverlay.appendChild(victoryContent);
        
        // Add to canvas container
        const canvasContainer = this.canvas.parentElement;
        if (canvasContainer) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(victoryOverlay);
        }
    }
}
