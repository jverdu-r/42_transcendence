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

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const fastify = Fastify({ logger: true });

fastify.register(multipart);

// Habilitar CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
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

fastify.post('/api/auth/register', async (request, reply) => {
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

    await db.close();
    
    return reply.send({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
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

    const matches = await db.all(`
      SELECT 
        g.id,
        g.finished_at,
        g.status,
        p1.user_id AS player1_id,
        p2.user_id AS player2_id,
        u1.username AS player1_name,
        u2.username AS player2_name,
        SUM(CASE WHEN s.team_name = p1.team_name THEN 1 ELSE 0 END) AS score1,
        SUM(CASE WHEN s.team_name = p2.team_name THEN 1 ELSE 0 END) AS score2
      FROM games g
      LEFT JOIN participants p1 ON p1.game_id = g.id AND p1.user_id = ?
      LEFT JOIN participants p2 ON p2.game_id = g.id AND p2.user_id != ?
      LEFT JOIN users u1 ON u1.id = p1.user_id
      LEFT JOIN users u2 ON u2.id = p2.user_id
      LEFT JOIN scores s ON s.game_id = g.id
      WHERE g.status = 'completed' AND (p1.user_id IS NOT NULL OR p2.user_id IS NOT NULL)
      GROUP BY g.id
      ORDER BY g.finished_at DESC
    `, [userId, userId]);

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    const matchHistory: any[] = [];
    const matchHistoryText: string[] = [];

    for (const match of matches) {
      const isPlayer1 = match.player1_id === userId;
      const userScore = isPlayer1 ? match.score1 : match.score2;
      const opponentScore = isPlayer1 ? match.score2 : match.score1;
      const opponent = isPlayer1 ? match.player2_name : match.player1_name;
      const result = userScore > opponentScore ? 'win' : 'loss';

      if (result === 'win') wins++;
      else losses++;

      pointsFor += userScore;
      pointsAgainst += opponentScore;

      const entry = {
        id: match.id,
        result,
        opponent: opponent || 'Desconocido',
        score: `${userScore}-${opponentScore}`,
        date: match.finished_at
      };

      matchHistory.push(entry);
      matchHistoryText.push(`Partida ${entry.id} | Resultado: ${entry.result} | Oponente: ${entry.opponent} | Marcador: ${entry.score} | Fecha: ${entry.date}`);
    }

    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const elo = 1000 + (pointsFor - pointsAgainst);

    // Ranking por ELO
    const allElo = await db.all(`
      SELECT u.id AS user_id,
        SUM(CASE WHEN p.user_id = u.id AND g.status = 'completed' AND s.team_name = p.team_name THEN 1 ELSE 0 END) as points_for,
        SUM(CASE WHEN p.user_id = u.id AND g.status = 'completed' AND s.team_name != p.team_name THEN 1 ELSE 0 END) as points_against
      FROM users u
      LEFT JOIN participants p ON p.user_id = u.id
      LEFT JOIN games g ON g.id = p.game_id
      LEFT JOIN scores s ON s.game_id = g.id
      GROUP BY u.id
    `);

    const eloList = allElo.map(user => ({
      user_id: user.user_id,
      elo: 1000 + ((user.points_for || 0) - (user.points_against || 0))
    })).sort((a, b) => b.elo - a.elo);

    const ranking = eloList.findIndex(u => u.user_id === userId) + 1;

    // Escribir historial completo a archivo
    const filePath = path.resolve('/app/data/historial_partidas.txt');
    fs.writeFileSync(filePath, matchHistoryText.join('\n'));

    await db.close();

    return reply.send({
      totalGames,
      wins,
      losses,
      winRate,
      elo,
      ranking,
      matchHistory: matchHistory.slice(0, 5) // solo las últimas 5 para mostrar
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint para subir el avatar

const pump = util.promisify(pipeline);

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

  const ext = data.filename.split('.').pop();
  const saveDir = '/app/data/avatars';
  const filename = `avatar_${userId}.${ext}`;
  const filepath = path.join(saveDir, filename);

  // Asegura que la carpeta exista
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  try {
    await pump(data.file, fs.createWriteStream(filepath));

    // Guardar ruta del avatar en base de datos
    const db = await openDb();
    await db.run(`
      INSERT INTO user_profiles (user_id, avatar_url)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET avatar_url = excluded.avatar_url
    `, [userId, `/avatars/${filename}`]);

    await db.close();

    return reply.send({ message: '✅ Avatar subido correctamente', avatar_url: `/avatars/${filename}` });
  } catch (err) {
    console.error('Error guardando avatar:', err);
    return reply.code(500).send({ message: 'Error subiendo avatar' });
  }
});

// Endpoint para obtener configuraciones del usuario


// Endpoint para actualizar configuraciones del usuario


// Endpoint para actualizar perfil del usuario


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

// Inicializar base de datos antes de arrancar el servidor
initializeDb().then(() => {
  fastify.listen({ port: 8000, host: '0.0.0.0' }, err => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
});

