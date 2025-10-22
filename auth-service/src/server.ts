import process from 'process';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { openDb } from './database';
import multipart from '@fastify/multipart';
import { pipeline } from 'stream';
import util from 'util';
import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { createCanvas, loadImage } from 'canvas';
import { verifyToken } from './utils/auth-middleware';
import friendsRoutes from './routes/friends.routes';
import gameDbRoutes from './routes/game-db.routes';
import { promisify } from 'util';
import { connectRedis } from './redis-client'
import redisClient from './redis-client';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { isNotificationEnabled } from './utils/user-settings.util';
import { sendGameResultEmail } from './utils/email-notifier';

dotenv.config();
// Recarga de variables de entorno en caliente al recibir SIGHUP
process.on('SIGHUP', () => {
  dotenv.config();
  fastify.log.info('Variables de entorno recargadas tras SIGHUP');
});
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
  decorateReply: false // evita conflicto
});

// --- Función: generateRankingWithStats ---
export async function generateRankingWithStats(db: any) {
  const userGames = await db.all(`
    SELECT 
        u.id AS user_id,
        u.username,
        GROUP_CONCAT(DISTINCT p1.game_id) AS game_ids_str
    FROM 
        users u
    JOIN participants p1 ON u.id = p1.user_id
    JOIN games g ON g.id = p1.game_id
    WHERE 
        g.status = 'finished'
        AND EXISTS (
            SELECT 1
            FROM participants p2
            WHERE 
                p2.game_id = p1.game_id
                AND (
                    p2.user_id IS NULL
                    OR TRIM(p2.user_id) = ''
                    OR p2.user_id != p1.user_id
                )
        )
    GROUP BY u.id, u.username
    ORDER BY u.id;
  `);

  const userGameDetails: any[] = [];

  for (const user of userGames) {
    const gameIdList = user.game_ids_str
      ? user.game_ids_str.split(',').map((id: string) => parseInt(id.trim()))
      : [];

    const gamesDetails: any[] = [];
    let totalGames = 0;
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let eloWins = 0;
    let eloLosses = 0;

    for (const gameId of gameIdList) {
      const gameDetail = await db.get(`
        SELECT 
            g.id AS game_id,
            g.finished_at AS game_date,
            t.name AS tournament_name,
            p1.user_id AS user_id,
            u1.username AS user_username,
            p1.team_name AS user_team,
            p1.is_winner AS user_won,
            p2.user_id AS opponent_id,
            u2.username AS opponent_username,
            p2.team_name AS opponent_team,
            p2.is_winner AS opponent_won,
            COALESCE((
              SELECT s1.point_number
              FROM scores s1
              WHERE s1.game_id = g.id AND (s1.scorer_id = p1.user_id OR s1.team_name = p1.team_name)
              LIMIT 1
            ), 0) AS user_score,
            COALESCE((
              SELECT s2.point_number
              FROM scores s2
              WHERE s2.game_id = g.id AND (s2.scorer_id = p2.user_id OR s2.team_name = p2.team_name)
              LIMIT 1
            ), 0) AS opponent_score
        FROM games g
        LEFT JOIN tournaments t ON g.tournament_id = t.id
        JOIN participants p1 ON g.id = p1.game_id
        JOIN users u1 ON p1.user_id = u1.id
        JOIN participants p2 ON g.id = p2.game_id
          AND (
            (p2.user_id IS NULL OR TRIM(p2.user_id) = '') 
            OR p2.user_id != p1.user_id
          )
        LEFT JOIN users u2 ON p2.user_id = u2.id
        WHERE 
            g.id = ?
            AND p1.user_id = ?
        GROUP BY g.id, t.name, u1.username, u2.username, p1.is_winner, p2.is_winner;
      `, [gameId, user.user_id]);

      if (!gameDetail) continue;

      const { user_score, opponent_score, opponent_id } = gameDetail;
      const won = user_score > opponent_score;

      totalGames++;
      if (won) wins++;
      else losses++;

      if (opponent_id !== null && String(opponent_id).trim() !== '') {
        pointsFor += user_score;
        pointsAgainst += opponent_score;
        if (won) eloWins++;
        else eloLosses++;
      }

      gamesDetails.push({
        game_id: gameDetail.game_id,
        date: gameDetail.game_date,
        tournament_name: gameDetail.tournament_name || '-',
        result: won ? 'win' : 'loss',
        opponent_id: opponent_id,
        opponent_name: gameDetail.opponent_username || (opponent_id === null ? 'AI Bot' : 'Unknown'),
        final_score: `${user_score}-${opponent_score}`
      });
    }

    const winRate = totalGames > 0 ? parseFloat(((wins / totalGames) * 100).toFixed(2)) : 0;
    const elo = 1000 + (pointsFor - pointsAgainst) + (3 * eloWins) - eloLosses;

    userGameDetails.push({
      user_id: user.user_id,
      username: user.username,
      stats: {
        total_games: totalGames,
        wins,
        losses,
        win_rate: winRate,
        points_for: pointsFor,
        points_against: pointsAgainst,
        elo: Math.round(elo)
      },
      games: gamesDetails
    });
  }

  return userGameDetails;
}

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Endpoint para registrar un nuevo usuario
fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
  const { username, email, password } = request.body as any;
  
  if (!username || !email || !password) {
    return reply.code(400).send({ message: 'Faltan campos requeridos' });
  }

  // Validate username length
  if (username.trim().length < 3 || username.trim().length > 20) {
    return reply.code(400).send({ message: 'El nombre de usuario debe tener entre 3 y 20 caracteres' });
  }

  // Validate email format
  if (!isValidEmail(email.trim())) {
    return reply.code(400).send({ message: 'Formato de correo electrónico inválido' });
  }

  // Validate password length
  if (password.length < 6) {
    return reply.code(400).send({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const db = await openDb();
    
    // Verificar si el usuario ya existe
    const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email.trim(), username.trim()]);
    if (existingUser) {
      await db.close();
      return reply.code(409).send({ message: 'Usuario o email ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    // Insertar directamente en la base de datos
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      params: [username.trim(), email.trim(), hash]
    }));
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `INSERT INTO user_profiles (user_id, avatar_url, language, notifications, doubleFactor, doubleFactorSecret, difficulty) 
            VALUES ((SELECT id FROM users WHERE username = ? AND email = ?), ?, ?, ?, ?, ?, ?)`,
      params: [username.trim(), email.trim(), '', 'gl', 'true', 0, null, 'normal']
    }));
    
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

