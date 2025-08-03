// auth-service/src/controllers/friends.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { getFriends, getPendingRequests, getAvailableUsers, sendFriendRequest } from '../services/friends.services';
import { acceptFriendRequest, rejectFriendRequest, deleteFriend } from '../services/friends.services';

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
  const requesterId = (request as any).user.user_id;
  const { targetId } = request.body as { targetId: number };

  console.log('🔍 [sendFriendRequestHandler] requesterId:', requesterId);
  console.log('🔍 [sendFriendRequestHandler] targetId:', targetId);
  console.log('🔍 [sendFriendRequestHandler] request.body:', request.body);

  if (!targetId || requesterId === targetId) {
    return reply.status(400).send({ error: 'Invalid target user' });
  }

  try {
    const result = await sendFriendRequest(requesterId, targetId);
    return reply.send({ success: result });
  } catch (err) {
    console.error('Error sending friend request:', err);
    return reply.status(500).send({ error: 'Server error' });
  }
}

export async function acceptFriendRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const approverId = (request as any).user.user_id;
  const { senderId: requesterId } = request.body as { senderId: number };

  if (!requesterId) {
    return reply.code(400).send({ message: 'ID del remitente requerido' });
  }

  const success = await acceptFriendRequest(requesterId, approverId);
  if (!success) {
    return reply.code(404).send({ message: 'Solicitud no encontrada' });
  }

  return reply.send({ message: 'Amistad aceptada' });
}

export async function rejectFriendRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const approverId = (request as any).user.user_id;
  const { senderId: requesterId } = request.body as { senderId: number };

  if (!requesterId) {
    return reply.code(400).send({ message: 'ID del remitente requerido' });
  }

  const success = await rejectFriendRequest(requesterId, approverId);
  if (!success) {
    return reply.code(404).send({ message: 'Solicitud no encontrada' });
  }

  return reply.send({ message: 'Solicitud rechazada' });
}

export async function deleteFriendHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.user_id;
  const { targetId } = request.body as { targetId: number };

  if (!targetId || userId === targetId) {
    return reply.status(400).send({ error: 'ID inválido' });
  }

  try {
    await deleteFriend(userId, targetId);
    return reply.send({ success: true });
  } catch (err) {
    console.error('Error al eliminar amigo:', err);
    return reply.status(500).send({ error: 'Error al eliminar amigo' });
  }
}
