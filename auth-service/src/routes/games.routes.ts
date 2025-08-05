// auth-service/routes/games.routes.ts

import { FastifyInstance } from 'fastify';
import { startGameHandler } from '../controllers/games.controller';
import { getUserIdByUsername } from '../controllers/games.controller';

export default async function gamesRoutes(fastify: FastifyInstance) {
  fastify.post('/start', startGameHandler);
fastify.get('/user-id', getUserIdByUsername);
  
}
