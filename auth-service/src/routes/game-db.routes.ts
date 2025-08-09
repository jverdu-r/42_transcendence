// auth-service/src/routes/game-db.routes.ts

import { FastifyInstance } from 'fastify';
import { createLocalGameInDB } from '../services/game-db.service';
import { updateLocalGameInDB } from '../services/game-db.service';
import { createAIGameInDB } from '../services/game-db.service';
import { updateAIGameInDB } from '../services/game-db.service';
import { isNotificationEnabled } from '../utils/user-settings.util';
import { sendGameResultEmail } from '../utils/email-notifier';
import { openDb } from '../database';

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

        let db;
        try {
            db = await openDb();
            const row = await db.get(
            `SELECT id FROM games WHERE status = 'pending' AND started_at = ?`,
            [startedAt]
            );
            await db.close();

            if (row) {
            reply.send({ gameId: row.id });
            } else {
            reply.send({ gameId: null });
            }
        } catch (err) {
            console.error('Error al buscar gameId por startedAt:', err);
            reply.status(500).send({ error: 'Error interno' });
        } finally {
            if (db) await db.close().catch(console.error);
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

        // ✅ Obtener datos del usuario y enviar correo
        const db = await openDb();
        try {
            const result = await db.get(`
            SELECT 
                u.email,
                u.username,
                up.notifications,
                p2.team_name AS bot_name
            FROM users u
            JOIN participants p ON u.id = p.user_id
            JOIN user_profiles up ON u.id = up.user_id
            JOIN participants p2 ON p2.game_id = p.game_id AND p2.team_name != 'Team A'
            WHERE p.game_id = ? AND p.team_name = 'Team A'
            `, [gameId]);

            if (result && isNotificationEnabled(result.notifications)) {
                await sendGameResultEmail({
                    to: result.email,
                    username: result.username,
                    opponent: result.bot_name,
                    score: `${score1}-${score2}`,
                    isWinner: winnerTeam === 'Team A',
                    isVsAI: true,
                    isTournamentGame: false
                });
            }
        } catch (err) {
            console.error('Error enviando correo:', err);
        } finally {
            await db.close();
        }

        reply.status(200).send({ success: true });
    });
}