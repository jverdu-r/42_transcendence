// tournament-logic.ts
// Sistema unificado de generación de brackets para torneos

export interface TournamentParticipant {
  id: number;
  user_id: number | null;
  is_bot: boolean;
  bot_name?: string;
  username?: string;
  team_name?: string;
}

export interface MatchPair {
  player1: TournamentParticipant;
  player2: TournamentParticipant;
  roundNumber: number; // 1, 2, 3, 4... (1 = primera ronda, última = final)
  matchNumber: number; // posición en la ronda (1, 2, 3...)
  matchLabel: string; // ej: "1/8(1)", "1/4(2)", "1/2(1)", "Final"
}

/**
 * Calcula el número de rondas necesarias para un torneo
 * @param numPlayers - Número de jugadores (debe ser potencia de 2)
 * @returns Número de rondas necesarias
 */
export function calculateRounds(numPlayers: number): number {
  if (numPlayers < 2 || !isPowerOfTwo(numPlayers)) {
    throw new Error(`Invalid number of players: ${numPlayers}. Must be a power of 2.`);
  }
  return Math.log2(numPlayers);
}

/**
 * Verifica si un número es potencia de 2
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Obtiene el label de la ronda según el número de jugadores restantes
 * @param playersInRound - Número de jugadores en esa ronda
 * @returns Label de la ronda (ej: "1/8", "1/4", "1/2", "Final")
 */
export function getRoundLabel(playersInRound: number): string {
  if (playersInRound === 2) return 'Final';
  if (playersInRound === 4) return '1/2';
  if (playersInRound === 8) return '1/4';
  if (playersInRound === 16) return '1/8';
  if (playersInRound === 32) return '1/16';
  return `Round-${playersInRound}`;
}

/**
 * Obtiene el índice de la ronda en el array de rondas
 * @param totalPlayers - Total de jugadores del torneo
 * @param playersInRound - Jugadores en esta ronda específica
 * @returns Índice de la ronda (0-based)
 */
export function getRoundIndex(totalPlayers: number, playersInRound: number): number {
  const totalRounds = calculateRounds(totalPlayers);
  const currentRound = Math.log2(playersInRound);
  return totalRounds - currentRound;
}

/**
 * Genera el label completo del partido
 * @param playersInRound - Jugadores en la ronda
 * @param matchNumber - Número del partido en la ronda (1-based)
 * @returns Label completo (ej: "1/8(1)", "Final")
 */
export function getMatchLabel(playersInRound: number, matchNumber: number): string {
  const roundLabel = getRoundLabel(playersInRound);
  if (roundLabel === 'Final') return 'Final';
  return `${roundLabel}(${matchNumber})`;
}

/**
 * Genera todos los emparejamientos para la primera ronda del torneo
 * @param participants - Lista de participantes (ya mezclados aleatoriamente)
 * @param totalPlayers - Total de jugadores del torneo
 * @returns Array de emparejamientos con toda la información necesaria
 */
export function generateFirstRoundMatches(
  participants: TournamentParticipant[],
  totalPlayers: number
): MatchPair[] {
  if (participants.length !== totalPlayers) {
    throw new Error(`Participant count (${participants.length}) doesn't match expected (${totalPlayers})`);
  }

  const matches: MatchPair[] = [];
  const roundNumber = 1;
  
  for (let i = 0; i < participants.length; i += 2) {
    if (i + 1 >= participants.length) {
      throw new Error('Odd number of participants. Cannot create pairs.');
    }

    const player1 = {
      ...participants[i],
      team_name: `Team A-R${roundNumber}-M${(i / 2) + 1}`
    };
    
    const player2 = {
      ...participants[i + 1],
      team_name: `Team B-R${roundNumber}-M${(i / 2) + 1}`
    };

    matches.push({
      player1,
      player2,
      roundNumber,
      matchNumber: (i / 2) + 1,
      matchLabel: getMatchLabel(totalPlayers, (i / 2) + 1)
    });
  }

  return matches;
}

/**
 * Genera los emparejamientos para la siguiente ronda basándose en los ganadores
 * @param winners - Ganadores de la ronda anterior (en orden)
 * @param currentRoundPlayers - Número de jugadores en la ronda actual
 * @param roundNumber - Número de ronda (1-based)
 * @returns Array de emparejamientos para la siguiente ronda
 */
export function generateNextRoundMatches(
  winners: TournamentParticipant[],
  currentRoundPlayers: number,
  roundNumber: number
): MatchPair[] {
  if (winners.length !== currentRoundPlayers / 2) {
    throw new Error(
      `Expected ${currentRoundPlayers / 2} winners, got ${winners.length}`
    );
  }

  const nextRoundPlayers = currentRoundPlayers / 2;
  const matches: MatchPair[] = [];

  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 >= winners.length) {
      // Caso bye: el ganador avanza automáticamente
      // En un sistema bien diseñado esto no debería pasar
      continue;
    }

    const player1 = {
      ...winners[i],
      team_name: `Team A-R${roundNumber}-M${(i / 2) + 1}`
    };
    
    const player2 = {
      ...winners[i + 1],
      team_name: `Team B-R${roundNumber}-M${(i / 2) + 1}`
    };

    matches.push({
      player1,
      player2,
      roundNumber,
      matchNumber: (i / 2) + 1,
      matchLabel: getMatchLabel(nextRoundPlayers, (i / 2) + 1)
    });
  }

  return matches;
}

/**
 * Obtiene el nombre de visualización de un jugador
 */
export function getPlayerDisplayName(player: TournamentParticipant): string {
  if (player.is_bot) {
    return player.bot_name || 'Bot';
  }
  return player.username || `Player ${player.user_id}`;
}

/**
 * Mezcla aleatoriamente un array (Fisher-Yates shuffle)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Valida que el número de jugadores sea válido para un torneo
 */
export function validatePlayerCount(count: number): { valid: boolean; error?: string } {
  if (count < 2) {
    return { valid: false, error: 'Minimum 2 players required' };
  }
  if (count > 64) {
    return { valid: false, error: 'Maximum 64 players allowed' };
  }
  if (!isPowerOfTwo(count)) {
    return { 
      valid: false, 
      error: `Player count must be a power of 2 (2, 4, 8, 16, 32, 64). Got ${count}` 
    };
  }
  return { valid: true };
}

/**
 * Obtiene todas las rondas que tendrá el torneo con sus labels
 */
export function getTournamentRounds(totalPlayers: number): string[] {
  const numRounds = calculateRounds(totalPlayers);
  const rounds: string[] = [];
  
  for (let i = 0; i < numRounds; i++) {
    const playersInRound = totalPlayers / Math.pow(2, i);
    rounds.push(getRoundLabel(playersInRound));
  }
  
  return rounds;
}
