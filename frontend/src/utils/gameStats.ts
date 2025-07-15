import { getCurrentUser } from '../auth';

export interface GameStats {
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player2_name: string;
  score1: number;
  score2: number;
  winner_id: number;
  winner_name: string;
  game_mode: string;
  duration: number; // en segundos
  start_time: string;
  end_time: string;
}

export async function saveGameStats(stats: GameStats): Promise<boolean> {
  try {
    const token = localStorage.getItem('jwt');
    if (!token) {
      console.error('No se encontró token de autenticación');
      return false;
    }

    const response = await fetch('/api/game/stats', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stats)
    });

    if (!response.ok) {
      console.error('Error al guardar estadísticas:', response.status);
      return false;
    }

    console.log('Estadísticas del juego guardadas exitosamente');
    return true;
  } catch (error) {
    console.error('Error al guardar estadísticas:', error);
    return false;
  }
}

export function createGameStats(
  player1Name: string,
  player2Name: string,
  score1: number,
  score2: number,
  gameMode: string,
  startTime: Date,
  endTime: Date
): GameStats {
  const currentUser = getCurrentUser();
  const winner = score1 > score2 ? { id: currentUser?.id || 1, name: player1Name } : { id: 2, name: player2Name };
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  return {
    player1_id: currentUser?.id || 1,
    player2_id: 2, // En juego local, player2 será siempre ID 2 o se puede ajustar
    player1_name: player1Name,
    player2_name: player2Name,
    score1,
    score2,
    winner_id: winner.id,
    winner_name: winner.name,
    game_mode: gameMode,
    duration,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString()
  };
}
