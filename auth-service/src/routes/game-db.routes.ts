// auth-service/src/routes/game-db.routes.ts

import { FastifyInstance } from 'fastify';
import { createLocalGameInDB } from '../services/game-db.service';
import { updateLocalGameInDB } from '../services/game-db.service';
import { createAIGameInDB } from '../services/game-db.service';
import { updateAIGameInDB } from '../services/game-db.service';
import { isNotificationEnabled } from '../utils/user-settings.util';
import { sendGameResultEmail } from '../utils/email-notifier';
import { getUserProfile } from '../database'; // ← Usa el nuevo database.ts

export default async function gameDbRoutes(fastify: FastifyInstance) {
  fastify.post('/create/local', async (request, reply) => {
    const { player1Id, tournamentId, startedAt } = request.body as any;
    if (!player1Id || !startedAt) {
      return reply.status(400).send({ success: false, error: 'Faltan player1Id o startedAt' });
    }
    await createLocalGameInDB(player1Id, tournamentId, startedAt);
    reply.status(200).send({ success: true });
  });

  fastify.post('/finish/local', async (request, reply) => {
    const { gameId, winnerTeam, score1, score2 } = request.body as any;
    await updateLocalGameInDB(gameId, winnerTeam, score1, score2);
    reply.status(200).send({ success: true });
  });

  fastify.post('/id-by-started-at', async (request, reply) => {
    const { startedAt } = request.body as { startedAt: string };
    if (!startedAt) {
      return reply.status(400).send({ error: 'Falta startedAt' });
    }

    try {
      const res = await fetch(`${process.env.DB_SERVICE_URL}/api/games/by-started-at/${encodeURIComponent(startedAt)}`);
      if (!res.ok) {
        return reply.status(500).send({ error: 'Error al buscar partida' });
      }
      const data = await res.json();
      reply.send({ gameId: data.gameId || null });
    } catch (err) {
      console.error('Error al buscar gameId por startedAt:', err);
      reply.status(500).send({ error: 'Error interno' });
    }
  });

  fastify.post('/create/ai', async (request, reply) => {
    const { player1Id, difficulty, startedAt } = request.body as any;
    if (!player1Id || !startedAt || !difficulty) {
      return reply.status(400).send({ success: false, error: 'Faltan parámetros' });
    }
    await createAIGameInDB(player1Id, difficulty, startedAt);
    reply.status(200).send({ success: true });
  });

  fastify.post('/finish/ai', async (request, reply) => {
    const { gameId, winnerTeam, score1, score2 } = request.body as any;
    await updateAIGameInDB(gameId, winnerTeam, score1, score2);

    // ✅ Obtener datos del usuario desde db-service
    try {
      // 1. Obtener el participante principal (usuario)
      const res = await fetch(`${process.env.DB_SERVICE_URL}/api/participants/by-game/${gameId}`);
      if (!res.ok) {
        console.warn(`No se encontraron participantes para la partida ${gameId}`);
        return reply.status(200).send({ success: true });
      }

      const participants = await res.json();
      const userParticipant = participants.find((p: any) => p.team_name === 'Team A' && p.user_id);
      const botParticipant = participants.find((p: any) => p.team_name !== 'Team A');

      if (!userParticipant) {
        return reply.status(200).send({ success: true });
      }

      const userId = userParticipant.user_id;

      // 2. Obtener perfil del usuario (email, username, notifications)
      const userRes = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}`);
      if (!userRes.ok) {
        console.warn(`No se pudo obtener el usuario ${userId}`);
        return reply.status(200).send({ success: true });
      }
      const user = await userRes.json();

      const profile = await getUserProfile(userId);
      const notifications = profile?.notifications || 'all';

      // 3. Enviar correo si está habilitado
      if (isNotificationEnabled(notifications)) {
        await sendGameResultEmail({
          userId, // ← En lugar de "to"
          username: user.username,
          opponent: botParticipant?.team_name || 'Bot',
          score: `${score1}-${score2}`,
          isWinner: winnerTeam === 'Team A',
          isVsAI: true,
          isTournamentGame: false
        });
      }

      reply.status(200).send({ success: true });
    } catch (err) {
      console.error('Error procesando el fin de partida AI:', err);
      reply.status(500).send({ success: false, message: 'Error interno' });
    }
  });
}