// Endpoint para iniciar sesión (login) y generar token JWT
fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
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
    
    // Verificar si tiene 2FA activado
    const profile = await db.get(
      'SELECT doubleFactor, doubleFactorSecret FROM user_profiles WHERE user_id = ?', 
      [user.id]
    );

    if (profile?.doubleFactor !== 'false' && profile?.doubleFactor !== 0 && profile?.doubleFactor !== '0') {
      // 2FA está activado: generar token temporal (sin acceso total)
      const tempToken = jwt.sign(
        { user_id: user.id, temp: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      await db.close();
      return reply.send({
        requires_2fa: true,
        temp_token: tempToken
      });
    }

    const token = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
    }, JWT_SECRET);

    // Registrar sesión en DB y Redis
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hora// Guardar en Redis: clave = jwt:<token>, valor = user_id
    await redisClient.set(`jwt:${token}`, user.id.toString(), { EX: 3600 }); // 3600s = 1h
    await redisClient.set(`user:${user.id}:online`, 'true');
    await redisClient.sAdd('online_users', user.id.toString());
    await redisClient.set(`user:${user.id}:last_seen`, Date.now().toString());

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `
        INSERT INTO sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
      `,
      params: [user.id, token, expiresAt.toISOString()]
    }));

    // Obtener avatar_url e idioma
    const userProfile = await db.get('SELECT avatar_url, language FROM user_profiles WHERE user_id = ?', [user.id]);

    await db.close();

    return reply.send({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: userProfile?.avatar_url || null,
        language: userProfile?.language || 'es'
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint para autenticación con Google (verifica token, crea usuario si no existe, devuelve JWT)
type GooglePayload = {
  email: string;
  name: string;
  picture?: string;
  [key: string]: any;
};
fastify.post('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
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
      const result = await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        params: [payload.name, payload.email, ''] // Sin contraseña para usuarios de Google
    }));
      
      user = await db.get('SELECT * FROM users WHERE email = ?', [payload.email]);
    }

    // Verificar si el usuario tiene 2FA activado
    const userProfile = await db.get(
      'SELECT doubleFactor FROM user_profiles WHERE user_id = ?',
      [user.id]
    );

    if (userProfile?.doubleFactor !== 'false' && userProfile?.doubleFactor !== 0 && userProfile?.doubleFactor !== '0') {
      // 2FA está activado: devolver temp_token
      const tempToken = jwt.sign(
        { user_id: user.id, temp: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      await db.close();
      return reply.send({
        requires_2fa: true,
        temp_token: tempToken
      });
    }

    // 2FA no está activado: proceder con JWT normal
    const jwtToken = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
    }, JWT_SECRET);

    // Registrar sesión en DB y Redis
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hora
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `INSERT INTO sessions (user_id, session_token, expires_at) 
      VALUES (?, ?, ?)`,
      params: [user.id, jwtToken, expiresAt.toISOString()]
    }));
    await redisClient.set(`user:${user.id}:online`, 'true');
    await redisClient.sAdd('online_users', user.id.toString());
    await redisClient.set(`user:${user.id}:last_seen`, Date.now().toString());
    await redisClient.set(`jwt:${jwtToken}`, user.id.toString(), { EX: 3600 });

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

// Endpoint para validar temp_token y código TOTP
fastify.post('/auth/verify-2fa', async (request: FastifyRequest, reply: FastifyReply) => {
  const { temp_token, code } = request.body as any;
  if (!temp_token || !code) {
    return reply.code(400).send({ message: 'Token temporal y código requeridos' });
  }

  try {
    const decoded = jwt.verify(temp_token, JWT_SECRET) as { user_id: number; temp: boolean };
    if (!decoded.temp) {
      return reply.code(400).send({ message: 'Token temporal inválido' });
    }

    const db = await openDb();
    const profile = await db.get(
      'SELECT doubleFactorSecret, language FROM user_profiles WHERE user_id = ?',
      [decoded.user_id]
    );
    const user = await db.get(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.user_id]
    );

    if (!profile?.doubleFactorSecret || !user) {
      await db.close();
      return reply.code(401).send({ message: '2FA no configurado o usuario inválido' });
    }

    // Verificar código TOTP
    const verified = speakeasy.totp({
      secret: profile.doubleFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      await db.close();
      return reply.code(401).send({ message: 'Código 2FA inválido' });
    }

    // Obtener avatar_url antes de cerrar la DB
    const profileData = await db.get(
      'SELECT avatar_url FROM user_profiles WHERE user_id = ?',
      [user.id]
    );

    await db.close(); // ✅ Cerrar aquí, después de todas las consultas

    // Generar JWT real
    const token = jwt.sign({
      user_id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora
    }, JWT_SECRET);

    const expiresAt = new Date(Date.now() + 3600 * 1000);

    // Registrar en Redis
    await redisClient.set(`jwt:${token}`, user.id.toString(), { EX: 3600 });
    await redisClient.set(`user:${user.id}:online`, 'true');
    await redisClient.sAdd('online_users', user.id.toString());
    await redisClient.set(`user:${user.id}:last_seen`, Date.now().toString());

    // Guardar sesión en cola
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
        avatar_url: profileData?.avatar_url || null,
        language: profile?.language || 'es'
      }
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'JsonWebTokenError') {
        return reply.code(401).send({ message: 'Token temporal inválido o expirado' });
      }
    }
    console.error('Error en verificación 2FA:', err instanceof Error ? err.message : 'Unknown error');
    return reply.code(500).send({ message: 'Error interno al verificar 2FA' });
  }
});

