import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import multipart from '@fastify/multipart';
import { pipeline } from 'stream';
import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { createCanvas, loadImage } from 'canvas';
import { verifyToken } from './utils/auth-middleware';
import friendsRoutes from './routes/friends.routes';
import gameDbRoutes from './routes/game-db.routes';
import { connectRedis } from './redis-client';
import redisClient from './redis-client';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getUserById, getUserProfile } from './database';

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:8000';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const fastify = Fastify({ logger: true });

fastify.register(multipart);

// Ruta para gestionar amistades
fastify.register(friendsRoutes, { prefix: '/auth/friends' });

// Ruta para guardar partidas en bbdd
fastify.register(gameDbRoutes, { prefix: '/auth/games' });

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

// Registro de rutas estáticas para descargas y avatares
fastify.register(require('@fastify/static'), {
  root: dataPath,
  prefix: '/downloads/'
});
fastify.register(require('@fastify/static'), {
  root: avatarPath,
  prefix: '/avatars/',
  decorateReply: false
});

// Endpoint para registrar un nuevo usuario
fastify.post('/auth/register', async (request, reply) => {
  const { username, email, password } = request.body as any;
  
  if (!username || !email || !password) {
    return reply.code(400).send({ message: 'Faltan campos requeridos' });
  }

  try {
    // Verificar si el usuario ya existe (vía db-service)
    const checkRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/by-email/${encodeURIComponent(email)}`);
    if (checkRes.ok) {
      return reply.code(409).send({ message: 'Usuario o email ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    // Insertar en cola de Redis
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      params: [username, email, hash]
    }));
    
    return reply.code(201).send({ message: 'Usuario registrado exitosamente' });
  } catch (err: any) {
    console.error('Error en registro:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return reply.code(409).send({ message: 'Usuario o email ya existe' });
    }
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint para iniciar sesión (login)
fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  
  if (!email || !password) {
    return reply.code(400).send({ message: 'Email y contraseña son requeridos' });
  }

  try {
    console.log(`🔍 Login attempt for email: ${email}`);
    
    // Obtener usuario por email
    const userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/by-email/${encodeURIComponent(email)}`);
    console.log(`📡 DB Service response status: ${userRes.status}`);
    
    if (!userRes.ok) {
      console.log(`❌ User not found in database for email: ${email}`);
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }
    const user = (await userRes.json()) as DbService.User;
    console.log(`👤 User found: ${user.username} (ID: ${user.id})`);

    if (!user.password_hash) {
      console.log(`❌ User ${user.username} has no password hash (probably Google login user)`);
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`🔒 Password verification result: ${passwordMatch}`);
    
    if (!passwordMatch) {
      console.log(`❌ Password mismatch for user: ${user.username}`);
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }
    
    // Obtener perfil
    const profileRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${user.id}/profile`);
    const profile = (await profileRes.json()) as DbService.UserProfile;

    if (profile?.doubleFactor !== 'false' && profile?.doubleFactor !== 0 && profile?.doubleFactor !== '0') {
      const tempToken = jwt.sign(
        { user_id: user.id, temp: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      return reply.send({
        requires_2fa: true,
        temp_token: tempToken
      });
    }

    const token = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600
    }, JWT_SECRET);

    const expiresAt = new Date(Date.now() + 3600 * 1000);
    await redisClient.set(`jwt:${token}`, user.id.toString(), { EX: 3600 });
    await redisClient.set(`user:${user.id}:online`, 'true');
    await redisClient.sAdd('online_users', user.id.toString());
    await redisClient.set(`user:${user.id}:last_seen`, Date.now().toString());

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
      params: [user.id, token, expiresAt.toISOString()]
    }));

    return reply.send({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: profile?.avatar_url || null,
        language: profile?.language || 'es'
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint para autenticación con Google
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
    
    // Verificar si el usuario ya existe
    let userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/by-email/${encodeURIComponent(payload.email)}`);
    let user = userRes.ok ? (await userRes.json()) as DbService.User : null; // ✅ 'let' en lugar de 'const'

    if (!user) {
      // Crear nuevo usuario
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        params: [payload.name, payload.email, '']
      }));
      // Esperar un momento para que se escriba
      await new Promise(resolve => setTimeout(resolve, 100));
      userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/by-email/${encodeURIComponent(payload.email)}`);
      user = (await userRes.json()) as DbService.User; // ✅ Asigna a la variable existente
    }

    // ✅ Aquí 'user' ya no puede ser 'null' por el 'if (!user)'
    // Verificar 2FA
    const profileRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${user.id}/profile`);
    const profile = (await profileRes.json()) as DbService.UserProfile;

    if (profile?.doubleFactor !== 'false' && profile?.doubleFactor !== 0 && profile?.doubleFactor !== '0') {
      const tempToken = jwt.sign(
        { user_id: user.id, temp: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      return reply.send({
        requires_2fa: true,
        temp_token: tempToken
      });
    }

    // Generar JWT normal
    const jwtToken = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600
    }, JWT_SECRET);

    const expiresAt = new Date(Date.now() + 3600 * 1000);
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
      params: [user.id, jwtToken, expiresAt.toISOString()]
    }));
    await redisClient.set(`user:${user.id}:online`, 'true');
    await redisClient.sAdd('online_users', user.id.toString());
    await redisClient.set(`user:${user.id}:last_seen`, Date.now().toString());
    await redisClient.set(`jwt:${jwtToken}`, user.id.toString(), { EX: 3600 });

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

