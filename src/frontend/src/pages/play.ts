// Importa la función renderPongPage desde el módulo del juego Pong
import { renderPongPage } from "./pong/index"
// Importa el MOBILE_BREAKPOINT para detectar dispositivos móviles
import { MOBILE_BREAKPOINT } from "./pong/constants"
// Importa las funciones de internacionalización (solo necesitamos getTranslation para el contenido de la página)
import { getTranslation } from "../i18n"

/**
 * Checks if the current window width is considered a mobile dimension.
 * @returns {boolean} True if it's a mobile dimension, false otherwise.
 */
function isMobileDevice(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

/**
 * Applies current translations to elements with data-i18n attributes.
 */
function applyTranslations(): void {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n")
    if (key) {
      const [component, textKey] = key.split(".")
      if (component && textKey) {
        // Check if it's a special case like the tournament button's coming soon span
        if (element.tagName === "SPAN" && element.classList.contains("text-sm")) {
          element.textContent = getTranslation(component, textKey)
        } else {
          element.textContent = getTranslation(component, textKey)
        }
      }
    }
  })
}

/**
 * Renders the main play page with game mode selections.
 */
export function renderPlay(): void {
  const playHtml = `
    <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div class="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 bg-white/5 backdrop-blur-xl border border-tertiary-bg shadow-2xl w-full text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-accent/20">
          <h2 class="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-accent mb-4 sm:mb-6 lg:mb-8 drop-shadow-md leading-tight" data-i18n="play.chooseModeTitle">${getTranslation("play", "chooseModeTitle")}</h2>
          <p class="text-sm xs:text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto" data-i18n="play.chooseModeDescription">${getTranslation("play", "chooseModeDescription")}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-4 md:gap-6">
            <button
              id="play-ia-button"
              class="group bg-secondary-bg text-gray-100 py-3 sm:py-4 lg:py-5 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl font-bold text-sm xs:text-base sm:text-lg lg:text-xl hover:bg-tertiary-bg hover:text-accent transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-light focus:ring-opacity-75 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] touch-manipulation"
              data-i18n="play.vsAIButton"
            >
              ${getTranslation("play", "vsAIButton")}
            </button>

            <button
              id="play-1v1-button"
              class="group bg-secondary-bg text-gray-100 py-3 sm:py-4 lg:py-5 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl font-bold text-sm xs:text-base sm:text-lg lg:text-xl hover:bg-tertiary-bg hover:text-accent transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-light focus:ring-opacity-75 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] touch-manipulation"
              data-i18n="play.oneVsOneButton"
            >
              ${getTranslation("play", "oneVsOneButton")}
            </button>

            <button
              id="play-2v2-button"
              class="group bg-secondary-bg text-gray-100 py-3 sm:py-4 lg:py-5 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl font-bold text-sm xs:text-base sm:text-lg lg:text-xl hover:bg-tertiary-bg hover:text-accent transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-light focus:ring-opacity-75 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] touch-manipulation"
              data-i18n="play.twoVsTwoButton"
            >
              ${getTranslation("play", "twoVsTwoButton")}
            </button>

            <button
              id="play-1v2-button"
              class="group bg-secondary-bg text-gray-100 py-3 sm:py-4 lg:py-5 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl font-bold text-sm xs:text-base sm:text-lg lg:text-xl hover:bg-tertiary-bg hover:text-accent transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-light focus:ring-opacity-75 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] touch-manipulation"
              data-i18n="play.oneVsTwoButton"
            >
              ${getTranslation("play", "oneVsTwoButton")}
            </button>

            <button
              id="play-2v1-button"
              class="group bg-secondary-bg text-gray-100 py-3 sm:py-4 lg:py-5 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl font-bold text-sm xs:text-base sm:text-lg lg:text-xl hover:bg-tertiary-bg hover:text-accent transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-light focus:ring-opacity-75 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] touch-manipulation"
              data-i18n="play.twoVsOneButton"
            >
              ${getTranslation("play", "twoVsOneButton")}
            </button>

            <button
              id="play-tournament-button"
              class="group bg-gradient-to-r from-accent to-accent-light text-primary-bg py-3 sm:py-4 lg:py-5 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl font-bold text-sm xs:text-base sm:text-lg lg:text-xl hover:from-accent-light hover:to-accent transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] col-span-1 sm:col-span-2 lg:col-span-3 max-w-md mx-auto w-full touch-manipulation"
              data-i18n="play.tournamentButton"
            >
              <span class="block sm:inline">${getTranslation("play", "tournamentButton")}</span>
              <span class="block sm:inline text-xs sm:text-sm font-normal opacity-80 mt-1 sm:mt-0 sm:ml-2" data-i18n="play.comingSoon">${getTranslation("play", "comingSoon")}</span>
            </button>
          </div>
      </div>
    </div>
  `

  // Asumimos que el "app-root" contendrá la estructura principal (ej. header + main)
  // y que el contenido específico de cada página se inyectará en un elemento con id "page-content"
  const pageContent = document.getElementById("page-content") as HTMLElement
  if (pageContent) {
    pageContent.innerHTML = playHtml

    // Game mode button event listeners
    document.getElementById("play-ia-button")?.addEventListener("click", renderAIOptions)
    document.getElementById("play-1v1-button")?.addEventListener("click", render1v1Options)
    document.getElementById("play-1v2-button")?.addEventListener("click", render1v2Options)
    document.getElementById("play-2v1-button")?.addEventListener("click", render2v1Options)
    document.getElementById("play-2v2-button")?.addEventListener("click", render2v2Options)

    const playTournamentButton = document.getElementById("play-tournament-button")
    if (playTournamentButton) {
      playTournamentButton.addEventListener("click", () => {
        showCustomMessage(getTranslation("play", "tournamentComingSoonMessage"))
      })
    }

    // Apply translations after rendering HTML
    applyTranslations()
  } else {
    console.error('Elemento con id "page-content" no encontrado para renderizar la página de juego.')
  }
}