// Endpoint: GET /auth/2fa/setup -> Devuelve un QR y un secreto temporal para configurar 2FA
fastify.get('/auth/2fa/setup', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request as any).user.user_id;

  try {
    const db = await openDb();
    const user = await db.get('SELECT email FROM users WHERE id = ?', [userId]);
    await db.close();

    if (!user) {
      return reply.code(404).send({ message: 'Usuario no encontrado' });
    }

    // Generar secreto con el email
    const secret = speakeasy.generateSecret({
      name: `Tanscendence:${user.email}`,
      issuer: 'Transcendence',
      length: 20
    });

    // Guardar secreto temporal en Redis (5 minutos)
    await redisClient.set(`2fa:setup:${userId}`, secret.base32, { EX: 300 });

    // Generar URL del QR
    const otpauthUrl = secret.otpauth_url;
    if (!otpauthUrl) {
      return reply.code(500).send({ message: 'Error generando URL del QR' });
    }

    // Generar imagen del QR
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return reply.send({
      qr_code: qrCodeDataUrl,
      secret: secret.base32 // Solo para debugging o backup (no se usa en confirm)
        });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error en /auth/2fa/setup:', message);
    return reply.code(500).send({ message: 'Error generando configuración de 2FA' });
  }
});

// Endpoint: POST /auth/2fa/confirm -> Confirma el código del autenticador y activa 2FA
fastify.post('/auth/2fa/confirm', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request as any).user.user_id;
  const { code } = request.body as any;

  if (!code) {
    return reply.code(400).send({ message: 'Código requerido' });
  }

  try {
    // Obtener secreto temporal de Redis
    const tempSecret = await redisClient.get(`2fa:setup:${userId}`);
    if (!tempSecret) {
      return reply.code(400).send({ message: 'Sesión expirada o no iniciada. Vuelve a intentarlo.' });
    }

    // Verificar código TOTP
    const verified = speakeasy.totp({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return reply.code(401).send({ message: 'Código inválido' });
    }

    // Activar 2FA en la base de datos
    const db = await openDb();
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
    await db.close();

    // Limpiar secreto temporal
    await redisClient.del(`2fa:setup:${userId}`);

    return reply.send({ success: true, message: '2FA activado correctamente' });
  } catch (err) {
    console.error('Error en /auth/2fa/confirm:', err);
    return reply.code(500).send({ message: 'Error interno al activar 2FA' });
  }
});

// Endpoint: POST /auth/2fa/disable -> Desactiva 2FA tras verificar contraseña y código
fastify.post('/auth/2fa/disable', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request as any).user.user_id;
  const { password, code } = request.body as any;

  if (!password || !code) {
    return reply.code(400).send({ message: 'Contraseña y código requeridos' });
  }

  try {
    const db = await openDb();

    // Verificar contraseña
    const user = await db.get('SELECT password_hash, email FROM users WHERE id = ?', [userId]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await db.close();
      return reply.code(401).send({ message: 'Contraseña inválida' });
    }

    // Verificar código TOTP
    const profile = await db.get('SELECT doubleFactorSecret FROM user_profiles WHERE user_id = ?', [userId]);


    if (!profile?.doubleFactorSecret) {
      await db.close();
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

    // Desactivar 2FA
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `UPDATE user_profiles SET doubleFactor = 0, doubleFactorSecret = NULL WHERE user_id = ?`,
      params: [userId]
  }));
    await db.close();

    return reply.send({ success: true, message: '2FA desactivado correctamente' });
  } catch (err) {
    console.error('Error en /auth/2fa/disable:', err);
    return reply.code(500).send({ message: 'Error interno al desactivar 2FA' });
  }
});

// Endpoint para cerrar sesión
fastify.post('/auth/logout', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  const token = (request as any).token;
  const userId = (request as any).user.user_id;

  try {
    const db = await openDb();
    
    // Eliminar de Redis
    await redisClient.del(`jwt:${token}`); // ✅ Eliminar el token JWT
    await redisClient.del(`user:${userId}:online`);
    await redisClient.sRem('online_users', userId.toString());
    await redisClient.del(`user:${userId}:last_seen`);
    
    return reply.send({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    return reply.code(500).send({ message: 'Error al cerrar sesión' });
  }
});

// Endpoint para verificar token (usado por otros servicios)
fastify.post('/api/verify-token', async (request, reply) => {
  const authHeader = request.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ message: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      user_id: number;
      username: string;
      email: string;
    };

    const sessionId = `jwt:${token}`;
    const isValid = await redisClient.get(sessionId);
    if (!isValid) {
      return reply.code(401).send({ message: 'Sesión cerrada o inválida' });
    }

    return reply.send({
      user_id: decoded.user_id,
      username: decoded.username,
      email: decoded.email
    });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send({ message: 'Token expirado' });
    } else {
      return reply.code(403).send({ message: 'Token inválido' });
    }
  }
});

// Endpoint heartbeat para mantener sesión activa
fastify.get('/auth/heartbeat', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request as any).user.user_id;
  
  try {
    // Actualizar timestamp de última actividad
    await redisClient.set(`user:${userId}:last_seen`, Date.now().toString());
    return reply.send({ status: 'active' });
  } catch (err) {
    console.error('Error en heartbeat:', err);
    return reply.code(500).send({ message: 'Error interno' });
  }
});

// Endpoint para obtener usuarios conectados
fastify.get('/auth/online-users', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const onlineUsers = await redisClient.sMembers('online_users');
  return reply.send(onlineUsers.map((id: string) => parseInt(id)));
  } catch (err) {
    console.error('Error obteniendo usuarios online:', err);
    return reply.code(500).send({ message: 'Error interno' });
  }
});

// Función de limpieza periódica de usuarios online
async function cleanInactiveSessions() {
  try {
    const onlineUsers = await redisClient.sMembers('online_users');
    const now = Date.now();
    const INACTIVITY_LIMIT = process.env.INACTIVITY_LIMIT_MS ? parseInt(process.env.INACTIVITY_LIMIT_MS) : 600000; // 10 min por defecto
    for (const userId of onlineUsers) {
      const lastSeen = await redisClient.get(`user:${userId}:last_seen`);
      const inactiveTime = now - parseInt(lastSeen || '0');
      if (inactiveTime > INACTIVITY_LIMIT) {
        // Buscar y eliminar todos los JWT asociados a este userId
        const jwtKeys = await redisClient.keys('jwt:*');
        for (const key of jwtKeys) {
          const value = await redisClient.get(key);
          if (value === userId.toString()) {
            await redisClient.del(key);
          }
        }
        await redisClient.sRem('online_users', userId);
        await redisClient.del(`user:${userId}:online`);
        await redisClient.del(`user:${userId}:last_seen`);
        console.log(`[LIMPIEZA] Usuario inactivo eliminado: ${userId}`);
      }
    }
  } catch (err) {
    console.error('Error en limpieza de sesiones:', err);
  }
}