// Endpoint para validar temp_token y código TOTP
fastify.post('/auth/verify-2fa', async (request, reply) => {
  const { temp_token, code } = request.body as any;
  if (!temp_token || !code) {
    return reply.code(400).send({ message: 'Token temporal y código requeridos' });
  }

  try {
    const decoded = jwt.verify(temp_token, JWT_SECRET) as { user_id: number; temp: boolean };
    if (!decoded.temp) {
      return reply.code(400).send({ message: 'Token temporal inválido' });
    }

    const profileRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${decoded.user_id}/profile`);
    const profile = (await profileRes.json()) as DbService.UserProfile;

    const userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${decoded.user_id}`);
    const user = (await userRes.json()) as DbService.User;
    
    if (!user.password_hash) {
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }

    if (!profile?.doubleFactorSecret || !user) {
      return reply.code(401).send({ message: '2FA no configurado o usuario inválido' });
    }

    const verified = speakeasy.totp({
      secret: profile.doubleFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return reply.code(401).send({ message: 'Código 2FA inválido' });
    }

    const token = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600
    }, JWT_SECRET);

    const expiresAt = new Date(Date.now() + 3600 * 1000);
    await redisClient.set(`jwt:${token}`, user.id.toString(), { EX: 3600 });
    await redisClient.set(`user:${user.id}:online`, 'true');
    await redisClient.sAdd('online_users', user.id.toString());
    await redisClient.set(`user:${user.id}:last_seen`, Date.now().toString());

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
      params: [user.id, token, expiresAt.toISOString()]
    }));

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: profile.avatar_url || null,
        language: profile.language || 'es'
      }
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'JsonWebTokenError') {
      return reply.code(401).send({ message: 'Token temporal inválido o expirado' });
    }
    console.error('Error en verificación 2FA:', err);
    return reply.code(500).send({ message: 'Error interno al verificar 2FA' });
  }
});

