import Fastify from 'fastify';
import { initializeDb, openDb } from './database';
import redisClient from './redis-client';

const fastify = Fastify({
    logger: true
});

// Usar fastify.ready() en lugar de fastify.onReady()
fastify.ready(async (err) => {
    if (err) {
        fastify.log.error('Error durante la inicialización de Fastify:', err);
        process.exit(1);
    }
    await initializeDb();
});

fastify.get('/users', async (request, reply) => {
    const db = await openDb();
    try {
        const users = await db.all('SELECT id, username, email FROM users');
        return users;
    } finally {
        await db.close();
    }
});

fastify.post('/users', async (request, reply) => {
    const { username, password_hash, email } = request.body as any;
    if (!username || !password_hash || !email) {
        reply.code(400).send({ message: 'Missing required fields' });
        return;
    }
    const db = await openDb();
    try {
        const result = await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
            params: [username, password_hash, email]
        }));
        reply.code(201).send({ message: 'User created' });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            reply.code(409).send({ message: 'Username or email already exists' });
        } else {
            fastify.log.error(error);
            reply.code(500).send({ message: 'Internal Server Error' });
        }
    } finally {
        await db.close();
    }
});

// Nuevo endpoint para guardar estadísticas del juego
// --- Tournament Endpoints ---
// List all tournaments
fastify.get('/tournaments', async (request, reply) => {
    const db = await openDb();
    try {
        const tournaments = await db.all('SELECT * FROM tournaments');
        return tournaments;
    } finally {
        await db.close();
    }
});

// Create a new tournament
fastify.post('/tournaments', async (request, reply) => {
    const { name, created_by, status } = request.body as any;
    if (!name) {
        reply.code(400).send({ message: 'Missing tournament name' });
        return;
    }
    const db = await openDb();
    try {
        const result = await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'INSERT INTO tournaments (name, created_by, status) VALUES (?, ?, ?)',
            params: [name, created_by || null, status || 'upcoming']
        }));
        reply.code(201).send({ message: 'Tournament created' });
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Join a tournament (simple version)
fastify.post('/tournaments/:id/join', async (request, reply) => {
    const { id } = request.params as any;
    const { user_id } = request.body as any;
    if (!user_id) {
        reply.code(400).send({ message: 'Missing user_id' });
        return;
    }
    const db = await openDb();
    try {
        // This assumes a game exists for the tournament; you may want to adjust this logic
        // For now, just add a participant with the tournament id as game_id
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'INSERT INTO participants (game_id, user_id, team_name) VALUES (?, ?, ?)',
            params: [id, user_id, 'default']
        }));
        reply.code(201).send({ message: 'Joined tournament' });
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});
fastify.post('/game/stats', async (request, reply) => {
    const { 
        player1_id, 
        player2_id, 
        player1_name, 
        player2_name, 
        score1, 
        score2, 
        winner_id, 
        winner_name, 
        game_mode, 
        duration, 
        start_time, 
        end_time 
    } = request.body as any;

    if (!player1_id || !player2_id || score1 === undefined || score2 === undefined) {
        reply.code(400).send({ message: 'Missing required fields' });
        return;
    }

    const db = await openDb();
    try {
        // Actualizar la tabla games con información adicional
        const result = await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: `INSERT INTO games (
                player1_id, player2_id, score1, score2, status, 
                start_time, end_time, winner_id, winner_name, 
                game_mode, duration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [player1_id, player2_id, score1, score2, 'finished', start_time, end_time, winner_id, winner_name, game_mode, duration]
        }));

        fastify.log.info(`Game stats saved`);
        reply.code(201).send({ message: 'Game statistics saved successfully' 
        });
    } catch (error: any) {
        fastify.log.error('Error saving game stats:', error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Endpoint para obtener estadísticas del juego
fastify.get('/game/stats/:userId', async (request, reply) => {
    const { userId } = request.params as any;
    
    const db = await openDb();
    try {
        const stats = await db.all(
            `SELECT * FROM games 
             WHERE player1_id = ? OR player2_id = ? 
             ORDER BY start_time DESC`,
            userId, userId
        );
        return stats;
    } finally {
        await db.close();
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' }); // Escucha en el puerto 8000
        console.log('db-service escuchando en el puerto 8000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
