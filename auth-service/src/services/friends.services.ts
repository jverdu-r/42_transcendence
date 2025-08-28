// auth-service/src/services/friends.services.ts

import redisClient from '../redis-client';
import { getUserById } from '../database'; // ← Usa el nuevo database.ts

interface Friend {
  id: number;
  username: string;
  isOnline: boolean;
  elo: number;
}

export async function getOnlineUserIds(): Promise<Set<string>> {
  try {
    const onlineUsers = await redisClient.sMembers('online_users');
    return new Set(onlineUsers);
  } catch (err) {
    console.error('Error obteniendo usuarios online:', err);
    return new Set();
  }
}

export async function getFriends(userId: number): Promise<Friend[]> {
  try {
    // 1. Obtener amigos desde db-service
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/friends/${userId}`);
    if (!res.ok) {
      console.warn(`No se pudieron obtener amigos para el usuario ${userId}`);
      return [];
    }
    const friendsRaw = await res.json();

    // 2. Obtener usuarios online
    const onlineUserIds = await getOnlineUserIds();

    // 3. Mapear amigos con ELO
    const friends: Friend[] = await Promise.all(
      friendsRaw.map(async (f: any) => {
        // Obtener estadísticas de partidas entre ambos (opcional, si db-service no lo da)
        const statsRes = await fetch(`${process.env.DB_SERVICE_URL}/api/friends/${userId}/stats/${f.id}`);
        const stats = await statsRes.json().catch(() => ({}));

        const pointsFor = stats.pointsFor || 0;
        const pointsAgainst = stats.pointsAgainst || 0;

        return {
          id: f.id,
          username: f.username,
          isOnline: onlineUserIds.has(f.id.toString()),
          elo: 1000 + (pointsFor - pointsAgainst)
        };
      })
    );

    return friends;
  } catch (err) {
    console.error('Error obteniendo amigos:', err);
    return [];
  }
}

export async function getPendingRequests(userId: number) {
  try {
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/friends/${userId}/requests/pending`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error obteniendo solicitudes pendientes:', err);
    return [];
  }
}

export async function getAvailableUsers(userId: number) {
  try {
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/friends/${userId}/available`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error obteniendo usuarios disponibles:', err);
    return [];
  }
}

export async function sendFriendRequest(requesterId: number, targetId: number): Promise<boolean> {
  console.log('🔍 [sendFriendRequest] requesterId:', requesterId, 'targetId:', targetId);

  try {
    // 1. Verificar que ambos usuarios existen
    const requester = await getUserById(requesterId.toString());
    const target = await getUserById(targetId.toString());

    if (!requester) {
      console.error('❌ requester no existe:', requesterId);
      return false;
    }
    if (!target) {
      console.error('❌ target no existe:', targetId);
      return false;
    }

    // 2. Verificar si ya existe una solicitud
    const checkRes = await fetch(
      `${process.env.DB_SERVICE_URL}/api/friends/request/check?requesterId=${requesterId}&targetId=${targetId}`
    );
    const existing = await checkRes.json().catch(() => null);

    if (existing) {
      console.log('⚠️  Solicitud duplicada:', existing);
      return false;
    }

    // 3. Insertar nueva solicitud
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `INSERT OR IGNORE INTO friendships (requester_id, approver_id, status) VALUES (?, ?, 'pending')`,
      params: [requesterId, targetId]
    }));

    console.log('✅ Solicitud añadida a la cola Redis');
    return true;
  } catch (err) {
    console.error('❌ [sendFriendRequest] Error en la base de datos:', err);
    throw err;
  }
}

export async function acceptFriendRequest(requesterId: number, approverId: number): Promise<boolean> {
  try {
    const checkRes = await fetch(
      `${process.env.DB_SERVICE_URL}/api/friends/request/check?requesterId=${requesterId}&approverId=${approverId}&status=pending`
    );
    if (!checkRes.ok) return false;

    const requestExists = await checkRes.json();
    if (!requestExists) return false;

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE friendships SET status = "accepted", created_at = datetime("now") WHERE requester_id = ? AND approver_id = ?',
      params: [requesterId, approverId]
    }));

    return true;
  } catch (err) {
    console.error('❌ [acceptFriendRequest] Error:', err);
    return false;
  }
}

export async function rejectFriendRequest(requesterId: number, approverId: number): Promise<boolean> {
  try {
    const checkRes = await fetch(
      `${process.env.DB_SERVICE_URL}/api/friends/request/check?requesterId=${requesterId}&approverId=${approverId}&status=pending`
    );
    if (!checkRes.ok) return false;

    const requestExists = await checkRes.json();
    if (!requestExists) return false;

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'DELETE FROM friendships WHERE requester_id = ? AND approver_id = ?',
      params: [requesterId, approverId]
    }));

    return true;
  } catch (err) {
    console.error('❌ [rejectFriendRequest] Error:', err);
    return false;
  }
}

export async function deleteFriend(userId1: number, userId2: number): Promise<boolean> {
  try {
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `
        DELETE FROM friendships 
        WHERE (requester_id = ? AND approver_id = ?) 
           OR (requester_id = ? AND approver_id = ?)
      `,
      params: [userId1, userId2, userId2, userId1]
    }));

    return true;
  } catch (err) {
    console.error('❌ [deleteFriend] Error:', err);
    return false;
  }
}