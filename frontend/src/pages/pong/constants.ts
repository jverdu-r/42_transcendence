        /**
         * @file Defines constants for the Pong game, including canvas dimensions, paddle/ball properties,
         * scores, colors, game states, and messages.
         */

        // Game area dimensions
        export const CANVAS_WIDTH = 800;
        export const CANVAS_HEIGHT = 600;

        // Paddle properties
        export const PADDLE_WIDTH = 15;
        export const PADDLE_HEIGHT = 100;
        export const PADDLE_SPEED = 6; // Speed at which paddles move
        export const PADDLE_VERTICAL_SPACING = 20;
        export const PADDLE_ADVANCE_OFFSET = 50; // Offset for 2-paddle configurations

        // Ball properties
        export const BALL_RADIUS = 10;
        export const BALL_SPEED_X = 5; // Initial horizontal speed of the ball
        export const BALL_SPEED_Y = 5; // Initial vertical speed of the ball
        export const BALL_SPEED_INCREASE_FACTOR = 1.05;
        export const MAX_BALL_SPEED = 20;

        // Game rules
        export const MAX_SCORE = 5; // Score needed to win the game

        // Custom color palette (Updated to Transcendence Theme)
        export const COLORS = {
            BACKGROUND: '#000814',       // Primary dark background
            FOREGROUND: '#ffc300',       // Vibrant gold for paddles and ball
            TEXT_PRIMARY: '#ffd60a',     // Slightly brighter gold for primary text
            TEXT_SECONDARY: '#003566',   // Dark blue for secondary elements
            LINE: '#001d3d'              // Very dark blue for the middle line, blending subtly
        };

        // Game states
        export const GAME_STATE = {
            INITIAL: 'INITIAL',
            COUNTDOWN: 'COUNTDOWN',
            PLAYING: 'PLAYING',
            PAUSED: 'PAUSED',
            GAME_OVER: 'GAME_OVER',
            STOPPED: 'STOPPED' // Added STOPPED state
        } as const; // 'as const' ensures that these are literal types

        // Messages for display
        export const MESSAGES = {
            PRESS_SPACE: 'PRESIONA ESPACIO PARA EMPEZAR',
            PLAYER1_WINS: '¡JUGADOR 1 GANA!',
            PLAYER2_WINS: '¡JUGADOR 2 GANA!',
            PAUSED: 'PAUSA',
            MATCH_CANCELLED: 'PARTIDA CANCELADA',
            GAME_STOPPED: 'Juego Detenido' // Added for clarity, though not used in game.ts in this context
        } as const;

        // Mobile breakpoint
        export const MOBILE_BREAKPOINT = 768; // px