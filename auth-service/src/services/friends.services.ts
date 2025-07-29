// auth-service/src/services/friends.services.ts

import { openDb } from '../database';

interface Friend {
    id: number;
    username: string;
    isOnline: boolean;
    elo: number;
}

export async function getFriends(userId: number): Promise<Friend[]> {
  const db = await openDb();

  const friendsRaw = await db.all(`
    SELECT u.id, u.username,
      IFNULL(SUM(CASE WHEN p.user_id = u.id THEN s.point_number ELSE 0 END), 0) AS pointsFor,
      IFNULL(SUM(CASE WHEN p.user_id != u.id THEN s.point_number ELSE 0 END), 0) AS pointsAgainst
    FROM friendships f
    JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id) AND u.id != ?
    LEFT JOIN participants p ON p.user_id = u.id
    LEFT JOIN scores s ON s.game_id = p.game_id AND s.team_name = p.team_name
    WHERE f.status = 'accepted' AND (f.user_id = ? OR f.friend_id = ?)
    GROUP BY u.id
  `, [userId, userId, userId]);

  // Opcional: obtener usuarios online de Redis
  // const onlineIds = await getOnlineUserIdsFromRedis();

  const friends: Friend[] = friendsRaw.map(f => ({
    id: f.id,
    username: f.username,
    elo: 1000 + (f.pointsFor - f.pointsAgainst),
    isOnline: false,
  }));

  await db.close();
  return friends;
}

export async function getPendingRequests(userId: number) {
  const db = await openDb();
  return db.all(`
    SELECT u.id, u.username
    FROM friendships f
    JOIN users u ON u.id = f.requester_id
    WHERE f.status = 'pending'
      AND f.approver_id = ?;
  `, [userId]);
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

  await db.run(
    `INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
    [userId, targetId]
  );

  await db.close();
  return true;
}
