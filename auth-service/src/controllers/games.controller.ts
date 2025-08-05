// auth-service/controllers/games.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { GameService } from '../services/games.services';
import { openDb } from '../database';
import redisClient from '../redis-client';

export const startGameHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const {
      gameId,
      player1,
      player2,
      tournamentId = null,
      match = null
    } = req.body as any;

    const db = await openDb();

    // Insert en games
    const result = await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
        `INSERT INTO games (id, tournament_id, match, status, started_at)
        VALUES (?, ?, ?, 'in_progress', datetime('now'))`,
        params: [gameId, tournamentId, match]
      }));

    // helper para obtener user_id si es humano
    const getUserId = async (username: string | null): Promise<number | null> => {
      if (!username) return null;
      const user = await db.get(`SELECT id FROM users WHERE username = ?`, [username]);
      return user?.id ?? null;
    };

    // player1
    const userId1 = player1.isBot ? null : await getUserId(player1.username);
    await GameService.addParticipant(gameId, {
      userId: userId1,
      isBot: player1.isBot,
      teamName: player1.teamName
    });
    await GameService.initScore(gameId, userId1, player1.teamName);

    // player2
    const userId2 = player2.isBot ? null : await getUserId(player2.username);
    await GameService.addParticipant(gameId, {
      userId: userId2,
      isBot: player2.isBot,
      teamName: player2.teamName
    });
    await GameService.initScore(gameId, userId2, player2.teamName);

    return reply.send({ success: true });
  } catch (error) {
    console.error('❌ Error in /api/games/start:', error);
    reply.status(500).send({ error: 'Failed to start game' });
  }
};

export const getUserIdByUsername = async (req: FastifyRequest, reply: FastifyReply) => {
  const { username } = req.query as { username?: string };

  if (!username) {
    return reply.status(400).send({ error: 'Falta el parámetro username' });
  }

  try {
    const db = await openDb();
    const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    await db.close();

    if (!user) {
      return reply.status(404).send({ error: 'Usuario no encontrado' });
    }

    return reply.send({ userId: user.id });
  } catch (error) {
    console.error('❌ Error al obtener userId:', error);
    return reply.status(500).send({ error: 'Error interno del servidor' });
  }
};