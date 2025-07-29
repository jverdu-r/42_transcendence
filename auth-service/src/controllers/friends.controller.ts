// auth-service/src/controllers/friends.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { getFriends, getPendingRequests, getAvailableUsers, sendFriendRequest } from '../services/friends.services';

export async function getFriendsHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.user_id;
  if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

  const friends = await getFriends(userId);
  return reply.send(friends);
}

export async function getPendingRequestsHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.user_id;
  if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

  const pending = await getPendingRequests(userId);
  return reply.send(pending);
}

export async function getAvailableUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.user_id;
  if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

  const users = await getAvailableUsers(userId);
  return reply.send(users);
}

export async function sendFriendRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.user_id;
  const targetId = Number((request.params as any).targetId);
  if (!userId || !targetId || userId === targetId) {
    return reply.status(400).send({ error: 'Invalid target user' });
  }

  try {
    const result = await sendFriendRequest(userId, targetId);
    return reply.send({ success: result });
  } catch (err) {
    console.error('Error sending friend request:', err);
    return reply.status(500).send({ error: 'Server error' });
  }
}