// Componente reutilizable para mostrar información de jugadores
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
    let playerType = 'Jugador';
    let playerDescription = 'Jugador humano';
    
    if (player.esIA) {
      playerIcon = '🤖';
      playerType = 'IA';
      playerDescription = 'Inteligencia Artificial';
    } else if (player.isCurrentUser) {
      playerIcon = '📱';
      playerType = 'Tú';
      playerDescription = gameMode === 'local' ? 'Jugador local' : 'Jugador actual';
    } else if (gameMode === 'local') {
      playerIcon = '🎮';
      playerType = 'Jugador 2';
      playerDescription = 'Jugador local';
    }
    
    // Controles según el modo de juego
    const controls = gameMode === 'local' 
      ? (isPlayer1 ? 'W (arriba) / S (abajo)' : '↑ (arriba) / ↓ (abajo)')
      : (player.isCurrentUser ? 'W (arriba) / S (abajo)' : 'Controlado remotamente');
    
    const sideText = isPlayer1 ? 'Izquierda' : 'Derecha';
    const colorText = isPlayer1 ? 'Amarilla' : 'Azul';
    
    return `
      <div class="${bgColor} rounded-lg p-3">
        <h3 class="text-lg font-bold text-white">
          ${playerIcon} ${player.displayName}
        </h3>
        <p class="text-sm ${textColor}">
          ${playerType} - Pala ${colorText}
        </p>
        <p class="text-sm ${textColor} font-semibold">
          Lado ${sideText}
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
    const opponentType = opponent.esIA ? 'IA' : 
                        (gameMode === 'local' ? 'Jugador Local' : 'Jugador Online');
    
    const playerSide = currentPlayer.numero === 1 ? 'Izquierda' : 'Derecha';
    const playerColor = currentPlayer.numero === 1 ? 'Amarilla' : 'Azul';
    
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