// Iniciar limpieza periódica cada 10 minutos
setInterval(cleanInactiveSessions, 600000);

// Endpoint para subir y optimizar el avatar
fastify.post('/auth/profile/avatar', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
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
    console.log('Buffer size:', buffer.length);
    console.log('Image loaded:', image.width, image.height);

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
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, width, height);
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
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `
      INSERT INTO user_profiles (user_id, avatar_url)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET avatar_url = excluded.avatar_url
      `,
      params: [userId, `/avatars/${filename}`]
    }));

    await db.close();

    return reply.send({ 
      message: '✅ Avatar optimizado y subido correctamente', 
      avatar_url: `/avatars/${filename}`,
      dimensions: { width, height },
      size: `${(processedBuffer.length / 1024).toFixed(2)} KB`
    });

  } catch (err) {
    console.error('Error procesando avatar:', err);
    return reply.code(500).send({ message: 'Error procesando avatar' });
  }
});
 
// Endpoint para obtener estadísticas del usuario
fastify.get('/auth/profile/stats', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  let db;
  try {
    db = await openDb();
    const userId = (request as any).user.user_id; 

    const rankingData = await generateRankingWithStats(db);
    const userData = rankingData.find((u: any) => u.user_id === userId);

    if (!userData) {
      await db.close();
      return reply.code(404).send({ message: 'Usuario no encontrado en el ranking' });
    }

    const totalGames = userData.stats.total_games;
    const wins = userData.stats.wins;
    const losses = userData.stats.losses;
    const winRate = userData.stats.win_rate;
    const elo = userData.stats.elo;
    const matchHistory = userData.games.map((game: any) => ({
      id: game.game_id,
      result: game.result,
      opponent: game.opponent_name,
      score: game.final_score,
      date: game.date
    }));

    const sortedRanking = [...rankingData].sort((a: any, b: any) => b.stats.elo - a.stats.elo);
    const ranking = sortedRanking.findIndex((u: any) => u.user_id === userId) + 1;

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
      matchHistory: matchHistory.slice(-10).reverse(),
      avatar_url: profile?.avatar_url || null
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Descarga de historial
fastify.get('/auth/profile/download-historial', { preHandler: verifyToken }, async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request as any).user.user_id;

  try {
    const db = await openDb();
    const rankingData = await generateRankingWithStats(db);
    const userData = rankingData.find((u: any) => u.user_id === userId);
    await db.close();

    if (!userData) {
      return reply.code(404).send({ message: 'Usuario no encontrado en el ranking' });
    }

    const matchHistory = userData.games;

    const matchHistoryText = matchHistory.map((entry: {
      game_id: number;
      result: string;
      opponent_name: string;
      tournament_name: string;
      final_score: string;
      date: string;
    }) =>
      `Partida ${entry.game_id} | Resultado: ${entry.result} | Oponente: ${entry.opponent_name} | Torneo: ${entry.tournament_name} | Marcador: ${entry.final_score} | Fecha: ${entry.date}`
    );

    // Crear carpeta /app/data/historiales si no existe
    const dirPath = path.resolve('/app/data/historiales');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Escribir archivo personalizado
    const fileName = `historial_${userId}.txt`;
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, matchHistoryText.join('\n') + '\n');

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
fastify.get('/auth/ranking', async (request: FastifyRequest, reply: FastifyReply) => {
  let db: any;
  try {
    db = await openDb();

    const allUsers = await generateRankingWithStats(db);

    const rankingRaw = allUsers
      .map(user => ({
        id: user.user_id,
        username: user.username,
        wins: user.stats.wins,
        losses: user.stats.losses,
        totalGames: user.stats.total_games,
        winRate: user.stats.win_rate,
        elo: user.stats.elo
      }))
      .sort((a, b) => b.elo - a.elo);

    const rankingTop100 = rankingRaw.slice(0, 100).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      points: entry.elo
    }));

    await db.close();
    return reply.send(rankingTop100);
  } catch (err) {
    console.error('Error obteniendo ranking:', err);
    if (db) await db.close().catch(console.error);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  }
});

