// auth-service/services/games.service.ts

import { openDb } from '../database';

export class GameService {
  // 1. Crear partida y devolver el game_id generado
  static async createGame(tournamentId: number | null = null, match: string | null = null): Promise<number> {
    const db = await openDb();

    const result = await db.run(
      `INSERT INTO games (tournament_id, match, status, started_at)
       VALUES (?, ?, 'in_progress', datetime('now'))`,
      [tournamentId, match]
    );

    const gameId = result.lastID;
    if (typeof gameId !== 'number') {
        throw new Error('Could not retrieve last inserted game ID');
        }
    return gameId;
  }

  // 2. Añadir un participante (jugador humano o bot)
  static async addParticipant(gameId: number, {
    userId = null,
    isBot = false,
    teamName
  }: {
    userId?: number | null;
    isBot?: boolean;
    teamName: string;
  }): Promise<void> {
    const db = await openDb();

    await db.run(
      `INSERT INTO participants (game_id, user_id, is_bot, team_name)
       VALUES (?, ?, ?, ?)`,
      [gameId, userId, isBot ? 1 : 0, teamName]
    );
  }

  // 3. Inicializar score en 0 para un participante
  static async initScore(gameId: number, scorerId: number | null, teamName: string): Promise<void> {
    const db = await openDb();

    await db.run(
      `INSERT INTO scores (game_id, scorer_id, team_name, point_number)
       VALUES (?, ?, ?, 0)`,
      [gameId, scorerId, teamName]
    );
  }

  // 4. Registrar un punto anotado por un participante
  static async updateScore(gameId: number, scorerId: number | null, teamName: string, pointNumber: number): Promise<void> {
    const db = await openDb();

    await db.run(
      `INSERT INTO scores (game_id, scorer_id, team_name, point_number)
       VALUES (?, ?, ?, ?)`,
      [gameId, scorerId, teamName, pointNumber]
    );
  }

  // 5. Finalizar partida y actualizar estado + ganadores
  static async finalizeGame(gameId: number, winnerTeam: string): Promise<void> {
    const db = await openDb();

    await db.run(
      `UPDATE games SET status = 'finished', finished_at = datetime('now') WHERE id = ?`,
      [gameId]
    );

    await db.run(
      `UPDATE participants
       SET is_winner = CASE WHEN team_name = ? THEN 1 ELSE 0 END
       WHERE game_id = ?`,
      [winnerTeam, gameId]
    );
  }
}