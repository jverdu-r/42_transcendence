// db-service/src/routes/game.routes.ts
import { FastifyInstance } from 'fastify';
import { openDb } from '../database';

export default async function gameRoutes(fastify: FastifyInstance) {
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
      // ✅ Usa { err }
      fastify.log.error({ err }, 'Error buscando juego por startedAt');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch((closeErr) => console.error('Error cerrando db:', closeErr));
    }
  });

  // GET /api/participants/by-game/:gameId
  fastify.get('/participants/by-game/:gameId', async (request, reply) => {
    const { gameId } = request.params as any;
    const db = await openDb();
    try {
      const participants = await db.all(
        `SELECT user_id, team_name, is_bot FROM participants WHERE game_id = ?`,
        [gameId]
      );
      return participants;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo participantes:');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });
}