// Endpoint: GET /auth/2fa/setup
fastify.get('/auth/2fa/setup', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;

  try {
    const userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}`);
    if (!userRes.ok) {
      return reply.code(404).send({ message: 'Usuario no encontrado' });
    }
    const user = (await userRes.json()) as DbService.User;
    
    if (!user.password_hash) {
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }

    const secret = speakeasy.generateSecret({
      name: `Transcendence:${user.email}`,
      issuer: 'Transcendence',
      length: 20
    });

    await redisClient.set(`2fa:setup:${userId}`, secret.base32, { EX: 300 });

    const otpauthUrl = secret.otpauth_url;
    if (!otpauthUrl) {
      return reply.code(500).send({ message: 'Error generando URL del QR' });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return reply.send({
      qr_code: qrCodeDataUrl,
      secret: secret.base32
    });
  } catch (err) {
    console.error('Error en /auth/2fa/setup:', err);
    return reply.code(500).send({ message: 'Error generando configuración de 2FA' });
  }
});

// Endpoint: POST /auth/2fa/confirm
fastify.post('/auth/2fa/confirm', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const { code } = request.body as any;

  if (!code) {
    return reply.code(400).send({ message: 'Código requerido' });
  }

  try {
    const tempSecret = await redisClient.get(`2fa:setup:${userId}`);
    if (!tempSecret) {
      return reply.code(400).send({ message: 'Sesión expirada o no iniciada.' });
    }

    const verified = speakeasy.totp({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return reply.code(401).send({ message: 'Código inválido' });
    }

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `INSERT OR REPLACE INTO user_profiles (user_id, avatar_url, language, notifications, doubleFactor, doubleFactorSecret, difficulty)
              VALUES (?, 
                      (SELECT avatar_url FROM user_profiles WHERE user_id = ?),
                      (SELECT language FROM user_profiles WHERE user_id = ?),
                      (SELECT notifications FROM user_profiles WHERE user_id = ?),
                      1,
                      ?,
                      (SELECT difficulty FROM user_profiles WHERE user_id = ?)
              )`,
      params: [userId, userId, userId, userId, tempSecret, userId]
    }));

    await redisClient.del(`2fa:setup:${userId}`);

    return reply.send({ success: true, message: '2FA activado correctamente' });
  } catch (err) {
    console.error('Error en /auth/2fa/confirm:', err);
    return reply.code(500).send({ message: 'Error interno al activar 2FA' });
  }
});

// Endpoint: POST /auth/2fa/disable
fastify.post('/auth/2fa/disable', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const { password, code } = request.body as any;

  if (!password || !code) {
    return reply.code(400).send({ message: 'Contraseña y código requeridos' });
  }

  try {
    const userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}`);
    if (!userRes.ok) return reply.code(401).send({ message: 'Usuario no encontrado' });
    const user = (await userRes.json()) as DbService.User;

    if (!user || !user.password_hash) {
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ message: 'Contraseña inválida' });
    }

    const profileRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}/profile`);
    const profile = (await profileRes.json()) as DbService.UserProfile;

    if (!profile?.doubleFactorSecret) {
      return reply.code(400).send({ message: '2FA no está activado' });
    }

    const verified = speakeasy.totp({
      secret: profile.doubleFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return reply.code(401).send({ message: 'Código 2FA inválido' });
    }

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `UPDATE user_profiles SET doubleFactor = 0, doubleFactorSecret = NULL WHERE user_id = ?`,
      params: [userId]
    }));

    return reply.send({ success: true, message: '2FA desactivado correctamente' });
  } catch (err) {
    console.error('Error en /auth/2fa/disable:', err);
    return reply.code(500).send({ message: 'Error interno al desactivar 2FA' });
  }
});

// Endpoint para cerrar sesión
fastify.post('/auth/logout', { preHandler: verifyToken }, async (request, reply) => {
  const token = (request as any).token;
  const userId = (request as any).user.user_id;

  try {
    await redisClient.del(`jwt:${token}`);
    await redisClient.del(`user:${userId}:online`);
    await redisClient.sRem('online_users', userId.toString());
    await redisClient.del(`user:${userId}:last_seen`);

    return reply.send({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    return reply.code(500).send({ message: 'Error al cerrar sesión' });
  }
});

// Endpoint heartbeat
fastify.get('/auth/heartbeat', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  try {
    await redisClient.set(`user:${userId}:last_seen`, Date.now().toString());
    return reply.send({ status: 'active' });
  } catch (err) {
    console.error('Error en heartbeat:', err);
    return reply.code(500).send({ message: 'Error interno' });
  }
});

// Endpoint para obtener usuarios conectados
fastify.get('/auth/online-users', async (request, reply) => {
  try {
    const onlineUsers = await redisClient.sMembers('online_users');
    return reply.send(onlineUsers.map(id => parseInt(id)));
  } catch (err) {
    console.error('Error obteniendo usuarios online:', err);
    return reply.code(500).send({ message: 'Error interno' });
  }
});

// Función de limpieza periódica
async function cleanInactiveSessions() {
  try {
    const onlineUsers = await redisClient.sMembers('online_users');
    const now = Date.now();
    for (const userId of onlineUsers) {
      const lastSeen = await redisClient.get(`user:${userId}:last_seen`);
      if (now - parseInt(lastSeen || '0') > 600000) {
        await redisClient.sRem('online_users', userId);
        await redisClient.del(`user:${userId}:online`);
        await redisClient.del(`user:${userId}:last_seen`);
      }
    }
  } catch (err) {
    console.error('Error en limpieza de sesiones:', err);
  }
}
setInterval(cleanInactiveSessions, 600000);

// Endpoint para subir avatar
fastify.post('/auth/profile/avatar', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const mpRequest = request as FastifyRequest & { file: () => Promise<MultipartFile> };
  const data = await mpRequest.file();

  if (!data) return reply.code(400).send({ message: 'No se ha enviado ningún archivo' });

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
    const MAX_SIZE = 256;
    let width = image.width, height = image.height;
    if (width > height && width > MAX_SIZE) {
      height = Math.round((height * MAX_SIZE) / width);
      width = MAX_SIZE;
    } else if (height > MAX_SIZE) {
      width = Math.round((width * MAX_SIZE) / height);
      height = MAX_SIZE;
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    const processedBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });

    const filename = `avatar_${userId}.jpg`;
    const saveDir = '/app/data/avatars';
    const filepath = path.join(saveDir, filename);
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    fs.writeFileSync(filepath, processedBuffer);

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `INSERT INTO user_profiles (user_id, avatar_url) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET avatar_url = excluded.avatar_url`,
      params: [userId, `/avatars/${filename}`]
    }));

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

// Endpoint para obtener estadísticas del usuario
fastify.get('/auth/profile/stats', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  try {
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}/stats`);
    if (!res.ok) {
      reply.code(404).send({ message: 'Usuario no encontrado en el ranking' });
      return;
    }
    const userData = await res.json() as DbService.UserStats;

    const profile = await getUserProfile(userId);
    reply.send({
      ...userData,
      avatar_url: profile?.avatar_url || null
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Descarga de historial
interface MatchHistory {
  game_id: number;
  result: string;
  opponent_name: string;
  tournament_name: string;
  final_score: string;
  date: string;
}
fastify.get('/auth/profile/download-historial', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  try {
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}/match-history`);
    if (!res.ok) return reply.code(404).send({ message: 'Usuario no encontrado' });
    const matchHistory = await res.json() as MatchHistory[];

    const matchHistoryText = matchHistory.map((entry: any) =>
      `Partida ${entry.game_id} | Resultado: ${entry.result} | Oponente: ${entry.opponent_name} | Torneo: ${entry.tournament_name} | Marcador: ${entry.final_score} | Fecha: ${entry.date}`
    ).join('\n') + '\n';

    const dirPath = path.resolve('/app/data/historiales');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const fileName = `historial_${userId}.txt`;
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, matchHistoryText);

    return reply
      .type('text/plain')
      .header('Content-Disposition', `attachment; filename=${fileName}`)
      .send(fs.createReadStream(filePath));
  } catch (err) {
    console.error('Error generando o descargando historial:', err);
    return reply.code(500).send({ message: 'Error interno al generar historial' });
  }
});

// Endpoint para obtener el ranking global completo (top 100)
fastify.get('/auth/ranking', async (request, reply) => {
  try {
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/ranking`);
    if (!res.ok) return reply.code(500).send({ message: 'Error interno del servidor' });
    const rankingTop100 = await res.json();
    return reply.send(rankingTop100);
  } catch (err) {
    console.error('Error obteniendo ranking:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint de home para partidos en juego ('in_progress')
fastify.get('/auth/games/live', async (request, reply) => {
  try {
    const res = await fetch(`${process.env.DB_SERVICE_URL}/api/games/live`);
    if (!res.ok) return reply.send([]);
    const liveMatches = await res.json();
    return reply.send(liveMatches);
  } catch (err) {
    console.error('Error obteniendo partidas en vivo:', err);
    return reply.code(500).send({ error: 'Error al obtener partidas en vivo' });
  }
});

// Endpoint para cambiar datos de usuario
fastify.put('/auth/settings/user_data', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const { username, email, new_password, current_password } = request.body as any;

  const user = await getUserById(userId.toString());
  if (!user || !user.password_hash) return reply.code(404).send({ message: 'Usuario no encontrado' });

  let updatedPasswordHash = user.password_hash;
  const currentPassword = typeof current_password === 'string' ? current_password.trim() : '';
  const newPassword = typeof new_password === 'string' ? new_password.trim() : '';
  const quiereCambiarPassword = currentPassword !== '' || newPassword !== '';

  if (quiereCambiarPassword) {
    if (!currentPassword) return reply.code(400).send({ message: 'Falta contraseña actual' });
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) return reply.code(401).send({ message: 'Contraseña actual incorrecta' });
    if (!newPassword) return reply.code(400).send({ message: 'Nueva contraseña inválida' });
    updatedPasswordHash = await bcrypt.hash(newPassword, 10);
  }

  await redisClient.rPush('sqlite_write_queue', JSON.stringify({
    sql: 'UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?',
    params: [username ?? user.username, email ?? user.email, updatedPasswordHash, userId]
  }));

  return reply.send({ message: 'Perfil actualizado correctamente' });
});

// Endpoint para obtener datos de usuario (username y email)
fastify.get('/auth/settings/user_data', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const user = await getUserById(userId.toString());
  if (!user) {
    reply.code(404).send({ message: 'Usuario no encontrado' });
    return;
  }
  reply.send({ username: user.username, email: user.email });
});

