// src/pages/pong/index.ts

/**
 * @file Main entry point for the Pong game page.
 * Renders the game interface and initializes the game.
 */

import { Game } from './game';
import { navigateTo } from '../../router';
import { MOBILE_BREAKPOINT } from './constants';
import { renderNavbar } from '../../components/navbar'; // Importa el componente del navbar
import { getTranslation, setLanguage, getCurrentLanguage } from '../../i18n'; // Importa las funciones de i18n

// Define the type for game mode and AI difficulty
export type GameMode = 'vs_ai' | '1v1_local' | '1v2_local' | '2v1_local' | '2v2_local' // Modos locales
                     | '1v1_online' | '1v2_online' | '2v1_online' | '2v2_online'; // Modos online
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

let currentGame: Game | null = null; // Variable para almacenar la instancia del juego actual

/**
 * Applies current translations to elements with data-i18n attributes within the pong page.
 */
function applyTranslations(gameMode: GameMode, aiDifficulty: AIDifficulty): void {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const [component, textKey] = key.split('.');
            if (component && textKey) {
                element.textContent = getTranslation(component, textKey);
            }
        }
    });

    // Update dynamic text based on game mode and AI difficulty
    const startGamePromptElement = document.getElementById('start-game-prompt');
    if (startGamePromptElement) {
        let promptText = '';
        if (gameMode === 'vs_ai') {
            promptText = getTranslation('pong', 'startGamePromptSpace');
        } else if (gameMode.endsWith('_online')) {
            promptText = getTranslation('pong', 'startGamePromptWaiting');
        } else {
            promptText = getTranslation('pong', 'startGamePromptPlayers');
        }
        startGamePromptElement.innerHTML = promptText;
    }

    // Update AI difficulty text
    const aiDifficultySpan = document.getElementById('ai-difficulty-span');
    if (aiDifficultySpan) {
        aiDifficultySpan.textContent = getTranslation('pong', aiDifficulty.toLowerCase());
    }
}

/**
 * Renders the Pong game page with canvas and controls.
 * This function is called when the user selects "Play against AI" or similar game modes.
 * @param gameMode The selected game mode ('vs_ai' | '1v1_local' | '1v2_local' | '2v1_local' | '2v2_local')
 * @param aiDifficulty The AI difficulty level ('EASY' | 'MEDIUM' | 'HARD'). Only applicable for 'vs_ai' mode.
 */
