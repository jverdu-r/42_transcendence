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

export async function sendFriendRequest(userId: number, targetId: number): Promise<boolean> {
  const db = await openDb();

  // Verifica si ya existe
  const existing = await db.get(
    `SELECT * FROM friendships 
     WHERE (user_id = ? AND friend_id = ?) 
        OR (user_id = ? AND friend_id = ?)`,
    [userId, targetId, targetId, userId]
  );

  if (existing) {
    await db.close();
    return false;
  }

  await redisClient.rPush('sqlite_write_queue', JSON.stringify({
    sql: 
    `INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
    params: [userId, targetId]
  }));

  await db.close();
  return true;
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
