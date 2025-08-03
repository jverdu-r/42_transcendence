// auth-service/src/services/friends.services.ts

import { openDb } from '../database';
import redisClient from '../redis-client';

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
  const db = await openDb();

  const friendsRaw = await db.all(`
    SELECT u.id, u.username,
      IFNULL(SUM(CASE WHEN p.user_id = u.id THEN s.point_number ELSE 0 END), 0) AS pointsFor,
      IFNULL(SUM(CASE WHEN p.user_id != u.id THEN s.point_number ELSE 0 END), 0) AS pointsAgainst
    FROM friendships f
    JOIN users u ON (u.id = f.requester_id OR u.id = f.approver_id) AND u.id != ?
    LEFT JOIN participants p ON p.user_id = u.id
    LEFT JOIN scores s ON s.game_id = p.game_id AND s.team_name = p.team_name
    WHERE f.status = 'accepted'
      AND (f.requester_id = ? OR f.approver_id = ?)
    GROUP BY u.id;
  `, [userId, userId, userId]);

  // Opcional: obtener usuarios online de Redis
  // const onlineIds = await getOnlineUserIdsFromRedis();

  const onlineUserIds = await getOnlineUserIds();

  const friends: Friend[] = friendsRaw.map(f => ({
    id: f.id,
    username: f.username,
    elo: 1000 + (f.pointsFor - f.pointsAgainst),
    isOnline: onlineUserIds.has(f.id.toString()),
  }));

  await db.close();
  return friends;
}

export async function getPendingRequests(userId: number) {
  const db = await openDb();
  const result = await db.all(`
    SELECT u.id, u.username
    FROM friendships f
    JOIN users u ON u.id = f.requester_id
    WHERE f.status = 'pending'
      AND f.approver_id = ?;
  `, [userId]);
  await db.close();
  return result;
}

export async function getAvailableUsers(userId: number) {
  const db = await openDb();
  return db.all(`
    SELECT u.id, u.username
    FROM users u
    WHERE u.id != ?
      AND u.id NOT IN (
        SELECT requester_id FROM friendships WHERE approver_id = ?
        UNION
        SELECT approver_id FROM friendships WHERE requester_id = ?
      );
  `, [userId, userId, userId]);
}

export async function sendFriendRequest(requesterId: number, targetId: number): Promise<boolean> {
  console.log('🔍 [sendFriendRequest] requesterId:', requesterId, 'targetId:', targetId);

  const db = await openDb();

  try {
    // Verificar que ambos usuarios existen
    const requester = await db.get('SELECT id FROM users WHERE id = ?', [requesterId]);
    const target = await db.get('SELECT id FROM users WHERE id = ?', [targetId]);

    if (!requester) {
      console.error('❌ requester no existe:', requesterId);
      return false;
    }
    if (!target) {
      console.error('❌ target no existe:', targetId);
      return false;
    }

    // Verificar si ya existe una solicitud
    const existing = await db.get(`SELECT * FROM friendships 
      WHERE (requester_id = ? AND approver_id = ?) 
         OR (requester_id = ? AND approver_id = ?)`, 
      [requesterId, targetId, targetId, requesterId]
    );

    if (existing) {
      console.log('⚠️  Solicitud duplicada:', existing);
      await db.close();
      return false;
    }

    // Insertar nueva solicitud
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `INSERT OR IGNORE INTO friendships (requester_id, approver_id, status) VALUES (?, ?, 'pending')`,
      params: [requesterId, targetId]
    }));

    console.log('✅ Solicitud añadida a la cola Redis');
    await db.close();
    return true;
  } catch (err) {
    console.error('❌ [sendFriendRequest] Error en la base de datos:', err);
    await db.close().catch(console.error);
    throw err; // Propagar el error para que el handler lo vea
  }
}

export async function acceptFriendRequest(requesterId: number, approverId: number): Promise<boolean> {
  const db = await openDb();

  const requestExists = await db.get(
    'SELECT * FROM friendships WHERE requester_id = ? AND approver_id = ? AND status = "pending"',
    [requesterId, approverId]
  );

  if (!requestExists) {
    await db.close();
    return false;
  }

  await redisClient.rPush('sqlite_write_queue', JSON.stringify({
    sql: 'UPDATE friendships SET status = "accepted", created_at = datetime("now") WHERE requester_id = ? AND approver_id = ?',
    params: [requesterId, approverId]
  }));

  await db.close();
  return true;
}

export async function rejectFriendRequest(requesterId: number, approverId: number): Promise<boolean> {
  const db = await openDb();

  const requestExists = await db.get(
    'SELECT * FROM friendships WHERE requester_id = ? AND approver_id = ? AND status = "pending"',
    [requesterId, approverId]
  );

  if (!requestExists) {
    await db.close();
    return false;
  }

  await redisClient.rPush('sqlite_write_queue', JSON.stringify({
    sql: 'DELETE FROM friendships WHERE requester_id = ? AND approver_id = ?',
    params: [requesterId, approverId]
  }));

  await db.close();
  return true;
}

export async function deleteFriend(userId1: number, userId2: number): Promise<boolean> {
  const db = await openDb();

  await redisClient.rPush('sqlite_write_queue', JSON.stringify({
    sql: `
      DELETE FROM friendships 
      WHERE (requester_id = ? AND approver_id = ?) 
         OR (requester_id = ? AND approver_id = ?)
    `,
    params: [userId1, userId2, userId2, userId1]
  }));

  await db.close();
  return true;
}