import { OnlineGame } from './onlineGame'
import { GameMode } from './index'
import { onlineGameService, MatchFoundData } from '../../services/websocket'
import { getTranslation } from '../../i18n'
import { navigateTo } from '../../router'

export class OnlineGameManager {
  private currentGame: OnlineGame | null = null
  private canvas: HTMLCanvasElement | null = null
  private gameMode: GameMode | null = null
  private isMobile = false
  private matchmakingActive = false
  private playerName: string = ''
  private opponent: string = ''
  private ws: WebSocket | null = null

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Puedes agregar listeners globales aquí si lo necesitas
  }

  public async startMatchmaking(gameMode: GameMode, canvas: HTMLCanvasElement, isMobile: boolean): Promise<void> {
    if (this.matchmakingActive) return

    this.gameMode = gameMode
    this.canvas = canvas
    this.isMobile = isMobile
    this.matchmakingActive = true
    this.playerName = this.generatePlayerName()
    this.opponent = ''
    this.updateMatchmakingUI('searching')

    // Cierra cualquier conexión previa
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Conexión WebSocket
    const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
      window.location.hostname + ':3000/ws'
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      // Envía join-game al conectar
      this.ws?.send(JSON.stringify({ type: 'join-game', name: this.playerName }))
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'waiting') {
          this.updateMatchmakingUI('searching')
        } else if (data.type === 'opponentFound') {
          this.opponent = data.opponent
          this.updateMatchmakingUI('found', this.opponent)
          // Solo pasa las propiedades de MatchFoundData
          this.handleMatchFound({
            type: 'opponentFound',
            opponent: data.opponent,
            message: data.message,
            gameMode: data.gameMode,
            isHost: data.isHost
          })
        } else if (data.type === 'opponent_disconnected') {
          this.showErrorMessage(getTranslation('play', 'opponentDisconnected'))
          this.endGame()
        } else if (data.type === 'waiting_timeout') {
          this.showErrorMessage(getTranslation('play', 'matchmakingTimeout'))
          this.cancelMatchmaking()
        } else if (data.type === 'error') {
          this.showErrorMessage(data.message || 'Error en matchmaking')
          this.cancelMatchmaking()
        }
        // Puedes manejar otros tipos de mensajes aquí
      } catch (e) {
        this.showErrorMessage('Error de comunicación con el servidor')
        this.cancelMatchmaking()
      }
    }

    this.ws.onerror = () => {
      this.showErrorMessage('Error de red o conexión con el servidor')
      this.cancelMatchmaking()
    }

    this.ws.onclose = () => {
      if (this.matchmakingActive) {
        this.showErrorMessage('Conexión cerrada inesperadamente')
        this.cancelMatchmaking()
      }
    }
  }

  private generatePlayerName(): string {
    // Puedes usar el usuario logueado o un random
    return 'Player_' + Math.floor(Math.random() * 10000)
  }

  private handleMatchFound(data: MatchFoundData): void {
    this.startOnlineGame(data)
  }

  private startOnlineGame(matchData: MatchFoundData): void {
    if (!this.canvas || !this.gameMode) {
      this.showErrorMessage('No se puede iniciar la partida: falta canvas o modo de juego')
      return
    }
    this.currentGame = new OnlineGame(this.canvas, this.gameMode, this.isMobile)
    this.currentGame.initOnlineGame(matchData)
    this.updateGameUI(matchData)
    this.matchmakingActive = false
    console.log('Online game started')
  }

  private updateMatchmakingUI(status: 'searching' | 'found' | 'disconnected', opponent?: string): void {
    const statusElement = document.getElementById('matchmaking-status')
    const opponentElement = document.getElementById('opponent-name')

    if (statusElement) {
      switch (status) {
        case 'searching':
          statusElement.textContent = getTranslation('play', 'searchingMatchTitle')
          break
        case 'found':
          statusElement.textContent = getTranslation('play', 'matchFoundMessage').replace(
            '{gameMode}',
            this.gameMode || ''
          )
          break
        case 'disconnected':
          statusElement.textContent = 'Connection lost. Trying to reconnect...'
          break
      }
    }

    if (opponentElement && opponent) {
      opponentElement.textContent = `Opponent: ${opponent}`
    }
  }

  private updateGameUI(matchData: MatchFoundData): void {
    // Aquí puedes actualizar la UI para mostrar el juego online
    // Por ejemplo, ocultar el matchmaking y mostrar el canvas
    // O mostrar los nombres de los jugadores
  }

  private handleError(error: string): void {
    console.error('Online game error:', error)
    this.matchmakingActive = false
    this.showErrorMessage(error)
  }

  private showErrorMessage(error: string): void {
    let errorElement = document.getElementById('online-error-message')
    if (!errorElement) {
      errorElement = document.createElement('div')
      errorElement.id = 'online-error-message'
      errorElement.className = 'bg-red-600 text-white p-4 rounded-lg mt-4 text-center'
      const container = document.getElementById('page-content')
      if (container) {
        container.appendChild(errorElement)
      }
    }
    errorElement.textContent = error
    errorElement.style.display = 'block'
    setTimeout(() => {
      if (errorElement) {
        errorElement.style.display = 'none'
      }
    }, 5000)
  }

  public cancelMatchmaking(): void {
    if (this.matchmakingActive) {
      this.matchmakingActive = false
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
      onlineGameService.disconnect()
      this.updateMatchmakingUI('disconnected')
      console.log('Matchmaking cancelled')
    }
  }

  public endGame(): void {
    if (this.currentGame) {
      this.currentGame.stop()
      this.currentGame = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    onlineGameService.disconnect()
    this.matchmakingActive = false
    navigateTo('/play')
  }

  public getCurrentGame(): OnlineGame | null {
    return this.currentGame
  }

  public isMatchmaking(): boolean {
    return this.matchmakingActive
  }

  public getConnectionStatus(): {
    connected: boolean
    matchmaking: boolean
    inGame: boolean
    playerName: string
    opponent: string
  } {
    return {
      connected: !!this.ws && this.ws.readyState === WebSocket.OPEN,
      matchmaking: this.matchmakingActive,
      inGame: this.currentGame !== null,
      playerName: this.playerName,
      opponent: this.opponent,
    }
  }
}

// Exporta una instancia singleton para el frontend
export const onlineGameManager = new OnlineGameManager();