export function renderPongPage(gameMode: GameMode = '1v1_local', aiDifficulty: AIDifficulty = 'MEDIUM'): void {
    // Stop any existing game before starting a new one
    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }

    // Render the navbar separately
    renderNavbar('/play'); // Assuming '/play' is the active link for the game page

    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;

    let player1ControlsHtml = '';
    let player2ControlsHtml = '';

    // Determine if it's an online mode to adjust UI for controls
    const isOnlineMode = gameMode.endsWith('_online');

    // Helper to get translated player and paddle labels
    const getPlayerLabel = (playerNum: number) => getTranslation('pong', `player${playerNum}`);
    const getMoveUp = () => getTranslation('pong', 'moveUp');
    const getMoveDown = () => getTranslation('pong', 'moveDown');
    const getFrontPaddle = () => getTranslation('pong', 'frontPaddle');
    const getBackPaddle = () => getTranslation('pong', 'backPaddle');
    const getAIControlled = () => getTranslation('pong', 'aiControlled');
    const getOnlineRemoteControls = () => getTranslation('pong', 'onlineModeRemoteControls');
    const getMobileKeyboardNotAvailable = () => getTranslation('pong', 'mobileKeyboardNotAvailable');


    if (isMobile) {
        // Mobile controls for Player 1 (either one or two paddles)
        player1ControlsHtml = `
            <div class="bg-[#001d3d] p-3 rounded-lg flex flex-col items-center gap-2 border border-[#003566] shadow-inner">
                <strong class="text-gray-200" data-i18n="pong.player1">${getPlayerLabel(1)}</strong>
                <div class="flex justify-center gap-4 w-full mb-2">
                    <button id="player1-up-button"
                            class="flex-1 bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
                        ${getMoveUp()} ${gameMode === '2v1_local' || gameMode === '2v2_local' ? getFrontPaddle() : ''}
                    </button>
                    <button id="player1-down-button"
                            class="flex-1 bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
                        ${getMoveDown()} ${gameMode === '2v1_local' || gameMode === '2v2_local' ? getFrontPaddle() : ''}
                    </button>
                </div>
                ${(gameMode === '2v1_local' || gameMode === '2v2_local') && !isOnlineMode ? `
                    <div class="flex justify-center gap-4 w-full">
                        <button id="player1-paddle2-up-button"
                                class="flex-1 bg-gradient-to-r from-[#004b80] to-[#003566] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#003566] hover:to-[#004b80] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75">
                            ${getMoveUp()} ${getBackPaddle()}
                        </button>
                        <button id="player1-paddle2-down-button"
                                class="flex-1 bg-gradient-to-r from-[#004b80] to-[#003566] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#003566] hover:to-[#004b80] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75">
                            ${getMoveDown()} ${getBackPaddle()}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        if (gameMode === 'vs_ai') {
            player2ControlsHtml = `
                <div class="bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200">
                    <strong class="text-gray-200" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ${getAIControlled()} (<span class="text-[#ffc300] font-semibold" id="ai-difficulty-span">${getTranslation('pong', aiDifficulty.toLowerCase())}</span>)
                </div>
            `;
        } else if (isOnlineMode) {
             player2ControlsHtml = `
                <div class="bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200">
                    <strong class="text-gray-200" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    <span class="text-red-500 font-semibold">${getOnlineRemoteControls()}</span>
                </div>
            `;
        }
        else {
            // For 1v1_local, 1v2_local, 2v1_local, 2v2_local on mobile, Player 2 uses keyboard which isn't supported by mobile buttons yet.
            player2ControlsHtml = `
                <div class="bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200">
                    <strong class="text-gray-200" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    <span class="text-red-500 font-semibold">${getMobileKeyboardNotAvailable()}</span>
                </div>
            `;
        }
    } else {
        // Desktop Controls
        const commonControlBoxClasses = "bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200";
        const strongPlayerClasses = "text-[#ffc300]";

        if (gameMode === '2v1_local') {
            player1ControlsHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} ${getBackPaddle()}:</strong><br>
                        W - ${getMoveUp()}<br>
                        S - ${getMoveDown()}
                    </div>
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} ${getFrontPaddle()}:</strong><br>
                        T - ${getMoveUp()}<br>
                        G - ${getMoveDown()}
                    </div>
                </div>
            `;
            player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ↑ - ${getMoveUp()}<br>
                    ↓ - ${getMoveDown()}
                </div>
            `;
        } else if (gameMode === '1v2_local') {
            player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `;
            player2ControlsHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} ${getFrontPaddle()}:</strong><br>
                        K - ${getMoveUp()}<br>
                        M - ${getMoveDown()}
                    </div>
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} ${getBackPaddle()}:</strong><br>
                        ↑ - ${getMoveUp()}<br>
                        ↓ - ${getMoveDown()}
                    </div>
                </div>
            `;
        } else if (gameMode === '2v2_local') { // New 2 vs 2 local mode controls
            player1ControlsHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} ${getBackPaddle()}:</strong><br>
                        W - ${getMoveUp()}<br>
                        S - ${getMoveDown()}
                    </div>
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} ${getFrontPaddle()}:</strong><br>
                        T - ${getMoveUp()}<br>
                        G - ${getMoveDown()}
                    </div>
                </div>
            `;
            player2ControlsHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} ${getFrontPaddle()}:</strong><br>
                        I - ${getMoveUp()}<br>
                        K - ${getMoveDown()}
                    </div>
                    <div class="${commonControlBoxClasses}">
                        <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} ${getBackPaddle()}:</strong><br>
                        ↑ - ${getMoveUp()}<br>
                        ↓ - ${getMoveDown()}
                    </div>
                </div>
            `;
        } else if (gameMode === '1v1_local') {
            player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `;
            player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ↑ - ${getMoveUp()}<br>
                    ↓ - ${getMoveDown()}
                </div>
            `;
        } else if (gameMode === 'vs_ai') {
            player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `;
            player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ${getAIControlled()} (<span class="text-[#ffc300] font-semibold" id="ai-difficulty-span">${getTranslation('pong', aiDifficulty.toLowerCase())}</span>)
                </div>
            `;
        } else if (isOnlineMode) { // Generic online mode controls display for desktop
            player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `;
            player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    <span class="text-red-500 font-semibold">${getOnlineRemoteControls()}</span>
                </div>
            `;
        }
    }
    
    // Set dynamic start game prompt - will be updated by applyTranslations
    let startGamePrompt = ''; // Initial empty, will be filled by applyTranslations

    const pongHtml = `
        <main id="main-content" class="flex-grow w-full p-4 flex flex-col items-center justify-center relative mt-24 sm:mt-32 text-gray-100 animate__animated animate__fadeIn">
            <div class="relative bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-[#003566] flex flex-col items-center max-w-4xl w-full transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
                <h2 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-4 drop-shadow-md text-center leading-tight"
                    data-i18n="pong.gameTitle">${getTranslation('pong', 'gameTitle')}</h2>
                <div class="text-lg text-gray-300 mb-6 text-center" id="start-game-prompt">${startGamePrompt}</div>
                <canvas id="pongCanvas" class="border-2 border-[#003566] rounded-lg shadow-md mb-4 bg-black" width="800" height="600"></canvas>
                <div id="game-info" class="text-lg font-semibold text-gray-100 mb-4 flex justify-around w-full">
                    <span id="player1-score" class="text-[#ffd60a]" data-i18n="pong.player1">${getTranslation('pong', 'player1')} 0</span>
                    <span id="player2-score" class="text-[#ffc300]" data-i18n="pong.player2">${getTranslation('pong', 'player2')} 0</span>
                </div>
                
                <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    ${player1ControlsHtml}
                    ${player2ControlsHtml}
                </div>

                <div class="mt-6 w-full flex justify-center">
                    <button 
                        id="back-to-play-button"
                        class="bg-[#001d3d] text-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-[#003566] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
                        data-i18n="pong.backToGameModes"
                    >
                        ${getTranslation('pong', 'backToGameModes')}
                    </button>
                </div>
            </div>
        </main>
        <style>
            .animate__animated.animate__fadeIn {
                animation-duration: 0.5s;
            }

            /* Custom Shadow for Hover Effect (deeper glow) */
            .hover\\:shadow-custom-deep:hover {
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3); /* Deeper, yellowish glow */
            }
            /* Ensure the canvas background is black for Pong */
            #pongCanvas {
                background-color: #000;
            }
        </style>
    `;

    const appRoot = document.getElementById('app-root');
    if (appRoot) {
        appRoot.innerHTML = pongHtml;

        // Apply translations initially
        applyTranslations(gameMode, aiDifficulty);

        // Add event listener for language change to re-apply translations
        window.removeEventListener('languageChange', () => applyTranslations(gameMode, aiDifficulty)); // Prevent duplicates
        window.addEventListener('languageChange', () => applyTranslations(gameMode, aiDifficulty));

        const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
        if (!canvas) {
            console.error('Canvas element not found!');
            return;
        }

        const game = new Game(canvas, gameMode, aiDifficulty, isMobile); // Pass isMobile to Game constructor
        currentGame = game; // Store game instance
        (window as any).currentPongGame = game; // Store game instance globally for access from other parts of the app

        // Initialize game and controls based on mode
        game.init();

        // Start game on space bar or touch
        const startGame = () => {
            if (!game.isRunning) {
                game.startCountdown(); // Start countdown which then transitions to playing
                const promptElement = document.getElementById('start-game-prompt');
                if (promptElement) {
                    promptElement.style.display = 'none'; // Hide prompt after game starts
                }
            }
        };

        if (isOnlineMode) {
             // In online mode, the game starts when the server sends the signal
             // For now, we'll simulate the start after a brief delay
             // setTimeout(() => {
             //    startGame(); // Game will be started by the online matchmaking logic
             // }, 3000);
        } else {
            // Local modes and AI mode: start on space or touch
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space') {
                    e.preventDefault(); // Prevent scrolling
                    startGame();
                }
            });
            // For mobile, touch anywhere on the canvas to start
            if (isMobile) {
                canvas.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    startGame();
                });
            }
        }
        
        // Mobile controls event listeners (only for Player 1, Player 2 is desktop keyboard or AI)
        if (isMobile) {
            const player1UpButton = document.getElementById('player1-up-button');
            const player1DownButton = document.getElementById('player1-down-button');
            const player1Paddle2UpButton = document.getElementById('player1-paddle2-up-button');
            const player1Paddle2DownButton = document.getElementById('player1-paddle2-down-button');

            if (player1UpButton && player1DownButton) {
                player1UpButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    game.movePlayer1Up();
                });
                player1UpButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    game.stopPlayer1();
                });

                player1DownButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    game.movePlayer1Down();
                });
                player1DownButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    game.stopPlayer1();
                });
            }

            // Mobile controls for Player 1's second paddle in 2v1 and 2v2 modes
            if (player1Paddle2UpButton && player1Paddle2DownButton) {
                player1Paddle2UpButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    game.movePlayer1Paddle2Up();
                });
                player1Paddle2UpButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    game.stopPlayer1Paddle2();
                });

                player1Paddle2DownButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    game.movePlayer1Paddle2Down();
                });
                player1Paddle2DownButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    game.stopPlayer1Paddle2(); // Stop paddle 2 movement
                });
            }
        }

        // Moved the back button listener inside renderPongPage
        const backButton = document.getElementById('back-to-play-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                if (currentGame) { // Use the module-level currentGame variable
                    currentGame.stop();
                    currentGame = null; // Clear the reference
                }
                navigateTo('/play');
            });
        }
    } else {
        console.error('Element with id "app-root" not found for rendering the Pong page.');
    }
}

// The window.addEventListener('beforeunload') should ideally be managed globally
// or removed and re-added to avoid memory leaks if renderPongPage is called frequently.
// For now, keep it outside as it's a global listener.
window.addEventListener('beforeunload', () => {
    if (currentGame) { // Use the module-level currentGame variable
        currentGame.stop();
    }
});