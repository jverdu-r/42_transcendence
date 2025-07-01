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
  // Remove duplicate WebSocket - we'll use onlineGameService

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

    // Use onlineGameService instead of creating our own WebSocket
    onlineGameService.setPlayerName(this.playerName)

    // Setup event listeners for onlineGameService
    onlineGameService.onConnectionChanged((connected: boolean) => {
      if (!connected && this.matchmakingActive) {
        this.showErrorMessage('Conexión perdida con el servidor')
        this.cancelMatchmaking()
      }
    })

    onlineGameService.onMatchFoundEvent((data: MatchFoundData) => {
      this.opponent = data.opponent
      this.updateMatchmakingUI('found', this.opponent)
      this.handleMatchFound(data)
    })

    onlineGameService.onErrorEvent((error: string) => {
      this.showErrorMessage(error)
      this.cancelMatchmaking()
    })

onlineGameService.onOpponentDisconnectedEvent(() => {
      this.showErrorMessage(getTranslation('play', 'opponentDisconnected'));
      this.endGame();
    });

    window.addEventListener('beforeunload', (event) => {
      if (this.matchmakingActive) {
        event.preventDefault();
        event.returnValue = 'Hay una partida en progreso. ¿Seguro que quieres salir?';
      }
    });

    // Connect to the online game service
    try {
      await onlineGameService.connect(gameMode)
      console.log('Connected to online game service')
    } catch (error) {
      console.error('Failed to connect to online game service:', error)
      this.showErrorMessage('No se pudo conectar al servidor de juego')
      this.cancelMatchmaking()
    }
  }

  private generatePlayerName(): string {
    // Intentar obtener el nombre de usuario del token JWT si está autenticado
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.username) {
          return payload.username;
        }
      } catch (error) {
        console.warn('No se pudo obtener el username del token:', error);
      }
    }
    
    // Fallback: generar nombre aleatorio
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
    
    // Check if there's already a game running (from renderPongPage)
    const existingGame = (window as any).currentPongGame
    if (existingGame) {
      console.log('Stopping existing local game to start online game')
      existingGame.stop()
    }
    
    this.currentGame = new OnlineGame(this.canvas, this.gameMode, this.isMobile)
    this.currentGame.initOnlineGame(matchData)
    
    // Store the online game as the current game
    ;(window as any).currentPongGame = this.currentGame
    
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
    // Ocultar la pantalla de matchmaking (overlay)
    const overlay = document.getElementById('game-overlay')
    if (overlay) {
      overlay.style.display = 'none'
    }

    // Actualizar los nombres de los jugadores en el marcador
    const player1Element = document.getElementById('player1-score')
    const player2Element = document.getElementById('player2-score')
    
    if (player1Element) {
      player1Element.textContent = `${matchData.isHost ? this.playerName : matchData.opponent}: 0`
    }
    
    if (player2Element) {
      player2Element.textContent = `${matchData.isHost ? matchData.opponent : this.playerName}: 0`
    }

    console.log(`Game UI updated - You: ${this.playerName}, Opponent: ${matchData.opponent}, Host: ${matchData.isHost}`)
    
    // Iniciar automáticamente la cuenta atrás cuando ambos jugadores estén conectados
    setTimeout(() => {
      if (this.currentGame) {
        console.log('Starting automatic countdown for online game')
        this.currentGame.startCountdown()
      }
    }, 1000) // Pequeño delay para asegurar que todo esté listo
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
    const serviceStatus = onlineGameService.getConnectionStatus()
    return {
      connected: serviceStatus.connected,
      matchmaking: this.matchmakingActive,
      inGame: this.currentGame !== null,
      playerName: this.playerName,
      opponent: this.opponent,
    }
  }
}

// Exporta una instancia singleton para el frontend
export const onlineGameManager = new OnlineGameManager();