// db-service/src/routes/user.routes.ts

import { FastifyInstance } from 'fastify';
import { openDb } from '../database';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/api/users/by-email/:email', async (request, reply) => {
    const { email } = request.params as any;
    const db = await openDb();
    try {
      const user = await db.get('SELECT id, username, email, password_hash FROM users WHERE email = ?', [email]);
      if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' });
      return reply.send(user);
    } finally {
      await db.close();
    }
  });

  fastify.get('/api/users/:id', async (request, reply) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
      const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [id]);
      if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' });
      return reply.send(user);
    } finally {
      await db.close();
    }
  });

  fastify.get('/api/users/:id/profile', async (request, reply) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
      const profile = await db.get('SELECT avatar_url, language, notifications, doubleFactor, difficulty FROM user_profiles WHERE user_id = ?', [id]);
      if (!profile) return reply.code(404).send({ message: 'Perfil no encontrado' });
      return reply.send(profile);
    } finally {
      await db.close();
    }
  });

  fastify.get('/api/users/:id/stats', async (request, reply) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
      const res = await db.get(`
        SELECT 
          total_games, wins, losses, win_rate, elo, ranking,
          json_group_array(json_object('id', game_id, 'result', result, 'opponent', opponent, 'score', final_score, 'date', date)) as matchHistory
        FROM user_stats_view WHERE user_id = ?
      `, [id]);
      if (!res) return reply.code(404).send({ message: 'Estadísticas no encontradas' });
      res.matchHistory = JSON.parse(res.matchHistory);
      return reply.send(res);
    } finally {
      await db.close();
    }
  });

  fastify.get('/api/users/:id/match-history', async (request, reply) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
      const history = await db.all(`
        SELECT game_id, result, opponent_name as opponent, final_score as score, game_date as date, tournament_name as tournament_name
        FROM user_games_view WHERE user_id = ?
      `, [id]);
      return reply.send(history);
    } finally {
      await db.close();
    }
  });
}