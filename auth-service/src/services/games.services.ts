// auth-service/services/games.service.ts

import { openDb } from '../database';
import redisClient from '../redis-client';

export class GameService {
  // 1. Crear partida y devolver el game_id generado
  static async createGame(tournamentId: number | null = null, match: string | null = null): Promise<number> {
    const db = await openDb();

    const lastRow = await db.get('SELECT MAX(id) AS max_id FROM games');
    const lastId = lastRow?.max_id || 0;
    const gameId = lastId + 100; // Margen de seguridad

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `INSERT INTO games (id, tournament_id, match, status, started_at) VALUES (?, ?, ?, 'in_progress', datetime('now'))`,
      params: [gameId, tournamentId, match]
    }));

    await db.close();

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

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `INSERT INTO participants (game_id, user_id, is_bot, team_name)
       VALUES (?, ?, ?, ?)`,
      params: [gameId, userId, isBot ? 1 : 0, teamName]
  }));
  }

  // 3. Inicializar score en 0 para un participante
  static async initScore(gameId: number, scorerId: number | null, teamName: string): Promise<void> {
    const db = await openDb();

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `INSERT INTO scores (game_id, scorer_id, team_name, point_number)
       VALUES (?, ?, ?, 0)`,
      params: [gameId, scorerId, teamName]
    }));
  }

  // 4. Registrar un punto anotado por un participante
  static async updateScore(gameId: number, scorerId: number | null, teamName: string, pointNumber: number): Promise<void> {
    const db = await openDb();

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `INSERT INTO scores (game_id, scorer_id, team_name, point_number)
       VALUES (?, ?, ?, ?)`,
      params: [gameId, scorerId, teamName, pointNumber]
    }));
  }

  // 5. Finalizar partida y actualizar estado + ganadores
  static async finalizeGame(gameId: number, winnerTeam: string): Promise<void> {
    const db = await openDb();

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `UPDATE games SET status = 'finished', finished_at = datetime('now') WHERE id = ?`,
      params: [gameId]
    }));

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `UPDATE participants
       SET is_winner = CASE WHEN team_name = ? THEN 1 ELSE 0 END
       WHERE game_id = ?`,
      params: [winnerTeam, gameId]
    }));
  }
}