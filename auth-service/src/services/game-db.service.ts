// auth-service/src/services/game-db.services.ts

import redisClient from '../redis-client';

// Crear partida local en BBDD y sus relaciones
export async function createLocalGameInDB(
  player1Id: number,
  tournamentId: number | null,
  startedAt: string
) {
  const operations = [];

  // 1. Insertar el juego
  operations.push({
    sql: `
      INSERT INTO games (status, tournament_id, started_at)
      VALUES ('pending', ?, ?)
    `,
    params: [tournamentId || null, startedAt]
  });

  // 2. Insertar participants: ambos con el mismo user_id
  operations.push({
    sql: `
      INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), ?, 0, 0, 'Team A')
    `,
    params: [startedAt, player1Id]
  });

  operations.push({
    sql: `
      INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), ?, 0, 0, 'Team B')
    `,
    params: [startedAt, player1Id]
  });

  // 3. Insertar scores
  operations.push({
    sql: `
      INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), ?, 'Team A', 0, ?)
    `,
    params: [startedAt, player1Id, startedAt]
  });

  operations.push({
    sql: `
      INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), ?, 'Team B', 0, ?)
    `,
    params: [startedAt, player1Id, startedAt]
  });

  // Enviar todas las operaciones a Redis
  for (const op of operations) {
    await redisClient.rPush('sqlite_write_queue', JSON.stringify(op));
  }
}

// 2. Actualizar partida local al terminar
export async function updateLocalGameInDB(gameId: string, winnerTeam: 'Team A' | 'Team B', score1: number, score2: number) {
  const operations = [];

  // Actualizar estado del juego
  operations.push({
    sql: `
      UPDATE games 
      SET status = 'finished', finished_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `,
    params: [gameId]
  });

  // Actualizar ganador en participants
  operations.push({
    sql: `
      UPDATE participants 
      SET is_winner = CASE WHEN team_name = ? THEN 1 ELSE 0 END
      WHERE game_id = ?
    `,
    params: [winnerTeam, gameId]
  });

  // Actualizar puntuaciones
  operations.push({
    sql: `
      UPDATE scores 
      SET point_number = ? 
      WHERE game_id = ? AND team_name = 'Team A'
    `,
    params: [score1, gameId]
  });

  operations.push({
    sql: `
      UPDATE scores 
      SET point_number = ? 
      WHERE game_id = ? AND team_name = 'Team B'
    `,
    params: [score2, gameId]
  });

  // Enviar a Redis
  for (const op of operations) {
    await redisClient.rPush('sqlite_write_queue', JSON.stringify(op));
  }
}

export async function createAIGameInDB(
  player1Id: number,
  difficulty: string,
  startedAt: string
) {
  const operations = [];

  operations.push({
    sql: `INSERT INTO games (status, started_at) VALUES ('pending', ?)`,
    params: [startedAt]
  });

  operations.push({
    sql: `
      INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), ?, 0, 0, 'Team A')
    `,
    params: [startedAt, player1Id]
  });

  operations.push({
    sql: `
      INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), NULL, 1, 0, '${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot')
    `,
    params: [startedAt]
  });

  operations.push({
    sql: `
      INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), ?, 'Team A', 0, ?)
    `,
    params: [startedAt, player1Id, startedAt]
  });

  operations.push({
    sql: `
      INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp)
      VALUES ((SELECT id FROM games WHERE status = 'pending' AND started_at = ?), NULL, '${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot', 0, ?)
    `,
    params: [startedAt, startedAt]
  });

  for (const op of operations) {
    await redisClient.rPush('sqlite_write_queue', JSON.stringify(op));
  }
}

export async function updateAIGameInDB(
  gameId: number,
  winnerTeam: string,
  score1: number,
  score2: number
) {
  const operations = [
    { sql: `UPDATE games SET status = 'finished', finished_at = CURRENT_TIMESTAMP WHERE id = ?`, params: [gameId] },
    { sql: `UPDATE participants SET is_winner = 1 WHERE game_id = ? AND team_name = ?`, params: [gameId, winnerTeam] },
    { sql: `UPDATE scores SET point_number = ? WHERE game_id = ? AND team_name = 'Team A'`, params: [score1, gameId] },
    { sql: `UPDATE scores SET point_number = ? WHERE game_id = ? AND team_name IN ('Easy Bot', 'Medium Bot', 'Hard Bot')`, params: [score2, gameId] }
  ];

  for (const op of operations) {
    await redisClient.rPush('sqlite_write_queue', JSON.stringify(op));
  }
}