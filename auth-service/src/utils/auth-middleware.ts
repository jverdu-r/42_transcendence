// src/utils/auth-middleware.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return reply.code(401).send({ message: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (request as any).user = decoded;
  } catch (err) {
    return reply.code(401).send({ message: 'Token inválido' });
  }
}