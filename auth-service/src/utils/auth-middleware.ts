// src/utils/auth-middleware.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import redisClient from '../redis-client';

// Extiende el tipo de FastifyRequest para incluir cookies
declare module 'fastify' {
  interface FastifyRequest {
    cookies?: {
      token?: string;
    };
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export const verifyToken = async (
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
) => {
  const authHeader = request.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies?.token || (request.body as any)?.token;

  if (!token) {
    reply.code(401).send({ message: 'Token requerido' });
    return done(new Error('Unauthorized'));
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
      reply.code(401).send({ message: 'Sesión cerrada o inválida' });
      return done(new Error('Session invalid'));
    }

    await redisClient.expire(sessionId, 3600); // renovar TTL

    (request as any).user = decoded;
    (request as any).token = token;

    done();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      reply.code(401).send({ message: 'Token expirado' });
    } else {
      reply.code(403).send({ message: 'Token inválido' });
    }
    done(err);
  }
};