// Endpoint de home para partidos en juego ('in_progress')
fastify.get('/auth/games/live', async (request: FastifyRequest, reply: FastifyReply) => {
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
  WHERE p.game_id IN (${games.map((g: { game_id: number }) => g.game_id).join(',')})
    `);

    // Obtener puntuaciones por game_id + team
    const scores = await db.all(`
      SELECT game_id, team_name, MAX(point_number) AS score
      FROM scores
  WHERE game_id IN (${games.map((g: { game_id: number }) => g.game_id).join(',')})
      GROUP BY game_id, team_name
    `);

    // Mapear resultados por partida
    const liveMatches = games.map((game: any) => {
      const gameParticipants = participants.filter((p: any) => p.game_id === game.game_id);
      const scoreMap = new Map();
      scores
        .filter((s: any) => s.game_id === game.game_id)
        .forEach((s: any) => scoreMap.set(s.team_name, s.score));
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

// Endpoint para cambiar datos de usuario
fastify.put('/auth/settings/user_data', { preHandler: verifyToken }, async (request, reply) => {
  const db = await openDb();

  try {
    const userId = (request as any).user.user_id;
    const {
      username,
      email,
      new_password,
      current_password
    } = request.body as any;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return reply.code(404).send({ message: 'Usuario no encontrado' });
    }

    const currentPassword = typeof current_password === 'string' ? current_password.trim() : '';
    const newPassword = typeof new_password === 'string' ? new_password.trim() : '';
    const quiereCambiarPassword = currentPassword !== '' || newPassword !== '';

    let updatedPasswordHash = user.password_hash;

    // Validaciones de cambio de contraseña
    if (quiereCambiarPassword) {
      if (!currentPassword) {
        return reply.code(400).send({ message: 'Falta contraseña actual' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return reply.code(401).send({ message: 'Contraseña actual incorrecta' });
      }

      if (!newPassword) {
        return reply.code(400).send({ message: 'Nueva contraseña inválida' });
      }

      updatedPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar email, username y contraseña si es válida
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 
      `UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`,
      params: [
        username ?? user.username,
        email ?? user.email,
        updatedPasswordHash,
        userId
      ]
  }));

    return reply.send({ message: 'Perfil actualizado correctamente' });

  } catch (err) {
    console.error('Error actualizando perfil:', err);
    return reply.code(500).send({ message: 'Error actualizando perfil' });
  } finally {
    await db.close();
  }
});

// Endpoint para obtener datos de usuario (username y email)
fastify.get('/auth/settings/user_data', { preHandler: verifyToken }, async (request, reply) => {
  try {
    const db = await openDb();
    const userId = (request as any).user.user_id;

    const user = await db.get(
      `SELECT username, email FROM users WHERE id = ?`,
      [userId]
    );

    await db.close();

    if (!user) {
      return reply.code(404).send({ message: 'Usuario no encontrado' });
    }

    return reply.send(user);
  } catch (err) {
    console.error('Error al obtener datos de usuario:', err);
    return reply.code(500).send({ message: 'Error al obtener datos de usuario' });
  }
});

// Endpoint para cambiar configuración juego
fastify.put('/auth/settings/config', { preHandler: verifyToken }, async (request, reply) => {
  try {
    const db = await openDb();
    const userId = (request as any).user.user_id;
    const {
      language,
      notifications,
      doubleFactor,
      game_difficulty
    } = request.body as any;

    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: `
        INSERT INTO user_profiles (user_id, language, notifications, doubleFactor, difficulty)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          language = excluded.language,
          notifications = excluded.notifications,
          doubleFactor = excluded.doubleFactor,
          difficulty = excluded.difficulty
      `,
      params: [userId, language, notifications, doubleFactor, game_difficulty]
    }));

    await db.close();
    return reply.send({ message: 'Configuración guardada correctamente' });
  } catch (err) {
    console.error('Error guardando configuración:', err);
    return reply.code(500).send({ message: 'Error guardando configuración' });
  }
});

// Obtener configuraciones del juego
fastify.get('/auth/settings/config', { preHandler: verifyToken }, async (request, reply) => {
  try {
    const db = await openDb();
    const userId = (request as any).user.user_id;
    const config = await db.get(
      `SELECT 
        language, 
        notifications, 
        doubleFactor, 
        difficulty AS game_difficulty
      FROM user_profiles 
      WHERE user_id = ?`,
      [userId]
    );
    await db.close();

    if (!config) {
      return reply.code(404).send({ message: 'Configuración no encontrada' });
    }

    return reply.send(config);
  } catch (err) {
    console.error('Error al obtener configuración:', err);
    return reply.code(500).send({ message: 'Error al obtener configuración' });
  }
});

// Endpoint para crear partida online (llamado desde game-service)
fastify.post('/api/games/create-online', async (request, reply) => {
  const { player1_id, player2_id, winner_player, score1, score2, start_time, end_time, gameId } = request.body as any;
  
  fastify.log.info(request.body, 'Body recibido en create-online');

  if (!player1_id || !player2_id || winner_player === undefined || score1 === undefined || score2 === undefined) {
    return reply.code(400).send({ message: 'Missing required fields' });
  }

  try {
    const db = await openDb();

    // Si se pasa gameId (id interno o external_game_id) intentar localizar partida existente
    let existingGame: any = null;
    if (gameId) {
      existingGame = await db.get('SELECT id FROM games WHERE id = ? OR external_game_id = ? LIMIT 1', [gameId, gameId]);
    }

    if (existingGame && existingGame.id) {
      const targetGameId = existingGame.id;

      // Actualizar el registro existente (encolado)
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'UPDATE games SET status = ?, started_at = COALESCE(started_at, ?), finished_at = ? WHERE id = ?',
        params: ['finished', start_time, end_time, targetGameId]
      }));

      // Actualizar participants (is_winner)
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `UPDATE participants
              SET is_winner = ?
              WHERE game_id = ? AND team_name = 'Team A'`,
        params: [winner_player === 1 ? 1 : 0, targetGameId]
      }));
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `UPDATE participants
              SET is_winner = ?
              WHERE game_id = ? AND team_name = 'Team B'`,
        params: [winner_player === 2 ? 1 : 0, targetGameId]
      }));

      // Insert participants only if missing
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO participants (game_id, user_id, is_winner, team_name)
              SELECT ?, ?, ?, 'Team A'
              WHERE NOT EXISTS (SELECT 1 FROM participants WHERE game_id = ? AND team_name = 'Team A')`,
        params: [targetGameId, player1_id, winner_player === 1 ? 1 : 0, targetGameId]
      }));
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO participants (game_id, user_id, is_winner, team_name)
              SELECT ?, ?, ?, 'Team B'
              WHERE NOT EXISTS (SELECT 1 FROM participants WHERE game_id = ? AND team_name = 'Team B')`,
        params: [targetGameId, player2_id, winner_player === 2 ? 1 : 0, targetGameId]
      }));

      // === SCORES: actualizar scorer_id y point_number usando participants.user_id (si existe) ===
      fastify.log.info({ score1, score2, player1_id, player2_id, winner_player }, 'Datos recibidos para scores');
      // Update Team A score row if exists (set scorer_id from participants)
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `UPDATE scores
              SET scorer_id = (SELECT user_id FROM participants WHERE game_id = ? AND team_name = 'Team A' LIMIT 1),
                  point_number = ?
              WHERE game_id = ? AND team_name = 'Team A'`,
        params: [targetGameId, score1, targetGameId]
      }));

      // Update Team B score row if exists
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `UPDATE scores
              SET scorer_id = (SELECT user_id FROM participants WHERE game_id = ? AND team_name = 'Team B' LIMIT 1),
                  point_number = ?
              WHERE game_id = ? AND team_name = 'Team B'`,
        params: [targetGameId, score2, targetGameId]
      }));

      // If no score rows existed, insert them using the participants.user_id if available
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp)
              SELECT ?, (SELECT user_id FROM participants WHERE game_id = ? AND team_name = 'Team A' LIMIT 1), 'Team A', ?, CURRENT_TIMESTAMP
              WHERE NOT EXISTS (SELECT 1 FROM scores WHERE game_id = ? AND team_name = 'Team A')`,
        params: [targetGameId, targetGameId, score1, targetGameId]
      }));
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp)
              SELECT ?, (SELECT user_id FROM participants WHERE game_id = ? AND team_name = 'Team B' LIMIT 1), 'Team B', ?, CURRENT_TIMESTAMP
              WHERE NOT EXISTS (SELECT 1 FROM scores WHERE game_id = ? AND team_name = 'Team B')`,
        params: [targetGameId, targetGameId, score2, targetGameId]
      }));

      await db.close();
      fastify.log.info(`Online game (existing) updated for game_id=${targetGameId} players ${player1_id} vs ${player2_id}`);
      return reply.send({ message: 'Online game updated successfully', game_id: targetGameId });
    } 
    else {
      // Insertar nueva fila en games guardando external_game_id si se pasó
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO games (status, started_at, finished_at, external_game_id) VALUES (?, ?, ?, ?)',
        params: ['finished', start_time, end_time, gameId || null]
      }));

      // Insertar participants y scores vinculándolos al INSERT previo usando started_at (legacy)
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO participants (game_id, user_id, is_winner, team_name) 
              VALUES ((SELECT id FROM games WHERE started_at = ? AND status = 'finished' LIMIT 1), ?, ?, 'Team A')`,
        params: [start_time, player1_id, winner_player === 1 ? 1 : 0]
      }));

      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO participants (game_id, user_id, is_winner, team_name) 
              VALUES ((SELECT id FROM games WHERE started_at = ? AND status = 'finished' LIMIT 1), ?, ?, 'Team B')`,
        params: [start_time, player2_id, winner_player === 2 ? 1 : 0]
      }));

      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp) 
              VALUES ((SELECT id FROM games WHERE started_at = ? AND status = 'finished' LIMIT 1), ?, 'Team A', ?, CURRENT_TIMESTAMP)`,
        params: [start_time, player1_id, score1]
      }));

      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO scores (game_id, scorer_id, team_name, point_number, timestamp) 
              VALUES ((SELECT id FROM games WHERE started_at = ? AND status = 'finished' LIMIT 1), ?, 'Team B', ?, CURRENT_TIMESTAMP)`,
        params: [start_time, player2_id, score2]
      }));

      await db.close();
      fastify.log.info(`Online game created (legacy) for players ${player1_id} vs ${player2_id}`);
      return reply.send({ message: 'Online game saved successfully' });
    }
  } catch (error: any) {
    fastify.log.error('Error creating online game:', error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
});

// Endpoint para obtener user_id por username (usado por game-service)
fastify.get('/api/games/user-id', async (request, reply) => {
  const { username } = request.query as any;
  
  if (!username) {
    return reply.code(400).send({ message: 'Username is required' });
  }

  try {
    const db = await openDb();
    const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    await db.close();

    if (!user) {
      return reply.code(404).send({ message: 'User not found' });
    }

    return reply.send({ userId: user.id });
  } catch (error: any) {
    fastify.log.error('Error getting user ID:', error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
});

// Función auxiliar para enviar notificaciones de finalización de juego
async function sendGameFinishNotifications(db: any, gameId: string, winnerTeam: string, gameRow: any) {
  try {
    // Obtener participantes, scores y datos del juego
    const participants = await db.all(`
      SELECT 
        p.user_id,
        p.team_name,
        p.is_bot,
        u.username,
        u.email,
        up.notifications
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE p.game_id = (SELECT id FROM games WHERE id = ? OR external_game_id = ? LIMIT 1)
      ORDER BY p.id ASC
    `, [gameId, gameId]);

    if (!participants || participants.length < 2) {
      console.log('⚠️  No hay suficientes participantes para enviar notificaciones');
      return;
    }

    const player1 = participants[0];
    const player2 = participants[1];

    // Verificar si es partida local (ambos jugadores tienen el mismo user_id)
    if (player1.user_id && player2.user_id && player1.user_id === player2.user_id) {
      console.log('ℹ️  Partida local detectada (mismo user_id). No se envían correos.');
      return;
    }

    // Verificar si hay bots (no enviar a bots)
    const humanPlayers = participants.filter((p: any) => !p.is_bot && p.user_id);
    if (humanPlayers.length === 0) {
      console.log('ℹ️  Partida bot vs bot. No se envían correos.');
      return;
    }

    // Obtener scores
    const scores = await db.all(`
      SELECT team_name, point_number
      FROM scores
      WHERE game_id = (SELECT id FROM games WHERE id = ? OR external_game_id = ? LIMIT 1)
    `, [gameId, gameId]);

    const score1 = scores.find((s: any) => s.team_name === player1.team_name)?.point_number || 0;
    const score2 = scores.find((s: any) => s.team_name === player2.team_name)?.point_number || 0;
    const scoreText = `${score1}-${score2}`;

    // Determinar si es torneo
    const isTournament = gameRow && gameRow.tournament_id;
    let tournamentName = null;
    if (isTournament) {
      const tournament = await db.get('SELECT name FROM tournaments WHERE id = ?', [gameRow.tournament_id]);
      tournamentName = tournament?.name || 'Torneo';
    }

    // Enviar correos a cada jugador humano
    for (const player of humanPlayers) {
      if (!player.email || !isNotificationEnabled(player.notifications)) {
        console.log(`ℹ️  Jugador ${player.username} no tiene email o notificaciones desactivadas`);
        continue;
      }

      const isWinner = player.team_name === winnerTeam;
      const opponent = player.team_name === player1.team_name ? player2 : player1;
      const opponentName = opponent.is_bot 
        ? opponent.team_name || 'IA'
        : opponent.username || opponent.team_name || 'Oponente';

      await sendGameResultEmail({
        to: player.email,
        username: player.username,
        opponent: opponentName,
        score: scoreText,
        isWinner,
        isVsAI: opponent.is_bot || false,
        isTournamentGame: isTournament,
        tournamentId: gameRow?.tournament_id || null,
        match: isTournament ? `${tournamentName} - ${gameRow.match}` : null
      });

      console.log(`✅ Notificación enviada a ${player.username} (${player.email})`);
    }
  } catch (error) {
    console.error('Error en sendGameFinishNotifications:', error);
    throw error;
  }
}

// Endpoint para finalizar juegos (llamado desde game-service)
fastify.post('/api/games/finish', async (request, reply) => {
  const { gameId, winnerTeam } = request.body as any;
  
  if (!gameId || !winnerTeam) {
    return reply.code(400).send({ message: 'gameId y winnerTeam son requeridos' });
  }

  try {
    const db = await openDb();
    
    // Actualizar el juego como finalizado (encolar)
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE games SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ? OR external_game_id = ?',
      params: ['finished', gameId, gameId]
    }));

    // Marcar ganador/perdedor (encolar)
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE participants SET is_winner = 1 WHERE game_id = (SELECT id FROM games WHERE id = ? OR external_game_id = ? LIMIT 1) AND team_name = ?',
      params: [gameId, gameId, winnerTeam]
    }));
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE participants SET is_winner = 0 WHERE game_id = (SELECT id FROM games WHERE id = ? OR external_game_id = ? LIMIT 1) AND team_name != ?',
      params: [gameId, gameId, winnerTeam]
    }));

    // Obtener información del juego para enviar notificaciones por email
    const gameRow = await db.get('SELECT id, tournament_id, match FROM games WHERE id = ? OR external_game_id = ? LIMIT 1', [gameId, gameId]);
    fastify.log.info({ gameRow }, 'DEBUG gameRow in /api/games/finish');
    
    // Enviar notificaciones por email para partidas online y torneos
    await sendGameFinishNotifications(db, gameId, winnerTeam, gameRow).catch(err => {
      fastify.log.error({ err }, 'Error sending email notifications');
    });
    
    if (gameRow && gameRow.tournament_id) {
      const tournamentId = gameRow.tournament_id;
      // contar partidas no finalizadas para el torneo
      const ready = await waitForPendingToBeZero(db, tournamentId);
      fastify.log.info({ tournamentId, ready }, 'DEBUG pendingCount in /api/games/finish');

      // Si ya no quedan partidas pendientes, notificar a db-service para generar la siguiente ronda
      if (ready) {
        const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:8000';
        // Notificar al db-service de que genere la siguiente ronda (esperando respuesta y logueando errores)
        try {
          const res = await fetch(`${DB_SERVICE_URL}/tournaments/${tournamentId}/advance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tournament_id: tournamentId })
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            fastify.log.error({ status: res.status, body: text }, 'db-service /advance returned error');
          } else {
            fastify.log.info(`Notified db-service to advance tournament ${tournamentId}`);
          }
        } catch (err) {
          fastify.log.error({ err }, 'Error notifying db-service to advance tournament');
        }
      }
    }

    await db.close();
    
    fastify.log.info(`Game ${gameId} finished, winner: ${winnerTeam}`);
    return reply.send({ message: 'Game finished successfully' });
    
  } catch (error: any) {
    fastify.log.error('Error finishing game:', error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
});

