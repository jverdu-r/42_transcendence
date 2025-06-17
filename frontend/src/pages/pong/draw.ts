// src/pages/pong/draw.ts

/**
 * @file Drawing functions for the Pong game.
 * Handles rendering of the canvas, paddles, ball, score, and messages.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, COLORS } from './constants';

/**
 * Clears the entire canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * Draws the game background and the dashed middle line.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 */
export function drawBackground(ctx: CanvasRenderingContext2D): void {
    // Fill the background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw the dashed middle line
    ctx.beginPath();
    ctx.setLineDash([10, 10]); // Creates a dashed line (10px line, 10px gap)
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.strokeStyle = COLORS.LINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash to solid for other drawings
}

/**
 * Draws a paddle on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {number} x - The x-coordinate of the top-left corner of the paddle.
 * @param {number} y - The y-coordinate of the top-left corner of the paddle.
 */
export function drawPaddle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
}

/**
 * Draws the ball on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {number} x - The x-coordinate of the ball's center.
 * @param {number} y - The y-coordinate of the ball's center.
 */
export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2); // Draw a circle
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.fill();
    ctx.closePath();
}

/**
 * Draws the current scores for both players.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {number} score1 - Player 1's score.
 * @param {number} score2 - Player 2's score.
 */
export function drawScore(ctx: CanvasRenderingContext2D, score1: number, score2: number): void {
    ctx.font = '72px "Inter", sans-serif'; // Larger font for scores
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.textAlign = 'center';
    ctx.fillText(score1.toString(), CANVAS_WIDTH / 4, CANVAS_HEIGHT / 5);
    ctx.fillText(score2.toString(), CANVAS_WIDTH * 3 / 4, CANVAS_HEIGHT / 5);
}

/**
 * Draws a message on the center of the canvas, typically for game state (start, pause, game over).
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {string} message - The message to display.
 */
export function drawMessage(ctx: CanvasRenderingContext2D, message: string): void {
    ctx.font = '36px "Inter", sans-serif';
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.textAlign = 'center';
    ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}
