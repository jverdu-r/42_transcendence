import fetch from 'node-fetch';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://api-gateway:8000';

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

export async function notifyGameFinished(gameId: string, winnerTeam: string) {
  await fetch(`${AUTH_SERVICE_URL}/api/games/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, winnerTeam })
  });
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