// Endpoint para cambiar configuración juego
fastify.put('/auth/settings/config', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const { language, notifications, doubleFactor, game_difficulty } = request.body as any;

  await redisClient.rPush('sqlite_write_queue', JSON.stringify({
    sql: `INSERT INTO user_profiles (user_id, language, notifications, doubleFactor, difficulty) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET language = excluded.language, notifications = excluded.notifications, doubleFactor = excluded.doubleFactor, difficulty = excluded.difficulty`,
    params: [userId, language, notifications, doubleFactor, game_difficulty]
  }));

  return reply.send({ message: 'Configuración guardada correctamente' });
});

// Obtener configuraciones del juego
fastify.get('/auth/settings/config', { preHandler: verifyToken }, async (request, reply) => {
  const userId = (request as any).user.user_id;
  const profile = await getUserProfile(userId.toString());
  if (!profile) {
    reply.code(404).send({ message: 'Configuración no encontrada' });
    return;
  }
  reply.send({
    language: profile.language,
    notifications: profile.notifications,
    doubleFactor: profile.doubleFactor,
    game_difficulty: profile.difficulty
  });
});

// Inicializar Redis (no inicializar base de datos)
Promise.all([connectRedis()])
  .then(() => {
    fastify.listen({ port: 8000, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
      console.log(`Servidor escuchando en ${address}`);
    });
  })
  .catch((err) => {
    console.error('Error al inicializar servicios:', err);
    process.exit(1);
  });

// Cerrar conexiones
process.on('SIGINT', async () => {
  await redisClient.quit();
  fastify.close();
  process.exit();
});