// db-service/src/routes/friends.routes.ts

import { FastifyInstance } from 'fastify';
import { openDb } from '../database';
import redisClient from '../redis-client';

export default async function friendsRoutes(fastify: FastifyInstance) {
  fastify.get('/friends/:userId', async (request, reply) => {
    const { userId } = request.params as any;
    let db;
    try {
      db = await openDb();
      const friends = await db.all(`
        SELECT u.id, u.username 
        FROM friendships f
        JOIN users u ON (u.id = f.requester_id OR u.id = f.approver_id) AND u.id != ?
        WHERE f.status = 'accepted'
          AND (f.requester_id = ? OR f.approver_id = ?)
      `, [userId, userId, userId]);
      return friends;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo amigos');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/friends/:userId/requests/pending', async (request, reply) => {
    const { userId } = request.params as any;
    let db;
    try {
      db = await openDb();
      const requests = await db.all(`
        SELECT u.id, u.username
        FROM friendships f
        JOIN users u ON u.id = f.requester_id
        WHERE f.status = 'pending'
          AND f.approver_id = ?
      `, [userId]);
      return requests;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo solicitudes pendientes');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/friends/:userId/available', async (request, reply) => {
    const { userId } = request.params as any;
    let db;
    try {
      db = await openDb();
      const users = await db.all(`
        SELECT u.id, u.username
        FROM users u
        WHERE u.id != ?
          AND u.id NOT IN (
            SELECT requester_id FROM friendships WHERE approver_id = ?
            UNION
            SELECT approver_id FROM friendships WHERE requester_id = ?
          )
      `, [userId, userId, userId]);
      return users;
    } catch (err) {
      fastify.log.error({ err }, 'Error obteniendo usuarios disponibles');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  fastify.get('/friends/request/check', async (request, reply) => {
    const { requesterId, approverId, status } = request.query as any;
    let db;
    try {
      db = await openDb();
      let sql = `SELECT * FROM friendships WHERE (requester_id = ? AND approver_id = ?)`;
      const params = [requesterId, approverId];
      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }
      const result = await db.get(sql, params);
      return result;
    } catch (err) {
      fastify.log.error({ err }, 'Error verificando solicitud de amistad');
      reply.code(500).send({ message: 'Error interno' });
    } finally {
      if (db) await db.close().catch(console.error);
    }
  });

  // ✅ Endpoint corregido: ahora tiene try/catch/finally y define `db`
  fastify.get('/api/friends/:userId/stats/:friendId', async (request, reply) => {
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
}
