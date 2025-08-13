// db-service/src/routes/misc.routes.ts

import { FastifyInstance } from 'fastify';
import { openDb } from '../database';

export default async function miscRoutes(fastify: FastifyInstance) {
  fastify.get('/api/ranking', async (request, reply) => {
    const db = await openDb();
    try {
      const ranking = await db.all(`
        SELECT id, username, wins, losses, total_games, win_rate, elo, rank, points
        FROM user_ranking_view LIMIT 100
      `);
      return reply.send(ranking);
    } finally {
      await db.close();
    }
  });

  fastify.get('/api/games/live', async (request, reply) => {
    const db = await openDb();
    try {
      const games = await db.all(`
        SELECT g.id, p1.username as player1, p2.username as player2, s1.score as score1, s2.score as score2
        FROM games g
        JOIN participants p1 ON p1.game_id = g.id AND p1.team_name = 'Team A'
        JOIN participants p2 ON p2.game_id = g.id AND p2.team_name = 'Team B'
        LEFT JOIN scores s1 ON s1.game_id = g.id AND s1.team_name = 'Team A'
        LEFT JOIN scores s2 ON s2.game_id = g.id AND s2.team_name = 'Team B'
        WHERE g.status = 'in_progress'
      `);
      return reply.send(games);
    } finally {
      await db.close();
    }
  });
}