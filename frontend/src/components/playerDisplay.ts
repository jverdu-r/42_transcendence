// Componente reutilizable para mostrar información de jugadores
import { getTranslation } from '../i18n';
export interface PlayerInfo {
  numero: number;
  username: string;
  displayName: string;
  esIA?: boolean;
  isCurrentUser?: boolean;
  controls?: string;
}

export class PlayerDisplay {
  
  /**
   * Genera las tarjetas de información de jugadores
   */
  static generatePlayerCards(
    player1: PlayerInfo, 
    player2: PlayerInfo, 
    gameMode: 'online' | 'local' = 'online'
  ): string {
    const player1Card = this.generatePlayerCard(player1, 1, gameMode);
    const player2Card = this.generatePlayerCard(player2, 2, gameMode);
    
    return `
      <div class="grid grid-cols-2 gap-4 mb-4">
        ${player1Card}
        ${player2Card}
      </div>
    `;
  }

  /**
   * Genera una tarjeta individual para un jugador
   */
  private static generatePlayerCard(player: PlayerInfo, position: 1 | 2, gameMode: 'online' | 'local'): string {
    const isPlayer1 = position === 1;
    const baseColor = isPlayer1 ? 'yellow' : 'blue';
    const bgColor = isPlayer1 ? 'bg-yellow-600' : 'bg-blue-600';
    const textColor = isPlayer1 ? 'text-yellow-200' : 'text-blue-200';
    
    // Íconos según el tipo de jugador
    let playerIcon = '👤';
    let playerType = getTranslation('playerDisplay', 'player');
    let playerDescription = getTranslation('playerDisplay', 'humanPlayer');
    
    if (player.esIA) {
      playerIcon = '🤖';
      playerType = getTranslation('playerDisplay', 'ai');
      playerDescription = getTranslation('playerDisplay', 'artificialIntelligence');
    } else if (player.isCurrentUser) {
      playerIcon = '📱';
      playerType = getTranslation('playerDisplay', 'you');
      playerDescription = gameMode === 'local' ? getTranslation('playerDisplay', 'localPlayer') : getTranslation('playerDisplay', 'currentPlayer');
    } else if (gameMode === 'local') {
      playerIcon = '🎮';
      playerType = getTranslation('playerDisplay', 'player2');
      playerDescription = getTranslation('playerDisplay', 'localPlayer');
    }
    
    // Controles según el modo de juego
    const controls = gameMode === 'local' 
      ? (isPlayer1 ? getTranslation('playerDisplay', 'keyboardControls') : getTranslation('playerDisplay', 'arrowControls'))
      : (player.isCurrentUser ? getTranslation('playerDisplay', 'keyboardControls') : getTranslation('playerDisplay', 'remoteControlled'));
    
    const sideText = isPlayer1 ? getTranslation('playerDisplay', 'left') : getTranslation('playerDisplay', 'right');
    const colorText = isPlayer1 ? getTranslation('playerDisplay', 'yellow') : getTranslation('playerDisplay', 'blue');
    
    return `
      <div class="${bgColor} rounded-lg p-3">
        <h3 class="text-lg font-bold text-white">
          ${playerIcon} ${player.displayName}
        </h3>
        <p class="text-sm ${textColor}">
          ${playerType} - ${getTranslation('playerDisplay', 'paddle')} ${colorText}
        </p>
        <p class="text-sm ${textColor} font-semibold">
          ${getTranslation('playerDisplay', 'side')} ${sideText}
        </p>
        <p class="text-xs ${textColor}">
          ${controls}
        </p>
        <p class="text-xs ${textColor} italic">
          ${playerDescription}
        </p>
      </div>
    `;
  }

  /**
   * Genera la información de rol del jugador
   */
  static generatePlayerRoleInfo(
    currentPlayer: PlayerInfo,
    opponent: PlayerInfo,
    gameMode: 'online' | 'local' = 'online'
  ): string {
    const opponentType = opponent.esIA ? getTranslation('playerDisplay', 'ai') : 
                        (gameMode === 'local' ? getTranslation('playerDisplay', 'localPlayer') : getTranslation('playerDisplay', 'onlinePlayer'));
    
    const playerSide = currentPlayer.numero === 1 ? getTranslation('playerDisplay', 'left') : getTranslation('playerDisplay', 'right');
    const playerColor = currentPlayer.numero === 1 ? getTranslation('playerDisplay', 'yellow') : getTranslation('playerDisplay', 'blue');
    
    return `
      <div class="text-green-400 font-bold text-center">
        ✅ Juegas como ${currentPlayer.displayName} vs ${opponent.displayName}
        <br>
        <span class="text-sm">Pala ${playerColor} - Lado ${playerSide}</span>
      </div>
    `;
  }

  /**
   * Genera los títulos del marcador
   */
  static generateScoreTitles(
    player1: PlayerInfo, 
    player2: PlayerInfo, 
    currentPlayerNumber?: number
  ): { player1Title: string; player2Title: string } {
    const player1IsCurrentUser = currentPlayerNumber === 1;
    const player2IsCurrentUser = currentPlayerNumber === 2;
    
    const player1Title = `🟡 ${player1.displayName}${player1IsCurrentUser ? ' (Tú)' : ''}`;
    const player2Title = `🔵 ${player2.displayName}${player2IsCurrentUser ? ' (Tú)' : ''}`;
    
    return {
      player1Title,
      player2Title
    };
  }
}
