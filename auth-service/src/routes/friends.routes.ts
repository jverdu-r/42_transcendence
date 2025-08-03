import { FastifyInstance } from 'fastify';
import {
  getFriendsHandler,
  getPendingRequestsHandler,
  getAvailableUsersHandler,
  sendFriendRequestHandler,
  acceptFriendRequestHandler,
  rejectFriendRequestHandler,
  deleteFriendHandler
} from '../controllers/friends.controller';
import { verifyToken } from '../utils/auth-middleware';

export default async function friendsRoutes(fastify: FastifyInstance) {
    console.log("✅ Friends routes registered");
  fastify.get('/', { preHandler: verifyToken }, getFriendsHandler);
  fastify.get('/requests', { preHandler: verifyToken }, getPendingRequestsHandler);
  fastify.get('/available', { preHandler: verifyToken }, getAvailableUsersHandler);
  fastify.post('/request', { preHandler: verifyToken }, sendFriendRequestHandler);
  fastify.post('/requests/accept', { preHandler: verifyToken }, acceptFriendRequestHandler);
  fastify.post('/requests/reject', { preHandler: verifyToken }, rejectFriendRequestHandler);
  fastify.post('/delete', { preHandler: verifyToken }, deleteFriendHandler);
}