// src/pages/pong/index.ts

/**
 * @file Main entry point for the Pong game page.
 * Renders the game interface and initializes the game.
 */

import { Game } from "./game"
import { navigateTo } from "../../router"
import { MOBILE_BREAKPOINT } from "./constants"
import { renderNavbar } from "../../components/navbar" // Importa el componente del navbar
import { getTranslation } from "../../i18n" // Importa las funciones de i18n

// Define the type for game mode and AI difficulty
export type GameMode =
  | "vs_ai"
  | "1v1_local"
  | "1v2_local"
  | "2v1_local"
  | "2v2_local" // Modos locales
  | "1v1_online"
  | "1v2_online"
  | "2v1_online"
  | "2v2_online" // Modos online
export type AIDifficulty = "EASY" | "MEDIUM" | "HARD"

let currentGame: Game | null = null // Variable para almacenar la instancia del juego actual

/**
 * Applies current translations to elements with data-i18n attributes within the pong page.
 */
function applyTranslations(gameMode: GameMode, aiDifficulty: AIDifficulty): void {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n")
    if (key) {
      const [component, textKey] = key.split(".")
      if (component && textKey) {
        element.textContent = getTranslation(component, textKey)
      }
    }
  })

  // Update dynamic text based on game mode and AI difficulty
  const startGamePromptElement = document.getElementById("start-game-prompt")
  if (startGamePromptElement) {
    let promptText = ""
    if (gameMode === "vs_ai") {
      promptText = getTranslation("pong", "startGamePromptSpace")
    } else if (gameMode.endsWith("_online")) {
      promptText = getTranslation("pong", "startGamePromptWaiting")
    } else {
      promptText = getTranslation("pong", "startGamePromptPlayers")
    }
    startGamePromptElement.innerHTML = promptText
  }

  // Update AI difficulty text
  const aiDifficultySpan = document.getElementById("ai-difficulty-span")
  if (aiDifficultySpan) {
    aiDifficultySpan.textContent = getTranslation("pong", aiDifficulty.toLowerCase())
  }
}

/**
 * Renders the Pong game page with canvas and controls.
 * This function is called when the user selects "Play against AI" or similar game modes.
 * @param gameMode The selected game mode ('vs_ai' | '1v1_local' | '1v2_local' | '2v1_local' | '2v2_local')
 * @param aiDifficulty The AI difficulty level ('EASY' | 'MEDIUM' | 'HARD'). Only applicable for 'vs_ai' mode.
 */
