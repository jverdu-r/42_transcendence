import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { openDb } from './database';
import redis from './redis-client';


dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const fastify = Fastify({ logger: true });

fastify.post('/auth/register', async (request, reply) => {
  const { username, email, password } = request.body as any;
  if (!username || !email || !password) {
    return reply.code(400).send({ message: 'Faltan campos requeridos' });
  }
  const db = await openDb();
  try {
    const hash = await bcrypt.hash(password, 10);
    await redis.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      params: [username, email, hash]
    }));
    return reply.code(201).send({ message: 'Usuario registrado' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return reply.code(409).send({ message: 'Usuario o email ya existe' });
    }
    return reply.code(500).send({ message: 'Error interno' });
  } finally {
    await db.close();
  }
});

fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  const db = await openDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ message: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    return reply.send({ token });
  } finally {
    await db.close();
  }
});

type GooglePayload = {
  email: string;
  name: string;
  [key: string]: any;
};

fastify.post('/auth/google', async (request, reply) => {
  const { token } = request.body as any;
  if (!token) return reply.code(400).send({ message: 'Falta token de Google' });

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!res.ok) return reply.code(401).send({ message: 'Token inválido' });
    const payload = (await res.json()) as GooglePayload;

    const db = await openDb();
    let user = await db.get('SELECT * FROM users WHERE email = ?', payload.email);
    if (!user) {
      await redis.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        params: [payload.name, payload.email, '']
      }));
      // Volver a consultar tras insertar en cola
      user = await db.get('SELECT * FROM users WHERE email = ?', payload.email);
    }
    const jwtToken = jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    return reply.send({ token: jwtToken });
  } catch (err) {
    return reply.code(500).send({ message: 'Error con Google Sign-In' });
  }
});

fastify.listen({ port: 8000, host: '0.0.0.0' }, err => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