/**
 * Renders the options for 1 vs 1 mode (Local or Online).
 */
function render1v1Options(): void {
  const pageContent = document.getElementById("page-content")
  if (!pageContent) {
    console.error("Page content area not found!")
    return
  }

  const mobileDisabledClass = isMobileDevice() ? "opacity-50 cursor-not-allowed" : ""
  const mobileDisabledAttr = isMobileDevice() ? "disabled" : ""
  // Use getTranslation for mobile specific text
  const mobileLocalText = isMobileDevice() ? getTranslation("play", "localOnlyDesktop") : ""

  const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play1v1Title">${getTranslation("play", "play1v1Title")}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play1v1Description">${getTranslation("play", "play1v1Description")}</p>

        <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                id="play-1v1-local-button"
                class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                ${mobileDisabledAttr}
                data-i18n="play.localOption1v1"
            >
                ${getTranslation("play", "localOption1v1")}
            </button>
                    ${mobileLocalText}
                </button>

                <button
                    id="play-1v1-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation("play", "onlineOption")}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation("play", "backToModes")}
            </button>
        </div>
    `
  pageContent.innerHTML = optionsHtml

  document.getElementById("play-1v1-local-button")?.addEventListener("click", () => {
    renderPongPage("1v1_local") // Pasa el gameMode '1v1_local'
  })

  document.getElementById("play-1v1-online-button")?.addEventListener("click", () => {
    renderOnlineMatchmaking("1v1_online")
  })

  document.getElementById("back-to-play-modes-button")?.addEventListener("click", renderPlay)

  applyTranslations() // Apply translations to newly rendered content
}

/**
 * Renders the options for 1 vs 2 mode (Local or Online).
 */
function render1v2Options(): void {
  const pageContent = document.getElementById("page-content")
  if (!pageContent) {
    console.error("Page content area not found!")
    return
  }

  const mobileDisabledClass = isMobileDevice() ? "opacity-50 cursor-not-allowed" : ""
  const mobileDisabledAttr = isMobileDevice() ? "disabled" : ""
  const mobileLocalText = isMobileDevice() ? getTranslation("play", "localOnlyDesktop") : ""

  const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play1v2Title">${getTranslation("play", "play1v2Title")}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play1v2Description">${getTranslation("play", "play1v2Description")}</p>

            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="play-1v2-local-button"
                    class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                    ${mobileDisabledAttr}
                    data-i18n="play.localOption1v2"
                >
                    ${getTranslation("play", "localOption1v2")}
                </button>
                    ${mobileLocalText}
                </button>

                <button
                    id="play-1v2-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation("play", "onlineOption")}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation("play", "backToModes")}
            </button>
        </div>
    `
  pageContent.innerHTML = optionsHtml

  document.getElementById("play-1v2-local-button")?.addEventListener("click", () => {
    renderPongPage("1v2_local")
  })

  document.getElementById("play-1v2-online-button")?.addEventListener("click", () => {
    renderOnlineMatchmaking("1v2_online")
  })

  document.getElementById("back-to-play-modes-button")?.addEventListener("click", renderPlay)

  applyTranslations()
}