export function renderPongPage(gameMode: GameMode, aiDifficulty: AIDifficulty = 'MEDIUM', isOnlineMode: boolean = false): void {
  // Stop any existing game before starting a new one
  if (currentGame) {
    currentGame.stop()
    currentGame = null
  }

  // Check if this is an online mode (moved this here to use throughout the function)
  const isOnlineModeCheck = gameMode.endsWith("_online")
  
  // Don't return early for online mode when called with isOnlineMode = true
  // This allows online games to use the same design as local games

  // Continue with existing local game logic...
  renderNavbar("/play")

  // Rest of the existing function remains the same...

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT

  let player1ControlsHtml = ""
  let player2ControlsHtml = ""

  // Determine if it's an online mode to adjust UI for controls
  //const isOnlineMode = gameMode.endsWith('_online'); // Removed redeclaration

  // Helper to get translated player and paddle labels
  const getPlayerLabel = (playerNum: number) => getTranslation("pong", `player${playerNum}`)
  const getMoveUp = () => getTranslation("pong", "moveUp")
  const getMoveDown = () => getTranslation("pong", "moveDown")
  const getFrontPaddle = () => getTranslation("pong", "frontPaddle")
  const getBackPaddle = () => getTranslation("pong", "backPaddle")
  const getAIControlled = () => getTranslation("pong", "aiControlled")
  const getOnlineRemoteControls = () => getTranslation("pong", "onlineModeRemoteControls")
  const getMobileKeyboardNotAvailable = () => getTranslation("pong", "mobileKeyboardNotAvailable")

  if (isMobile) {
    // Mobile controls for Player 1 (either one or two paddles)
    player1ControlsHtml = `
            <div class="bg-[#001d3d] p-3 rounded-lg flex flex-col items-center gap-2 border border-[#003566] shadow-inner">
                <strong class="text-gray-200" data-i18n="pong.player1">${getPlayerLabel(1)}</strong>
                <div class="flex justify-center gap-4 w-full mb-2">
                    <button id="player1-up-button"
                            class="flex-1 bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
                        ${getMoveUp()} ${gameMode === "2v1_local" || gameMode === "2v2_local" ? getFrontPaddle() : ""}
                    </button>
                    <button id="player1-down-button"
                            class="flex-1 bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
                        ${getMoveDown()} ${gameMode === "2v1_local" || gameMode === "2v2_local" ? getFrontPaddle() : ""}
                    </button>
                </div>
                ${
                  (gameMode === "2v1_local" || gameMode === "2v2_local") && !isOnlineMode
                    ? `
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
                `
                    : ""
                }
            </div>
        `
    if (gameMode === "vs_ai") {
      player2ControlsHtml = `
                <div class="bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200">
                    <strong class="text-gray-200" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ${getAIControlled()} (<span class="text-[#ffc300] font-semibold" id="ai-difficulty-span">${getTranslation("pong", aiDifficulty.toLowerCase())}</span>)
                </div>
            `
    } else if (isOnlineMode) {
      // For online mode on mobile, show controls for the guest player (Player 2)
      player2ControlsHtml = `
                <div class="bg-[#001d3d] p-3 rounded-lg flex flex-col items-center gap-2 border border-[#003566] shadow-inner">
                    <strong class="text-gray-200" data-i18n="pong.player2">${getPlayerLabel(2)} (Guest)</strong>
                    <div class="flex justify-center gap-4 w-full mb-2">
                        <button id="player2-up-button"
                                class="flex-1 bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
                            ${getMoveUp()} ${gameMode === "1v2_online" || gameMode === "2v2_online" ? getFrontPaddle() : ""}
                        </button>
                        <button id="player2-down-button"
                                class="flex-1 bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
                            ${getMoveDown()} ${gameMode === "1v2_online" || gameMode === "2v2_online" ? getFrontPaddle() : ""}
                        </button>
                    </div>
                    ${
                      (gameMode === "1v2_online" || gameMode === "2v2_online")
                        ? `
                        <div class="flex justify-center gap-4 w-full">
                            <button id="player2-paddle2-up-button"
                                    class="flex-1 bg-gradient-to-r from-[#004b80] to-[#003566] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#003566] hover:to-[#004b80] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75">
                                ${getMoveUp()} ${getBackPaddle()}
                            </button>
                            <button id="player2-paddle2-down-button"
                                    class="flex-1 bg-gradient-to-r from-[#004b80] to-[#003566] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-md hover:from-[#003566] hover:to-[#004b80] transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75">
                                ${getMoveDown()} ${getBackPaddle()}
                            </button>
                        </div>
                    `
                        : ""
                    }
                </div>
            `
    } else {
      // For 1v1_local, 1v2_local, 2v1_local, 2v2_local on mobile, Player 2 uses keyboard which isn't supported by mobile buttons yet.
      player2ControlsHtml = `
                <div class="bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200">
                    <strong class="text-gray-200" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    <span class="text-red-500 font-semibold">${getMobileKeyboardNotAvailable()}</span>
                </div>
            `
    }
  } else {
    // Desktop Controls
    const commonControlBoxClasses = "bg-[#001d3d] p-3 rounded-lg border border-[#003566] shadow-inner text-gray-200"
    const strongPlayerClasses = "text-[#ffc300]"

    if (gameMode === "2v1_local") {
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
            `
      player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ↑ - ${getMoveUp()}<br>
                    ↓ - ${getMoveDown()}
                </div>
            `
    } else if (gameMode === "1v2_local") {
      player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `
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
            `
    } else if (gameMode === "2v2_local") {
      // New 2 vs 2 local mode controls
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
            `
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
            `
    } else if (gameMode === "1v1_local") {
      player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `
      player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ↑ - ${getMoveUp()}<br>
                    ↓ - ${getMoveDown()}
                </div>
            `
    } else if (gameMode === "vs_ai") {
      player1ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)}</strong><br>
                    W - ${getMoveUp()}<br>
                    S - ${getMoveDown()}
                </div>
            `
      player2ControlsHtml = `
                <div class="${commonControlBoxClasses}">
                    <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)}</strong><br>
                    ${getAIControlled()} (<span class="text-[#ffc300] font-semibold" id="ai-difficulty-span">${getTranslation("pong", aiDifficulty.toLowerCase())}</span>)
                </div>
            `
    } else if (isOnlineMode) {
      // Online mode controls display for desktop - differentiate based on game mode
      if (gameMode === "2v1_online" || gameMode === "2v2_online") {
        player1ControlsHtml = `
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div class="${commonControlBoxClasses}">
                          <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} (Host) ${getBackPaddle()}:</strong><br>
                          W - ${getMoveUp()}<br>
                          S - ${getMoveDown()}
                      </div>
                      <div class="${commonControlBoxClasses}">
                          <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} (Host) ${getFrontPaddle()}:</strong><br>
                          T - ${getMoveUp()}<br>
                          G - ${getMoveDown()}
                      </div>
                  </div>
              `
      } else {
        player1ControlsHtml = `
                  <div class="${commonControlBoxClasses}">
                      <strong class="${strongPlayerClasses}" data-i18n="pong.player1">${getPlayerLabel(1)} (Host)</strong><br>
                      W - ${getMoveUp()}<br>
                      S - ${getMoveDown()}
                  </div>
              `
      }
      
      if (gameMode === "1v2_online" || gameMode === "2v2_online") {
        player2ControlsHtml = `
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div class="${commonControlBoxClasses}">
                          <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} (Guest) ${getFrontPaddle()}:</strong><br>
                          ↑ - ${getMoveUp()}<br>
                          ↓ - ${getMoveDown()}
                      </div>
                      <div class="${commonControlBoxClasses}">
                          <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} (Guest) ${getBackPaddle()}:</strong><br>
                          O - ${getMoveUp()}<br>
                          L - ${getMoveDown()}
                      </div>
                  </div>
              `
      } else {
        player2ControlsHtml = `
                  <div class="${commonControlBoxClasses}">
                      <strong class="${strongPlayerClasses}" data-i18n="pong.player2">${getPlayerLabel(2)} (Guest)</strong><br>
                      ↑ - ${getMoveUp()}<br>
                      ↓ - ${getMoveDown()}
                  </div>
              `
      }
    }
  }

  // Set dynamic start game prompt - will be updated by applyTranslations
  const startGamePrompt = "" // Initial empty, will be filled by applyTranslations
  
  // Create mobile controls HTML (same as player1ControlsHtml for mobile)
  const mobileControlsHtml = isMobile ? player1ControlsHtml : ""

  const pongHtml = `
        <main id="main-content" class="flex-grow w-full p-2 sm:p-4 flex flex-col items-center justify-center relative mt-16 sm:mt-24 lg:mt-32 text-gray-100 animate__animated animate__fadeIn game-container safe-area-top safe-area-bottom">
            <div class="relative bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8 border border-[#003566] flex flex-col items-center w-full max-w-7xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
                <h2 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-[#ffc300] mb-3 sm:mb-4 drop-shadow-md text-center leading-tight"
                    data-i18n="pong.gameTitle">${getTranslation("pong", "gameTitle")}</h2>
                <div class="text-sm sm:text-base lg:text-lg text-gray-300 mb-4 sm:mb-6 text-center" id="start-game-prompt">${startGamePrompt}</div>
                
                <!-- Responsive Canvas Container -->
                <div class="relative w-full flex justify-center mb-4">
                    <div class="relative inline-block">
                        <canvas 
                            id="pongCanvas" 
                            class="border-2 border-[#003566] rounded-lg shadow-md bg-black max-w-full h-auto" 
                            width="800" 
                            height="600"
                            style="max-width: min(100vw - 2rem, 800px); max-height: min(70vh, 600px); width: 800px; height: 600px;"
                        ></canvas>
                        <!-- Overlay for online matchmaking -->
                        <div id="game-overlay" class="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10 rounded-lg" style="display: none;">
                            <div class="text-center p-4 sm:p-6 bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl rounded-xl border border-[#003566] max-w-sm w-full mx-4">
                                <h3 class="text-lg sm:text-xl md:text-2xl font-bold text-[#ffc300] mb-3 sm:mb-4" id="overlay-status"></h3>
                                <p class="text-sm sm:text-base text-gray-300 mb-3 sm:mb-4" id="overlay-message"></p>
                                <div id="overlay-opponent" class="text-base sm:text-lg text-[#ffc300] mb-3 sm:mb-4"></div>
                                <div id="overlay-loader" class="loader ease-linear rounded-full border-4 border-t-4 border-[#ffd60a] h-12 w-12 sm:h-16 sm:w-16 mb-3 sm:mb-4 mx-auto"></div>
                                <button id="overlay-cancel" class="bg-[#ffc300] text-[#000814] py-2 px-4 rounded-lg font-semibold hover:bg-[#ffd60a] transition-colors text-sm sm:text-base">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="game-info" class="text-base sm:text-lg font-semibold text-gray-100 mb-4 flex justify-around w-full max-w-md">
                    <span id="player1-score" class="text-[#ffd60a]" data-i18n="pong.player1">${getTranslation("pong", "player1")} 0</span>
                    <span id="player2-score" class="text-[#ffc300]" data-i18n="pong.player2">${getTranslation("pong", "player2")} 0</span>
                </div>
                
                <!-- Mobile Controls -->
                <div id="mobile-controls" class="block sm:hidden w-full mb-4">
                    ${mobileControlsHtml}
                </div>
                
                <!-- Desktop Controls Info -->
                <div id="desktop-controls" class="hidden sm:block w-full">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 max-w-2xl mx-auto">
                        ${player1ControlsHtml}
                        ${player2ControlsHtml}
                    </div>
                </div>

                <div class="mt-4 sm:mt-6 w-full flex justify-center">
                    <button 
                        id="back-to-play-button"
                        class="bg-[#001d3d] text-gray-200 py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-[#003566] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 text-sm sm:text-base"
                        data-i18n="pong.backToGameModes"
                    >
                        ${getTranslation("pong", "backToGameModes")}
                    </button>
                </div>
            </div>
        </main>
        <style>
            /* Canvas responsive sizing with Tailwind utility approach */
            #pongCanvas {
                background-color: #000;
                max-width: min(95vw, 800px);
                max-height: min(70vh, 600px);
                width: 800px;
                height: 600px;
            }
            
            @media (max-width: 1200px) {
                #pongCanvas {
                    max-width: min(95vw, 800px);
                    max-height: min(60vh, 600px);
                    width: auto;
                    height: auto;
                }
            }
            
            @media (max-width: 768px) {
                #pongCanvas {
                    max-width: min(90vw, 700px);
                    max-height: min(55vh, 525px);
                }
            }
            
            @media (max-width: 640px) {
                #pongCanvas {
                    max-width: min(85vw, 600px);
                    max-height: min(50vh, 450px);
                }
            }
            
            @media (max-width: 480px) {
                #pongCanvas {
                    max-width: min(80vw, 500px);
                    max-height: min(45vh, 375px);
                }
            }
            
            @media (max-width: 360px) {
                #pongCanvas {
                    max-width: min(75vw, 400px);
                    max-height: min(40vh, 300px);
                }
            }
            
            @media (min-width: 1024px) {
                #pongCanvas {
                    width: 800px;
                    height: 600px;
                }
            }
            
            /* High DPI display support */
            @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
                #pongCanvas {
                    image-rendering: pixelated;
                    image-rendering: crisp-edges;
                }
            }
        </style>
    `

  const appRoot = document.getElementById("app-root")
  if (appRoot) {
    appRoot.innerHTML = pongHtml

    // Apply translations initially
    applyTranslations(gameMode, aiDifficulty)

    // Add event listener for language change to re-apply translations
    window.removeEventListener("languageChange", () => applyTranslations(gameMode, aiDifficulty)) // Prevent duplicates
    window.addEventListener("languageChange", () => applyTranslations(gameMode, aiDifficulty))

    const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement
    if (!canvas) {
      console.error("Canvas element not found!")
      return
    }

    const game = new Game(canvas, gameMode, aiDifficulty, isMobile) // Pass isMobile to Game constructor
    currentGame = game // Store game instance
    ;(window as any).currentPongGame = game // Store game instance globally for access from other parts of the app

    // Initialize game and controls based on mode
    game.init()

    // Start game on space bar or touch
    const startGame = () => {
      if (!game.isRunning) {
        game.startCountdown() // Start countdown which then transitions to playing
        const promptElement = document.getElementById("start-game-prompt")
        if (promptElement) {
          promptElement.style.display = "none" // Hide prompt after game starts
        }
      }
    }

    if (isOnlineMode) {
      // Online mode: No manual start needed, the OnlineGameManager will handle starting automatically
      console.log('Online mode: Game will start automatically when both players are connected')
    } else {
      // Local modes and AI mode: start on space or touch
      document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
          e.preventDefault() // Prevent scrolling
          startGame()
        }
      })
      // For mobile, touch anywhere on the canvas to start
      if (isMobile) {
        canvas.addEventListener("touchstart", (e) => {
          e.preventDefault()
          startGame()
        })
      }
    }

    // Mobile controls event listeners (only for Player 1, Player 2 is desktop keyboard or AI)
    if (isMobile) {
      const player1UpButton = document.getElementById("player1-up-button")
      const player1DownButton = document.getElementById("player1-down-button")
      const player1Paddle2UpButton = document.getElementById("player1-paddle2-up-button")
      const player1Paddle2DownButton = document.getElementById("player1-paddle2-down-button")

      if (player1UpButton && player1DownButton) {
        // Touch events for primary paddle
        player1UpButton.addEventListener("touchstart", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.movePlayer1Up()
        }, { passive: false })
        
        player1UpButton.addEventListener("touchend", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.stopPlayer1()
        }, { passive: false })
        
        player1UpButton.addEventListener("touchcancel", (e) => {
          e.preventDefault()
          game.stopPlayer1()
        })

        player1DownButton.addEventListener("touchstart", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.movePlayer1Down()
        }, { passive: false })
        
        player1DownButton.addEventListener("touchend", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.stopPlayer1()
        }, { passive: false })
        
        player1DownButton.addEventListener("touchcancel", (e) => {
          e.preventDefault()
          game.stopPlayer1()
        })

        // Also add mouse events for debugging and desktop touch screens
        player1UpButton.addEventListener("mousedown", (e) => {
          e.preventDefault()
          game.movePlayer1Up()
        })
        
        player1UpButton.addEventListener("mouseup", (e) => {
          e.preventDefault()
          game.stopPlayer1()
        })
        
        player1UpButton.addEventListener("mouseleave", (e) => {
          game.stopPlayer1()
        })

        player1DownButton.addEventListener("mousedown", (e) => {
          e.preventDefault()
          game.movePlayer1Down()
        })
        
        player1DownButton.addEventListener("mouseup", (e) => {
          e.preventDefault()
          game.stopPlayer1()
        })
        
        player1DownButton.addEventListener("mouseleave", (e) => {
          game.stopPlayer1()
        })
      }

      // Mobile controls for Player 1's second paddle in 2v1 and 2v2 modes
      if (player1Paddle2UpButton && player1Paddle2DownButton) {
        // Touch events for second paddle
        player1Paddle2UpButton.addEventListener("touchstart", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.movePlayer1Paddle2Up()
        }, { passive: false })
        
        player1Paddle2UpButton.addEventListener("touchend", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.stopPlayer1Paddle2()
        }, { passive: false })
        
        player1Paddle2UpButton.addEventListener("touchcancel", (e) => {
          e.preventDefault()
          game.stopPlayer1Paddle2()
        })

        player1Paddle2DownButton.addEventListener("touchstart", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.movePlayer1Paddle2Down()
        }, { passive: false })
        
        player1Paddle2DownButton.addEventListener("touchend", (e) => {
          e.preventDefault()
          e.stopPropagation()
          game.stopPlayer1Paddle2()
        }, { passive: false })
        
        player1Paddle2DownButton.addEventListener("touchcancel", (e) => {
          e.preventDefault()
          game.stopPlayer1Paddle2()
        })

        // Also add mouse events for second paddle
        player1Paddle2UpButton.addEventListener("mousedown", (e) => {
          e.preventDefault()
          game.movePlayer1Paddle2Up()
        })
        
        player1Paddle2UpButton.addEventListener("mouseup", (e) => {
          e.preventDefault()
          game.stopPlayer1Paddle2()
        })
        
        player1Paddle2UpButton.addEventListener("mouseleave", (e) => {
          game.stopPlayer1Paddle2()
        })

        player1Paddle2DownButton.addEventListener("mousedown", (e) => {
          e.preventDefault()
          game.movePlayer1Paddle2Down()
        })
        
        player1Paddle2DownButton.addEventListener("mouseup", (e) => {
          e.preventDefault()
          game.stopPlayer1Paddle2()
        })
        
        player1Paddle2DownButton.addEventListener("mouseleave", (e) => {
          game.stopPlayer1Paddle2()
        })
      }

      // Mobile controls for Player 2 in online mode
      if (isOnlineMode) {
        const player2UpButton = document.getElementById("player2-up-button")
        const player2DownButton = document.getElementById("player2-down-button")
        const player2Paddle2UpButton = document.getElementById("player2-paddle2-up-button")
        const player2Paddle2DownButton = document.getElementById("player2-paddle2-down-button")

        if (player2UpButton && player2DownButton) {
          // Touch events for Player 2 primary paddle
          player2UpButton.addEventListener("touchstart", (e) => {
            e.preventDefault()
            e.stopPropagation()
            // Call game method that will map to appropriate paddle based on host/guest role
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Up) {
              (window as any).currentPongGame.movePlayer2Up()
            }
          }, { passive: false })
          
          player2UpButton.addEventListener("touchend", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          }, { passive: false })
          
          player2UpButton.addEventListener("touchcancel", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          })

          player2DownButton.addEventListener("touchstart", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Down) {
              (window as any).currentPongGame.movePlayer2Down()
            }
          }, { passive: false })
          
          player2DownButton.addEventListener("touchend", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          }, { passive: false })
          
          player2DownButton.addEventListener("touchcancel", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          })

          // Also add mouse events for Player 2
          player2UpButton.addEventListener("mousedown", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Up) {
              (window as any).currentPongGame.movePlayer2Up()
            }
          })
          
          player2UpButton.addEventListener("mouseup", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          })
          
          player2UpButton.addEventListener("mouseleave", (e) => {
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          })

          player2DownButton.addEventListener("mousedown", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Down) {
              (window as any).currentPongGame.movePlayer2Down()
            }
          })
          
          player2DownButton.addEventListener("mouseup", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          })
          
          player2DownButton.addEventListener("mouseleave", (e) => {
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2) {
              (window as any).currentPongGame.stopPlayer2()
            }
          })
        }

        // Mobile controls for Player 2's second paddle in multi-paddle modes
        if (player2Paddle2UpButton && player2Paddle2DownButton) {
          // Touch events for Player 2 second paddle
          player2Paddle2UpButton.addEventListener("touchstart", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Paddle2Up) {
              (window as any).currentPongGame.movePlayer2Paddle2Up()
            }
          }, { passive: false })
          
          player2Paddle2UpButton.addEventListener("touchend", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          }, { passive: false })
          
          player2Paddle2UpButton.addEventListener("touchcancel", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          })

          player2Paddle2DownButton.addEventListener("touchstart", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Paddle2Down) {
              (window as any).currentPongGame.movePlayer2Paddle2Down()
            }
          }, { passive: false })
          
          player2Paddle2DownButton.addEventListener("touchend", (e) => {
            e.preventDefault()
            e.stopPropagation()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          }, { passive: false })
          
          player2Paddle2DownButton.addEventListener("touchcancel", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          })

          // Also add mouse events for Player 2 second paddle
          player2Paddle2UpButton.addEventListener("mousedown", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Paddle2Up) {
              (window as any).currentPongGame.movePlayer2Paddle2Up()
            }
          })
          
          player2Paddle2UpButton.addEventListener("mouseup", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          })
          
          player2Paddle2UpButton.addEventListener("mouseleave", (e) => {
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          })

          player2Paddle2DownButton.addEventListener("mousedown", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.movePlayer2Paddle2Down) {
              (window as any).currentPongGame.movePlayer2Paddle2Down()
            }
          })
          
          player2Paddle2DownButton.addEventListener("mouseup", (e) => {
            e.preventDefault()
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          })
          
          player2Paddle2DownButton.addEventListener("mouseleave", (e) => {
            if ((window as any).currentPongGame && (window as any).currentPongGame.stopPlayer2Paddle2) {
              (window as any).currentPongGame.stopPlayer2Paddle2()
            }
          })
        }
      }

      console.log("Mobile controls initialized for game mode:", gameMode, "Online mode:", isOnlineMode)
    }

    // Moved the back button listener inside renderPongPage
    const backButton = document.getElementById("back-to-play-button")
    if (backButton) {
      backButton.addEventListener("click", () => {
        if (currentGame) {
          // Use the module-level currentGame variable
          currentGame.stop()
          currentGame = null // Clear the reference
        }
        navigateTo("/play")
      })
    }
  } else {
    console.error('Element with id "app-root" not found for rendering the Pong page.')
  }
}

// Enhanced beforeunload handler to prevent accidental page refresh during games
window.addEventListener("beforeunload", (event) => {
  if (currentGame && currentGame.isRunning) {
    // Prevent page refresh during active games
    event.preventDefault()
    event.returnValue = "Hay una partida en progreso. ¿Seguro que quieres salir?"
    return "Hay una partida en progreso. ¿Seguro que quieres salir?"
  }
  
  if (currentGame) {
    // Stop the game if user really wants to leave
    currentGame.stop()
  }
})

// Save game state to localStorage for potential recovery
function saveGameState() {
  if (currentGame && currentGame.isRunning) {
    const gameState = {
      gameMode: (currentGame as any).gameMode,
      timestamp: Date.now(),
      isOnline: (window as any).isOnlineMode || false
    }
    localStorage.setItem('pongGameState', JSON.stringify(gameState))
  }
}

// Try to restore game state on page load
function tryRestoreGameState() {
  const savedState = localStorage.getItem('pongGameState')
  if (savedState) {
    try {
      const gameState = JSON.parse(savedState)
      const timeSinceLastGame = Date.now() - gameState.timestamp
      
      // Only restore if less than 5 minutes have passed
      if (timeSinceLastGame < 5 * 60 * 1000) {
        // Navigate back to the game
        if (gameState.isOnline) {
          // For online games, show a message and return to game selection
          console.log('Online game was interrupted, returning to game selection')
          setTimeout(() => {
            alert('Se detectó una partida online interrumpida. Volviendo al menú de selección.')
            navigateTo('/play')
          }, 1000)
        } else {
          // For local games, could potentially restore the exact state
          console.log('Local game was interrupted, could restore state:', gameState)
        }
      }
    } catch (error) {
      console.error('Error restoring game state:', error)
    }
    
    // Clear the saved state
    localStorage.removeItem('pongGameState')
  }
}

// Save state periodically during games
setInterval(() => {
  if (currentGame && currentGame.isRunning) {
    saveGameState()
  }
}, 5000) // Every 5 seconds

// Try to restore state when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryRestoreGameState)
} else {
  tryRestoreGameState()
}
