import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { openDb, initializeDb } from './database';
import redis from './redis-client';
import multipart from '@fastify/multipart';
import { pipeline } from 'stream';
import util from 'util';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { createCanvas, loadImage } from 'canvas';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const fastify = Fastify({ logger: true });

fastify.register(multipart);

// Habilitar CORS

fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Asegurar que las carpetas existen
const dataPath = path.join(__dirname, '../data');
const avatarPath = path.join(dataPath, 'avatars');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
if (!fs.existsSync(avatarPath)) fs.mkdirSync(avatarPath, { recursive: true });

// Rutas estáticas
fastify.register(require('@fastify/static'), {
  root: dataPath,
  prefix: '/downloads/'
});

fastify.register(require('@fastify/static'), {
  root: avatarPath,
  prefix: '/avatars/',
  decorateReply: false // evita conflicto
});

// Middleware para verificar JWT
async function verifyToken(request: any, reply: any) {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) return reply.code(401).send({ message: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ message: 'Token inválido' });
  }
}

fastify.post('/auth/register', async (request, reply) => {
  const { username, email, password } = request.body as any;
  
  if (!username || !email || !password) {
    return reply.code(400).send({ message: 'Faltan campos requeridos' });
  }

  try {
    const db = await openDb();
    
    // Verificar si el usuario ya existe
    const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      await db.close();
      return reply.code(409).send({ message: 'Usuario o email ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    // Insertar directamente en la base de datos
    const result = await db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);
    
    await db.close();
    
    return reply.code(201).send({ message: 'Usuario registrado exitosamente' });
  } catch (err: any) {
    console.error('Error en registro:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return reply.code(409).send({ message: 'Usuario o email ya existe' });
    }
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  
  if (!email || !password) {
    return reply.code(400).send({ message: 'Email y contraseña son requeridos' });
  }

  try {
    const db = await openDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await db.close();
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
    }, JWT_SECRET);
    
    // Obtener avatar_url
    const profile = await db.get('SELECT avatar_url FROM user_profiles WHERE user_id = ?', [user.id]);

    await db.close();

    return reply.send({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: profile?.avatar_url || null
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});
 
// Endpoint para obtener estadísticas del usuario y generar archivo de historial
fastify.get('/auth/profile/stats', { preHandler: verifyToken }, async (request, reply) => {
  try {
    const db = await openDb();
    const userId = (request as any).user.user_id;

    // Obtener todas las partidas completadas con su info de jugadores
    const games = await db.all(`
      SELECT
        g.id AS game_id,
        g.finished_at,
        g.status,
        g.tournament_id,
        p.user_id AS player_id,
        p.team_name AS team,
        u.username,
        t.name AS tournament_name
      FROM games g
      JOIN participants p ON p.game_id = g.id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN tournaments t ON g.tournament_id = t.id
      WHERE g.status IN ('finished')
    `);

    // Obtener todos los scores por game + team
    const scores = await db.all(`
      SELECT game_id, team_name, point_number
      FROM scores
    `);

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      scoreMap.set(`${s.game_id}_${s.team_name}`, s.point_number);
    }

    // Agrupar los jugadores por game_id
    const groupedGames = new Map<number, any[]>();
    for (const g of games) {
      if (!groupedGames.has(g.game_id)) groupedGames.set(g.game_id, []);
      groupedGames.get(g.game_id)!.push(g);
    }

    // Preparar stats individuales
    const userGames = new Map<number, {
      matches: any[],
      pointsFor: number,
      pointsAgainst: number
    }>();

    for (const [gameId, players] of groupedGames.entries()) {
      if (players.length < 1) continue;

      for (const current of players) {
        const opponent = players.find(p => p.player_id !== current.player_id && p.user_id !== null) || null;

        const userScore = scoreMap.get(`${gameId}_${current.team}`) ?? 0;

        let opponentScore = 0;
        let opponentName = 'Bot AI';

        if (opponent) {
          opponentScore = scoreMap.get(`${gameId}_${opponent.team}`) ?? 0;
          opponentName = opponent.username || 'Bot AI';
        } else {
          // Buscar en scores el otro equipo aunque no haya participant asociado
          const allTeams = scores
            .filter(s => s.game_id === gameId)
            .map(s => s.team_name);
          const otherTeam = allTeams.find(t => t !== current.team);
          if (otherTeam) {
            opponentScore = scoreMap.get(`${gameId}_${otherTeam}`) ?? 0;
          }
        }

        if (!userGames.has(current.player_id)) {
          userGames.set(current.player_id, {
            matches: [],
            pointsFor: 0,
            pointsAgainst: 0
          });
        }

        userGames.get(current.player_id)!.pointsFor += userScore;
        userGames.get(current.player_id)!.pointsAgainst += opponentScore;

        userGames.get(current.player_id)!.matches.push({
          id: gameId,
          result: userScore > opponentScore ? 'win' : 'loss',
          opponent: opponentName,
          score: `${userScore}-${opponentScore}`,
          date: current.finished_at,
          tournament: current.tournament_name || '-'
        });
      }
    }

    // Calcular ELOs
    const eloList = Array.from(userGames.entries()).map(([uid, data]) => ({
      user_id: uid,
      elo: 1000 + data.pointsFor - data.pointsAgainst
    }));

    // Asegurar que todos los usuarios están presentes (aun sin partidas)
    const allUsers = await db.all(`SELECT id FROM users`);
    for (const u of allUsers) {
      if (!userGames.has(u.id)) {
        userGames.set(u.id, { matches: [], pointsFor: 0, pointsAgainst: 0 });
        eloList.push({ user_id: u.id, elo: 1000 });
      }
    }

    eloList.sort((a, b) => b.elo - a.elo);
    const ranking = eloList.findIndex(u => u.user_id === userId) + 1;

    const userData = userGames.get(userId)!;
    const wins = userData.matches.filter(m => m.result === 'win').length;
    const losses = userData.matches.filter(m => m.result === 'loss').length;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const elo = 1000 + userData.pointsFor - userData.pointsAgainst;

    const matchHistory = userData.matches.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Guardar historial completo en txt
    const filePath = path.resolve('/app/data/historial_partidas.txt');
    const matchHistoryText = matchHistory.map(entry =>
      `Partida ${entry.id} | Resultado: ${entry.result} | Oponente: ${entry.opponent} | Torneo: ${entry.tournament} | Marcador: ${entry.score} | Fecha: ${entry.date}`
    );
    fs.writeFileSync(filePath, matchHistoryText.join('\n'));

    // Avatar
    const profile = await db.get('SELECT avatar_url FROM user_profiles WHERE user_id = ?', [userId]);

    await db.close();

    return reply.send({
      totalGames,
      wins,
      losses,
      winRate,
      elo,
      ranking,
      matchHistory: matchHistory.slice(0, 10),
      avatar_url: profile?.avatar_url || null
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint para subir el avatar
fastify.post('/auth/profile/avatar', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  
  const mpRequest = request as FastifyRequest & {
    file: () => Promise<MultipartFile>;
  };

  const data = await mpRequest.file();

  if (!data) {
    return reply.code(400).send({ message: 'No se ha enviado ningún archivo' });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(data.mimetype)) {
    return reply.code(400).send({ message: 'Tipo de archivo no permitido' });
  }

  if (data.file.truncated) {
    return reply.code(400).send({ message: 'Archivo demasiado grande (máx 2MB)' });
  }

  try {
    const buffer = await data.toBuffer();
    const image = await loadImage(buffer);
    
    // Tamaño máximo deseado
    const MAX_SIZE = 256;
    let width = image.width;
    let height = image.height;

    // Redimensionar manteniendo aspect ratio
    if (width > height && width > MAX_SIZE) {
      height = Math.round((height * MAX_SIZE) / width);
      width = MAX_SIZE;
    } else if (height > MAX_SIZE) {
      width = Math.round((width * MAX_SIZE) / height);
      height = MAX_SIZE;
    }

    // Crear canvas con nuevas dimensiones
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    // Convertir a JPEG con calidad del 80% (más ligero que PNG)
    const processedBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });

    const filename = `avatar_${userId}.jpg`;
    const saveDir = '/app/data/avatars';
    const filepath = path.join(saveDir, filename);

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    fs.writeFileSync(filepath, processedBuffer);

    // Guardar en base de datos
    const db = await openDb();
    await db.run(`
      INSERT INTO user_profiles (user_id, avatar_url)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET avatar_url = excluded.avatar_url
    `, [userId, `/avatars/${filename}`]);

    await db.close();

    return reply.send({ 
      message: '✅ Avatar optimizado y subido correctamente', 
      avatar_url: `http://localhost:8000/avatars/${filename}`,
      dimensions: { width, height },
      size: `${(processedBuffer.length / 1024).toFixed(2)} KB`
    });

  } catch (err) {
    console.error('Error procesando avatar:', err);
    return reply.code(500).send({ message: 'Error procesando avatar' });
  }
});

// Endpoint para obtener el ranking global completo
fastify.get('/auth/ranking', async (request, reply) => {
  try {
    const db = await openDb();

    // Obtener partidas finalizadas
    const games = await db.all(`
      SELECT
        g.id AS game_id,
        g.finished_at,
        g.status,
        g.tournament_id,
        p.user_id AS player_id,
        p.team_name AS team,
        u.username,
        t.name AS tournament_name
      FROM games g
      JOIN participants p ON p.game_id = g.id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN tournaments t ON g.tournament_id = t.id
      WHERE g.status IN ('finished')
    `);

    // Scores
    const scores = await db.all(`
      SELECT game_id, team_name, point_number
      FROM scores
    `);

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      scoreMap.set(`${s.game_id}_${s.team_name}`, s.point_number);
    }

    // Agrupar jugadores por partida
    const groupedGames = new Map<number, any[]>();
    for (const g of games) {
      if (!groupedGames.has(g.game_id)) groupedGames.set(g.game_id, []);
      groupedGames.get(g.game_id)!.push(g);
    }

    // Calcular estadísticas por jugador
    const userGames = new Map<number, {
      username: string;
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();

    for (const [gameId, players] of groupedGames.entries()) {
      if (players.length < 1) continue;

      for (const current of players) {
        const uid = current.player_id;
        if (!uid) continue;

        const opponent = players.find(p => p.player_id !== uid && p.user_id !== null) || null;
        const userScore = scoreMap.get(`${gameId}_${current.team}`) ?? 0;

        let opponentScore = 0;
        if (opponent) {
          opponentScore = scoreMap.get(`${gameId}_${opponent.team}`) ?? 0;
        } else {
          // Buscar el otro equipo aunque sea contra bot
          const allTeams = scores
            .filter(s => s.game_id === gameId)
            .map(s => s.team_name);
          const otherTeam = allTeams.find(t => t !== current.team);
          if (otherTeam) {
            opponentScore = scoreMap.get(`${gameId}_${otherTeam}`) ?? 0;
          }
        }

        if (!userGames.has(uid)) {
          userGames.set(uid, {
            username: current.username || `User${uid}`,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0
          });
        }

        const stats = userGames.get(uid)!;
        stats.pointsFor += userScore;
        stats.pointsAgainst += opponentScore;
        if (userScore > opponentScore) {
          stats.wins += 1;
        } else {
          stats.losses += 1;
        }
      }
    }

    // Asegurar que todos los usuarios están en el ranking
    const allUsers = await db.all(`SELECT id, username FROM users`);
    for (const u of allUsers) {
      if (!userGames.has(u.id)) {
        userGames.set(u.id, {
          username: u.username,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0
        });
      }
    }

    // Calcular ELO y preparar la respuesta
    const rankingRaw = Array.from(userGames.entries()).map(([uid, data]) => {
      const totalGames = data.wins + data.losses;
      const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;
      const elo = 1000 + data.pointsFor - data.pointsAgainst;

      return {
        id: uid,
        username: data.username,
        wins: data.wins,
        losses: data.losses,
        totalGames,
        winRate,
        elo
      };
    });

    rankingRaw.sort((a, b) => b.elo - a.elo);

    const rankingTop100 = rankingRaw.slice(0, 100).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      points: entry.elo // puedes ajustar esto si usas un sistema distinto de puntos
    }));

    await db.close();
    return reply.send(rankingTop100);
  } catch (err) {
    console.error('Error obteniendo ranking:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint para actualizar configuraciones del usuario


// Endpoint de home para apartidos en juego
fastify.get('/auth/games/live', async (request, reply) => {
  try {
    const db = await openDb();

    // Buscar partidas en progreso
    const games = await db.all(`
      SELECT g.id AS game_id, g.status, g.started_at
      FROM games g
      WHERE g.status = 'in_progress'
    `);

    if (!games.length) {
      await db.close();
      return reply.send([]);
    }

    // Obtener participantes humanos (no bots) de esas partidas
    const participants = await db.all(`
      SELECT p.game_id, p.team_name, u.username
      FROM participants p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.game_id IN (${games.map(g => g.game_id).join(',')})
    `);

    // Obtener puntuaciones por game_id + team
    const scores = await db.all(`
      SELECT game_id, team_name, MAX(point_number) AS score
      FROM scores
      WHERE game_id IN (${games.map(g => g.game_id).join(',')})
      GROUP BY game_id, team_name
    `);

    // Mapear resultados por partida
    const liveMatches = games.map(game => {
      const gameParticipants = participants.filter(p => p.game_id === game.game_id);
      const scoreMap = new Map();
      scores
        .filter(s => s.game_id === game.game_id)
        .forEach(s => scoreMap.set(s.team_name, s.score));

      const [p1, p2] = gameParticipants;
      return {
        id: game.game_id,
        player1: { username: p1?.username || 'Player 1' },
        player2: { username: p2?.username || 'Player 2' },
        score1: scoreMap.get(p1?.team_name) || 0,
        score2: scoreMap.get(p2?.team_name) || 0,
        round: Math.max(scoreMap.get(p1?.team_name) || 0, scoreMap.get(p2?.team_name) || 0)
      };
    });

    await db.close();
    return reply.send(liveMatches);
  } catch (err) {
    console.error('Error obteniendo partidas en vivo:', err);
    return reply.code(500).send({ error: 'Error al obtener partidas en vivo' });
  }
});

// Endpoint para eliminar cuenta
fastify.delete('/auth/profile', { preHandler: verifyToken }, async (request, reply) => {
  try {
    const db = await openDb();
    const userId = (request as any).user.user_id;
    const { password } = request.body as any;
    
    // Verificar contraseña
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await db.close();
      return reply.code(401).send({ message: 'Contraseña incorrecta' });
    }
    
    // Eliminar configuraciones del usuario
    await db.run('DELETE FROM user_settings WHERE user_id = ?', [userId]);
    
    // Eliminar mensajes del usuario
    await db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
    
    // Eliminar usuario
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    
    await db.close();
    
    return reply.send({ message: 'Cuenta eliminada exitosamente' });
    
  } catch (err) {
    console.error('Error eliminando cuenta:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

type GooglePayload = {
  email: string;
  name: string;
  picture?: string;
  [key: string]: any;
};

fastify.post('/auth/google', async (request, reply) => {
  const { token } = request.body as any;
  
  if (!token) {
    return reply.code(400).send({ message: 'Falta token de Google' });
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!res.ok) {
      return reply.code(401).send({ message: 'Token de Google inválido' });
    }
    
    const payload = (await res.json()) as GooglePayload;
    
    const db = await openDb();
    let user = await db.get('SELECT * FROM users WHERE email = ?', [payload.email]);
    
    if (!user) {
      // Crear nuevo usuario con Google
      const result = await db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [payload.name, payload.email, ''] // Sin contraseña para usuarios de Google
      );
      
      user = await db.get('SELECT * FROM users WHERE email = ?', [payload.email]);
    }

    const jwtToken = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
    }, JWT_SECRET);

    await db.close();
    
    return reply.send({ 
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error con Google Sign-In:', err);
    return reply.code(500).send({ message: 'Error con Google Sign-In' });
  }
});

// Endpoint para descargar historial
fastify.get('/auth/profile/download-historial', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const filePath = path.resolve('/app/data/historial_partidas.txt');

  if (!fs.existsSync(filePath)) {
    return reply.code(404).send({ message: 'Historial no encontrado' });
  }

  return reply
    .type('text/plain')
    .header('Content-Disposition', `attachment; filename=historial_${userId}.txt`)
    .send(fs.createReadStream(filePath));
});

// Inicializar base de datos antes de arrancar el servidor
initializeDb().then(() => {
  fastify.listen({ port: 8000, host: '0.0.0.0' }, err => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
});

