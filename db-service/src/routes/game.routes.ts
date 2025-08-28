// db-service/src/routes/game.routes.ts

import { FastifyInstance } from 'fastify';
import { openDb } from '../database';
import redisClient from '../redis-client';

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as any;
    let db;
    try {
      db = await openDb();
      const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [id]);
      if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' });
      return user;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo usuario');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/users/by-email/:email', async (request, reply) => {
    const { email } = request.params as any;
    let db;
    try {
      db = await openDb();
      const user = await db.get('SELECT id, username, email, password_hash FROM users WHERE email = ?', [email]);
      if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' });
      return user;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo usuario por email');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/users/:id/profile', async (request, reply) => {
    const { id } = request.params as any;
    let db;
    try {
      db = await openDb();
      const profile = await db.get(`
        SELECT avatar_url, language, notifications, doubleFactor, difficulty 
        FROM user_profiles 
        WHERE user_id = ?
      `, [id]);
      if (!profile) return reply.code(404).send({ message: 'Perfil no encontrado' });
      return profile;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo perfil');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/games/by-started-at/:startedAt', async (request, reply) => {
    const { startedAt } = request.params as any;
    let db;
    try {
      db = await openDb();
      const row = await db.get(
        `SELECT id FROM games WHERE status = 'pending' AND started_at = ?`,
        [decodeURIComponent(startedAt)]
      );
      return { gameId: row?.id || null };
    } catch (err) {
      fastify.log.error({ err }, 'Error buscando juego por startedAt');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/participants/by-game/:gameId', async (request, reply) => {
    const { gameId } = request.params as any;
    let db;
    try {
      db = await openDb();
      const participants = await db.all(
        `SELECT user_id, team_name, is_bot FROM participants WHERE game_id = ?`,
        [gameId]
      );
      return participants;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo participantes');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/friends/:userId/stats/:friendId', async (request, reply) => {
    const { userId, friendId } = request.params as any;
    let db;
    try {
      db = await openDb();
      const stats = await db.get(`
        SELECT 
          IFNULL(SUM(CASE WHEN p.user_id = ? THEN s.point_number ELSE 0 END), 0) AS pointsFor,
          IFNULL(SUM(CASE WHEN p.user_id = ? THEN s.point_number ELSE 0 END), 0) AS pointsAgainst
        FROM participants p
        JOIN scores s ON s.game_id = p.game_id AND s.team_name = p.team_name
        WHERE p.user_id IN (?, ?)
      `, [userId, friendId, userId, friendId]);
      return stats || { pointsFor: 0, pointsAgainst: 0 };
    } catch (err) {
      fastify.log.error({ err }, 'Error calculando estadísticas entre amigos');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  // GET /api/tournaments
  fastify.get('/tournaments', async (request, reply) => {
    const db = await openDb();
    try {
      const tournaments = await db.all('SELECT * FROM tournaments');
      return tournaments;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo torneos');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      await db.close();
    }
  });

  // POST /api/tournaments
  fastify.post('/tournaments', async (request, reply) => {
    const { name, created_by, status } = request.body as any;
    if (!name) {
      return reply.code(400).send({ message: 'Falta el nombre del torneo' });
    }
    const db = await openDb();
    try {
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO tournaments (name, created_by, status) VALUES (?, ?, ?)',
        params: [name, created_by || null, status || 'upcoming']
      }));
      reply.code(201).send({ message: 'Torneo creado' });
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      await db.close();
    }
  });

  // POST /api/tournaments/:id/join
  fastify.post('/tournaments/:id/join', async (request, reply) => {
    const { id } = request.params as any;
    const { user_id } = request.body as any;
    if (!user_id) {
      return reply.code(400).send({ message: 'Falta user_id' });
    }
    const db = await openDb();
    try {
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO participants (game_id, user_id, team_name) VALUES (?, ?, ?)',
        params: [id, user_id, 'default']
      }));
      reply.code(201).send({ message: 'Unido al torneo' });
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      await db.close();
    }
  });

  // GET /api/game/stats/:userId
  fastify.get('/game/stats/:userId', async (request, reply) => {
    const { userId } = request.params as any;
    const db = await openDb();
    try {
      const stats = await db.all(
        `SELECT * FROM games 
         WHERE player1_id = ? OR player2_id = ? 
         ORDER BY start_time DESC`,
        userId, userId
      );
      return stats;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo estadísticas');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      await db.close();
    }
  });

  // POST /api/game/stats
  fastify.post('/game/stats', async (request, reply) => {
    const { 
      player1_id, 
      player2_id, 
      score1, 
      score2, 
      winner_id, 
      winner_name, 
      game_mode, 
      duration, 
      start_time, 
      end_time 
    } = request.body as any;

    if (!player1_id || !player2_id || score1 === undefined || score2 === undefined) {
      return reply.code(400).send({ message: 'Faltan campos requeridos' });
    }

    const db = await openDb();
    try {
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO games (
          player1_id, player2_id, score1, score2, status, 
          start_time, end_time, winner_id, winner_name, 
          game_mode, duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [player1_id, player2_id, score1, score2, 'finished', start_time, end_time, winner_id, winner_name, game_mode, duration]
      }));
      reply.code(201).send({ message: 'Estadísticas guardadas' });
    } catch (error: any) {
      fastify.log.error({ error }, 'Error guardando estadísticas');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      await db.close();
    }
  });
}