async function waitForPendingToBeZero(
  db: any,
  tournamentId: number,
  maxRetries: number = 10,
  delayMs: number = 200
): Promise<boolean> {
  // Determine the current round
  const roundPrefixes = ['1/8', '1/4', '1/2', 'Final'];
  let currentRound = null;
  
  for (const prefix of roundPrefixes) {
    const matchLike = prefix === 'Final' ? 'Final' : `${prefix}%`;
    const row = await db.get(
      'SELECT COUNT(1) AS cnt FROM games WHERE tournament_id = ? AND match LIKE ?',
      [tournamentId, matchLike]
    );
    if (row && row.cnt && Number(row.cnt) > 0) {
      currentRound = prefix;
    }
  }
  
  if (!currentRound) return false;
  
  // Check if current round is finished
  const currentLike = currentRound === 'Final' ? 'Final' : `${currentRound}%`;
  for (let i = 0; i < maxRetries; i++) {
    const pending = await db.get(
      'SELECT COUNT(1) AS cnt FROM games WHERE tournament_id = ? AND match LIKE ? AND status != ?', 
      [tournamentId, currentLike, 'finished']
    );
    const pendingCount = pending?.cnt ? Number(pending.cnt) : 0;
    if (pendingCount === 0) return true;
    await new Promise(res => setTimeout(res, delayMs));
  }
  return false;
}

