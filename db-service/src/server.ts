import Fastify from 'fastify';
import { initializeDb, openDb } from './database';

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
        const result = await db.run('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)', username, password_hash, email);
        reply.code(201).send({ id: result.lastID, message: 'User created' });
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
        const result = await db.run(
            `INSERT INTO games (
                player1_id, player2_id, score1, score2, status, 
                start_time, end_time, winner_id, winner_name, 
                game_mode, duration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            player1_id, player2_id, score1, score2, 'finished',
            start_time, end_time, winner_id, winner_name,
            game_mode, duration
        );

        fastify.log.info(`Game stats saved with ID: ${result.lastID}`);
        reply.code(201).send({ 
            id: result.lastID, 
            message: 'Game statistics saved successfully' 
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
