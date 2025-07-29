// auth-service/routes/friends.routes.ts

import { FastifyInstance } from 'fastify';
import { getFriendsHandler, getPendingRequestsHandler, getAvailableUsersHandler, sendFriendRequestHandler } from '../controllers/friends.controller';
import { verifyToken } from '../utils/auth-middleware';

export default async function friendsRoutes(fastify: FastifyInstance) {
    console.log("✅ Friends routes registered");
    fastify.get('/', { preHandler: verifyToken }, getFriendsHandler);
    fastify.get('/requests', { preHandler: verifyToken }, getPendingRequestsHandler);
    fastify.get('/available', { preHandler: verifyToken }, getAvailableUsersHandler);
    fastify.post('/request/:targetId', { preHandler: verifyToken }, sendFriendRequestHandler);
}