// Avanza el torneo creando la siguiente ronda cuando todos los partidos de la ronda actual han terminado
fastify.post('/tournaments/:id/advance', async (request: any, reply: any) => {
  const { id } = request.params as any;
  const db = await openDb();
  try {
    // Orden de rondas (de menor a mayor)
    const roundPrefixes = ['1/8', '1/4', '1/2', 'Final'];

    // 1) Determinar la última ronda existente para el torneo
    let latestIndex = -1;
    for (let i = 0; i < roundPrefixes.length; i++) {
      const prefix = roundPrefixes[i];
      const matchLike = prefix === 'Final' ? 'Final' : `${prefix}%`;
      const row = await db.get('SELECT COUNT(1) AS cnt FROM games WHERE tournament_id = ? AND match LIKE ?', id, matchLike);
      if (row && row.cnt && Number(row.cnt) > 0) latestIndex = i;
    }
    if (latestIndex === -1) {
      reply.code(400).send({ message: 'No rounds found for tournament' });
      return;
    }

    const currentPrefix = roundPrefixes[latestIndex];
    const currentLike = currentPrefix === 'Final' ? 'Final' : `${currentPrefix}%`;

    // 2) Comprobar si hay partidos pendientes en la ronda actual
    const pendingRow = await db.get('SELECT COUNT(1) AS cnt FROM games WHERE tournament_id = ? AND match LIKE ? AND status != ?', id, currentLike, 'finished');
    const pendingCount = pendingRow?.cnt ? Number(pendingRow.cnt) : 0;
    if (pendingCount > 0) {
      reply.send({ message: 'Current round still in progress', pending: pendingCount });
      return;
    }

    // 3) Si la ronda actual es Final o no hay siguiente, no crear más rondas
    if (currentPrefix === 'Final' || latestIndex === roundPrefixes.length - 1) {
      reply.send({ message: 'Tournament already in final round or no next round to generate' });
      return;
    }

    const nextIndex = latestIndex + 1;
    const nextPrefix = roundPrefixes[nextIndex];

    // 4) Verificar que la siguiente ronda no exista ya
    const nextLike = nextPrefix === 'Final' ? 'Final' : `${nextPrefix}%`;
    const nextExistsRow = await db.get('SELECT COUNT(1) AS cnt FROM games WHERE tournament_id = ? AND match LIKE ?', id, nextLike);
    if (nextExistsRow && Number(nextExistsRow.cnt) > 0) {
      reply.send({ message: 'Next round already exists' });
      return;
    }

    // 5) Obtener ganadores de la ronda actual, ordenados por game id para mantener emparejamientos esperados
    const winners = await db.all(
      `SELECT p.id AS participant_id, p.user_id, p.is_bot, p.team_name, g.id AS game_id
       FROM participants p
       JOIN games g ON p.game_id = g.id
       WHERE g.tournament_id = ? AND g.match LIKE ? AND p.is_winner = 1
       ORDER BY g.id ASC, p.id ASC`, id, currentLike
    );

    if (!winners || winners.length === 0) {
      reply.code(400).send({ message: 'No winners found in current round' });
      return;
    }

    // 6) Si número de ganadores impar: deja el último en bye (se avanza automáticamente)
    // Para simplicidad: si impar, el último se avanza sin crear partido (se insertará luego si hay par)
    const pairs: Array<[any, any]> = [];
    for (let i = 0; i < winners.length; i += 2) {
      const a = winners[i];
      const b = winners[i + 1] ?? null;
      if (b) pairs.push([a, b]);
      else {
        // TODO: manejar bye; por ahora el ganador sin pareja avanza como participante en siguiente ronda
        // Implementación: crear un participante placeholder en la siguiente ronda (será emparejado cuando haya otro)
        // Para simplicidad, guardamos temporalmente en pairs como [a, null] y no creamos juego.
        pairs.push([a, null]);
      }
    }

    // 7) Construir y encolar las inserciones para la siguiente ronda
    for (let idx = 0; idx < pairs.length; idx++) {
      const [w1, w2] = pairs[idx];
      // Si w2 === null -> avance sin partido por ahora (no creamos juego)
      if (!w2) {
        // En caso de bye, insertamos un tournament participant placeholder for next round by using participants table
        // We'll create a game only when we have pairs. For now enqueue a participant in a future game placeholder is complex.
        // Simpler approach: skip creating a match until we have pairs (this is acceptable for standard even-player tournaments).
        continue;
      }

      // match label
      const matchLabel = nextPrefix === 'Final' ? 'Final' : `${nextPrefix}(${Math.floor(idx) + 1})`;

      // 7.1) INSERT game
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO games (tournament_id, match, status) VALUES (?, ?, ?)',
        params: [id, matchLabel, 'pending']
      }));

      // 7.2) INSERT participants using subquery to get game_id
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
              VALUES (
                (SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1),
                ?, ?, 0, ?
              )`,
        params: [id, matchLabel, w1.user_id ? w1.user_id : null, w1.is_bot ? 1 : 0, w1.team_name || 'Team A']
      }));
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
              VALUES (
                (SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1),
                ?, ?, 0, ?
              )`,
        params: [id, matchLabel, w2.user_id ? w2.user_id : null, w2.is_bot ? 1 : 0, w2.team_name || 'Team B']
      }));

      // 7.3) INSERT initial scores (0)
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO scores (game_id, team_name, point_number)
              VALUES ((SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1), ?, 0)`,
        params: [id, matchLabel, w1.team_name || 'Team A']
      }));
      await redisClient.rPush('sqlite_write_queue', JSON.stringify({
        sql: `INSERT INTO scores (game_id, team_name, point_number)
              VALUES ((SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1), ?, 0)`,
        params: [id, matchLabel, w2.team_name || 'Team B']
      }));

      // 7.4) If one or both players are humans ask game-service to create real game and then update external_game_id
      if (!w1.is_bot || !w2.is_bot) {
        try {
          const playerName = (w1.is_bot ? w2.user_id : w1.user_id) ? 'Jugador' : 'Jugador';
          const gameRes = await fetch('http://game-service:8000/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: `Torneo ${id} - ${w1.team_name || 'Team A'} vs ${w2.team_name || 'Team B'}`,
              gameMode: (!w1.is_bot && !w2.is_bot) ? 'pvp' : 'pve',
              maxPlayers: 2,
              playerName,
              aiDifficulty: 'medium',
              tournamentId: id  // Pass tournament ID to game-service
            })
          });
          if (gameRes.ok) {
            const gameData = await gameRes.json() as any;
            const externalId = gameData?.id ?? gameData?.gameId ?? gameData?.external_game_id ?? null;
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
              sql: 'UPDATE games SET external_game_id = ? WHERE tournament_id = ? AND match = ?',
              params: [externalId, id, matchLabel]
            }));
          }
        } catch (err) {
          fastify.log.error({ err }, 'Error creating game instance for next round');
        }
      }
    }

    reply.send({ message: 'Next round generated (enqueued)', nextRound: nextPrefix });
  } catch (error: any) {
    fastify.log.error(error);
    reply.code(500).send({ message: 'Internal Server Error' });
  } finally {
    await db.close();
  }
});

// Inicializar base de datos y Redis
connectRedis()
  .then(() => {
  fastify.listen({ port: 8000, host: '0.0.0.0' }, (err: Error | null, address: string) => {
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

// Cerrar conexiones al apagar el servidor
process.on('SIGINT', async () => {
  await redisClient.quit();
  fastify.close();
  process.exit();
});