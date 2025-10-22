import fetch from 'node-fetch';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://api-gateway:8000';
const DB_SERVICE_URL   = process.env.DB_SERVICE_URL   || 'http://db-service:8000';

export async function notifyGameStarted(payload: {
  gameId: string;
  player1: { userId: number | null; username: string | null; isBot: boolean; teamName: string };
  player2: { userId: number | null; username: string | null; isBot: boolean; teamName: string };
  tournamentId?: number | null;
  match?: string | null;
}) {
  await fetch(`${AUTH_SERVICE_URL}/api/games/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function notifyScore(gameId: string, scorerId: string | null, teamName: string, pointNumber: number) {
  await fetch(`${AUTH_SERVICE_URL}/api/games/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, scorerId, teamName, pointNumber })
  });
}

export async function notifyGameFinished(gameId: string, winnerTeam?: string | null, winnerId?: number | null) {
  const body: any = { gameId };
  if (winnerId) {
    body.winnerId = winnerId;
  } else if (winnerTeam) {
    body.winnerTeam = winnerTeam;
  }
  
  await fetch(`${AUTH_SERVICE_URL}/api/games/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function notifyGameStats(payload: {
  external_game_id?: string;
  game_id?: string | number;
  player1_name?: string | null;
  player2_name?: string | null;
  score1?: number;
  score2?: number;
  winner_name?: string | null;
  winner_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  game_mode?: string | null;
  duration?: number | null;
  reason?: string | null;
}) {
  try {
    await fetch(`${DB_SERVICE_URL}/game/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('notifyGameStats error:', err);
  }
}

export async function fetchUserId(username: string): Promise<number | null> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/games/user-id?username=${encodeURIComponent(username)}`);
    if (!res.ok) return null;

    const data = await res.json() as unknown;

    if (
      typeof data === 'object' &&
      data !== null &&
      'userId' in data &&
      typeof (data as any).userId === 'number'
    ) {
      return (data as { userId: number }).userId;
    } else {
      console.error('❌ Respuesta inesperada del servidor al obtener userId:', data);
      return null;
    }

  } catch (err) {
    console.error(`❌ Error al obtener userId de '${username}':`, err);
    return null;
  }
}