/**
 * Renders the options for 2 vs 1 mode (Local or Online).
 */
function render2v1Options(): void {
  const pageContent = document.getElementById("page-content")
  if (!pageContent) {
    console.error("Page content area not found!")
    return
  }

  const mobileDisabledClass = isMobileDevice() ? "opacity-50 cursor-not-allowed" : ""
  const mobileDisabledAttr = isMobileDevice() ? "disabled" : ""
  const mobileLocalText = isMobileDevice() ? getTranslation("play", "localOnlyDesktop") : "" // Same text for 1v2 and 2v1 local if only one player controls multiple paddles. Adjust if different.

  const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play2v1Title">${getTranslation("play", "play2v1Title")}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play2v1Description">${getTranslation("play", "play2v1Description")}</p>

            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="play-2v1-local-button"
                    class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                    ${mobileDisabledAttr}
                    data-i18n="play.localOption2v1"
                >
                    ${getTranslation("play", "localOption2v1")}
                </button>
                    ${mobileLocalText}
                </button>

                <button
                    id="play-2v1-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation("play", "onlineOption")}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation("play", "backToModes")}
            </button>
        </div>
    `
  pageContent.innerHTML = optionsHtml

  document.getElementById("play-2v1-local-button")?.addEventListener("click", () => {
    renderPongPage("2v1_local")
  })

  document.getElementById("play-2v1-online-button")?.addEventListener("click", () => {
    renderOnlineMatchmaking("2v1_online")
  })

  document.getElementById("back-to-play-modes-button")?.addEventListener("click", renderPlay)

  applyTranslations()
}

/**
 * Renders the options for 2 vs 2 mode (Local or Online).
 */
function render2v2Options(): void {
  const pageContent = document.getElementById("page-content")
  if (!pageContent) {
    console.error("Page content area not found!")
    return
  }

  const mobileDisabledClass = isMobileDevice() ? "opacity-50 cursor-not-allowed" : ""
  const mobileDisabledAttr = isMobileDevice() ? "disabled" : ""
  // Assuming mobileLocalText is meant to be appended to the local button's translation
  const mobileLocalText = isMobileDevice() ? ` (${getTranslation("play", "localOnlyDesktop")})` : ""

  const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play2v2Title">${getTranslation("play", "play2v2Title")}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play2v2Description">${getTranslation("play", "play2v2Description")}</p>

            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="play-2v2-local-button"
                    class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                    ${mobileDisabledAttr}
                    data-i18n="play.localOption2v2"
                >
                    ${getTranslation("play", "localOption2v2")}${mobileLocalText}
                </button>
                <button
                    id="play-2v2-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation("play", "onlineOption")}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation("play", "backToModes")}
            </button>
        </div>
    `
  pageContent.innerHTML = optionsHtml

  document.getElementById("play-2v2-local-button")?.addEventListener("click", () => {
    renderPongPage("2v2_local")
  })

  document.getElementById("play-2v2-online-button")?.addEventListener("click", () => {
    renderOnlineMatchmaking("2v2_online")
  })

  document.getElementById("back-to-play-modes-button")?.addEventListener("click", renderPlay)

  applyTranslations()
}

