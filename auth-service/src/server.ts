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
import sharp from 'sharp';

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

    const games = await db.all(`
      SELECT 
        g.id AS game_id,
        g.finished_at,
        g.status,
        p.user_id AS player_id,
        p.team_name AS player_team,
        u.username AS player_name
      FROM games g
      JOIN participants p ON p.game_id = g.id
      JOIN users u ON u.id = p.user_id
      WHERE g.status = 'completed'
    `);

    const scores = await db.all(`
      SELECT 
        s.game_id,
        s.team_name,
        s.point_number
      FROM scores s
    `);

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      scoreMap.set(`${s.game_id}_${s.team_name}`, s.point_number);
    }

    const userGames = new Map<number, {
      matches: any[],
      pointsFor: number,
      pointsAgainst: number
    }>();

    for (const g of games) {
      const rivals = games.filter(m => m.game_id === g.game_id && m.player_id !== g.player_id);
      const rival = rivals[0];

      const userScore = scoreMap.get(`${g.game_id}_${g.player_team}`) ?? 0;
      const rivalScore = rival ? scoreMap.get(`${rival.game_id}_${rival.player_team}`) ?? 0 : 0;

      if (!userGames.has(g.player_id)) {
        userGames.set(g.player_id, {
          matches: [],
          pointsFor: 0,
          pointsAgainst: 0
        });
      }

      const result = userScore > rivalScore ? 'win' : 'loss';

      userGames.get(g.player_id)!.pointsFor += userScore;
      userGames.get(g.player_id)!.pointsAgainst += rivalScore;

      userGames.get(g.player_id)!.matches.push({
        id: g.game_id,
        result,
        opponent: rival ? rival.player_name : 'Bot AI',
        score: `${userScore}-${rivalScore}`,
        date: g.finished_at
      });
    }

    const eloList = Array.from(userGames.entries()).map(([uid, data]) => ({
      user_id: uid,
      elo: 1000 + data.pointsFor - data.pointsAgainst
    }));

    const allUsers = await db.all(`SELECT id FROM users`);
    for (const u of allUsers) {
      if (!userGames.has(u.id)) {
        eloList.push({ user_id: u.id, elo: 1000 });
        userGames.set(u.id, { matches: [], pointsFor: 0, pointsAgainst: 0 });
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

    const matchHistory = userData.matches
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filePath = path.resolve('/app/data/historial_partidas.txt');
    const matchHistoryText = matchHistory.map(entry =>
      `Partida ${entry.id} | Resultado: ${entry.result} | Oponente: ${entry.opponent} | Marcador: ${entry.score} | Fecha: ${entry.date}`
    );
    fs.writeFileSync(filePath, matchHistoryText.join('\n'));

    // 🔥 Consultar avatar_url del usuario
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

fastify.get('/auth/profile/download-historial', { preHandler: verifyToken }, async (request, reply) => {
  const filePath = path.resolve('/app/data/historial_partidas.txt');

  if (!fs.existsSync(filePath)) {
    return reply.code(404).send({ message: 'Historial no disponible' });
  }

  return reply
    .header('Content-Type', 'text/plain')
    .header('Content-Disposition', 'attachment; filename="historial_partidas.txt"')
    .send(fs.createReadStream(filePath));
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