/**
 * Renders the AI difficulty options.
 */
function renderAIOptions(): void {
  const pageContent = document.getElementById("page-content")
  if (!pageContent) {
    console.error("Page content area not found!")
    return
  }

  const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.selectAIDifficultyTitle">${getTranslation("play", "selectAIDifficultyTitle")}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.selectAIDifficultyDescription">${getTranslation("play", "selectAIDifficultyDescription")}</p>
            
            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="ai-easy-button"
                    class="group bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffc300] hover:to-[#ffd60a] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.aiEasy"
                >
                    ${getTranslation("play", "aiEasy")}
                </button>

                <button
                    id="ai-medium-button"
                    class="group bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffc300] hover:to-[#ffd60a] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.aiNormal"
                >
                    ${getTranslation("play", "aiNormal")}
                </button>

                <button
                    id="ai-hard-button"
                    class="group bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffc300] hover:to-[#ffd60a] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.aiHard"
                >
                    ${getTranslation("play", "aiHard")}
                </button>
            </div>

            <button 
                id="back-to-play-modes-from-ai-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation("play", "backToModes")}
            </button>
        </div>
    `

  pageContent.innerHTML = optionsHtml

  document.getElementById("ai-easy-button")?.addEventListener("click", () => {
    renderPongPage("vs_ai", "EASY")
  })
  document.getElementById("ai-medium-button")?.addEventListener("click", () => {
    renderPongPage("vs_ai", "MEDIUM")
  })
  document.getElementById("ai-hard-button")?.addEventListener("click", () => {
    renderPongPage("vs_ai", "HARD")
  })

  document.getElementById("back-to-play-modes-from-ai-button")?.addEventListener("click", renderPlay)

  applyTranslations()
}

/**
 * Renders the online matchmaking page.
 * @param gameMode The selected online game mode.
 */
function renderOnlineMatchmaking(gameMode: string): void {
  // Import the renderPongPage function to render the exact same layout
  import("./pong/index").then(({ renderPongPage }) => {
    // Set a flag to indicate we're in online mode
    ;(window as any).isOnlineMode = true
    ;(window as any).onlineGameMode = gameMode
    
    // Render using the exact same layout as local games
    renderPongPage(gameMode as any, "MEDIUM", true) // Pass true for online mode
    
    // After rendering, use the built-in overlay
    setTimeout(() => {
      const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement
      const overlay = document.getElementById("game-overlay")
      const overlayStatus = document.getElementById("overlay-status")
      const overlayMessage = document.getElementById("overlay-message")
      const overlayOpponent = document.getElementById("overlay-opponent")
      const overlayCancel = document.getElementById("overlay-cancel")
      
      if (!canvas || !overlay) {
        console.error("Required elements not found for online game!")
        return
      }

      // Show the built-in overlay
      overlay.style.display = "flex"
      
      // Set overlay content
      if (overlayStatus) overlayStatus.textContent = getTranslation("play", "searchingMatchTitle")
      if (overlayMessage) overlayMessage.textContent = `${getTranslation("play", "searchingMatchDescriptionPrefix")} ${gameMode.replace("_", " ")}...`
      if (overlayCancel) overlayCancel.textContent = getTranslation("play", "cancelSearchButton")

      // Initialize online game manager
      import("./pong/onlineGameManager").then(({ onlineGameManager }) => {
        const isMobile = window.innerWidth < 768

        // Setup overlay handlers
        if (overlayOpponent) {
          // Update opponent name when found
          const status = onlineGameManager.getConnectionStatus()
          if (status.opponent) {
            overlayOpponent.textContent = `Opponent: ${status.opponent}`
          }
        }

        // Override the current game with online game manager
        onlineGameManager.startMatchmaking(gameMode as any, canvas, isMobile).then(() => {
          // Hide overlay when game starts
          overlay.style.display = "none"
        }).catch((error) => {
          console.error("Failed to start matchmaking:", error)
          showCustomMessage("Failed to connect to game server. Please try again.")
          overlay.style.display = "none"
        })

        // Handle cancel button
        if (overlayCancel) {
          overlayCancel.addEventListener("click", () => {
            onlineGameManager.cancelMatchmaking()
            overlay.style.display = "none"
            renderPlay() // Go back to game mode selection
          })
        }

        // Modify the back button to handle online game cleanup
        const backButton = document.getElementById("back-to-play-button")
        if (backButton) {
          // Remove existing listeners
          const newBackButton = backButton.cloneNode(true) as HTMLElement
          backButton.parentNode?.replaceChild(newBackButton, backButton)
          
          newBackButton.addEventListener("click", () => {
            onlineGameManager.endGame()
            overlay.style.display = "none"
            ;(window as any).isOnlineMode = false
            renderPlay()
          })
        }
      })
    }, 100) // Small delay to ensure DOM is ready
  })
}

/**
 * Displays a custom message in a modal-like pop-up.
 * @param message The message to display.
 */
function showCustomMessage(message: string): void {
  const modalHtml = `
        <div id="custom-message-modal" class="custom-modal-overlay">
            <div class="custom-modal-content">
                <h3 class="text-2xl font-bold text-[#ffc300] mb-4" data-i18n="common.infoTitle">${getTranslation("common", "infoTitle")}</h3>
                <p class="text-base text-gray-300 mb-6">${message}</p>
                <div class="custom-modal-buttons">
                    <button id="close-message-button" class="custom-modal-button cancel" data-i18n="common.okButton">${getTranslation("common", "okButton")}</button>
                </div>
            </div>
        </div>
    `
  document.body.insertAdjacentHTML("beforeend", modalHtml)

  document.getElementById("close-message-button")?.addEventListener("click", () => {
    document.getElementById("custom-message-modal")?.remove()
  })
  applyTranslations() // Apply translations to modal content
}

/**
 * Displays a confirmation modal for cancelling matchmaking.
 */
function showCancelConfirmation(): void {
  const modalHtml = `
        <div id="cancel-confirmation-modal" class="custom-modal-overlay">
            <div class="custom-modal-content">
                <h3 class="text-2xl font-bold text-[#ffc300] mb-4" data-i18n="play.cancelSearchConfirmationTitle">${getTranslation("play", "cancelSearchConfirmationTitle")}</h3>
                <p class="text-base text-gray-300 mb-6" data-i18n="play.cancelSearchConfirmationDescription">${getTranslation("play", "cancelSearchConfirmationDescription")}</p>
                <div class="custom-modal-buttons">
                    <button id="cancel-yes-button" class="custom-modal-button confirm" data-i18n="play.yesCancelButton">${getTranslation("play", "yesCancelButton")}</button>
                    <button id="cancel-no-button" class="custom-modal-button cancel" data-i18n="play.noStayButton">${getTranslation("play", "noStayButton")}</button>
                </div>
            </div>
        </div>
    `
  document.body.insertAdjacentHTML("beforeend", modalHtml)

  document.getElementById("cancel-yes-button")?.addEventListener("click", () => {
    document.getElementById("cancel-confirmation-modal")?.remove()
    renderPlay() // Go back to the main play page
  })

  document.getElementById("cancel-no-button")?.addEventListener("click", () => {
    document.getElementById("cancel-confirmation-modal")?.remove()
  })
  applyTranslations() // Apply translations to modal content
}