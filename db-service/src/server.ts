declare var process: any;
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { initializeDb, openDb } from './database';
import redisClient from './redis-client';

const fastify = Fastify({
    logger: true
});

// Habilitar CORS para permitir peticiones desde el frontend
fastify.register(fastifyCors, {
    origin: true,
    credentials: true
});

// Usar fastify.ready() en lugar de fastify.onReady()
fastify.ready(async (err) => {
    if (err) {
        fastify.log.error('Error durante la inicialización de Fastify:', err as any);
        process.exit(1);
    }
    await initializeDb();
});

fastify.get('/users', async (request: any, reply: any) => {
    const db = await openDb();
    try {
        const users = await db.all('SELECT id, username, email FROM users');
        return users;
    } finally {
        await db.close();
    }
});

// Get all participants (users and bots) registered in a tournament
fastify.get('/tournaments/:id/participants', async (request: any, reply: any) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
        const participants = await db.all('SELECT * FROM tournament_participants WHERE tournament_id = ?', id);
        reply.send(participants);
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

fastify.post('/users', async (request: any, reply: any) => {
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

// Obtener los partidos de un torneo
fastify.get('/tournaments/:id/matches', async (request: any, reply: any) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
        // Buscar partidos en la tabla games por tournament_id
        const matches = await db.all('SELECT * FROM games WHERE tournament_id = ?', id);
        // Agrupar partidos por el campo correcto: match
        const rounds: { [key: string]: any[] } = {};
        for (const m of matches) {
            // Obtener participantes
            const participants = await db.all(`
                SELECT p.*, u.username
                FROM participants p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.game_id = ?
                ORDER BY p.id ASC
            `, m.id);
            let player1 = null, player2 = null, team1 = null, team2 = null;
            if (participants.length > 0) {
                player1 = participants[0].username ? participants[0].username : participants[0].team_name;
                team1 = participants[0].team_name;
            }
            if (participants.length > 1) {
                player2 = participants[1].username ? participants[1].username : participants[1].team_name;
                team2 = participants[1].team_name;
            }
            // Obtener marcador final de scores
            let score1 = 0, score2 = 0;
            const scores = await db.all('SELECT team_name, point_number FROM scores WHERE game_id = ?', m.id);
            if (team1) {
                const s1 = scores.find((s: any) => s.team_name === team1);
                score1 = s1 ? s1.point_number : 0;
            }
            if (team2) {
                const s2 = scores.find((s: any) => s.team_name === team2);
                score2 = s2 ? s2.point_number : 0;
            }
            // Ganador (1 si player1, 2 si player2, 0 si empate o no definido)
            let winner = null;
            if (score1 > score2) winner = 1;
            else if (score2 > score1) winner = 2;
            else if (score1 === score2 && (score1 !== 0 || score2 !== 0)) winner = 0;
            // Agrupar por ronda usando el campo correcto
            if (!rounds[m.match]) rounds[m.match] = [];
            rounds[m.match].push({
                id: m.id,
                player1: {
                    user_id: participants[0]?.user_id,
                    username: player1
                },
                player2: participants.length > 1 ? {
                    user_id: participants[1]?.user_id,
                    username: player2
                } : null,
                score1,
                score2,
                status: m.status,
                winner,
                external_game_id: m.external_game_id 
            });
        }
        
        // Determinar qué rondas existen basándose en las etiquetas de los partidos
        const hasOctavos = Object.keys(rounds).some(k => k.startsWith('1/8'));
        const hasCuartos = Object.keys(rounds).some(k => k.startsWith('1/4'));
        const hasSemis = Object.keys(rounds).some(k => k.startsWith('1/2'));
        const hasFinal = Object.keys(rounds).some(k => k === 'Final');
        
        // Orden clásico de rondas para torneos de hasta 16 jugadores
        const roundOrder = [
            '1/8(1)', '1/8(2)', '1/8(3)', '1/8(4)', '1/8(5)', '1/8(6)', '1/8(7)', '1/8(8)',
            '1/4(1)', '1/4(2)', '1/4(3)', '1/4(4)',
            '1/2(1)', '1/2(2)',
            'Final'
        ];
        
        // Agrupar partidos por ronda en el orden correcto
        const groupedRounds: any[][] = [];
        
        // Octavos (solo si existen)
        if (hasOctavos) {
            const octavos = roundOrder.slice(0,8).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
            if (octavos.length > 0) groupedRounds.push(octavos);
        }
        
        // Cuartos (solo si existen)
        if (hasCuartos) {
            const cuartos = roundOrder.slice(8,12).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
            if (cuartos.length > 0) groupedRounds.push(cuartos);
        }
        
        // Semifinales (solo si existen)
        if (hasSemis) {
            const semis = roundOrder.slice(12,14).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
            if (semis.length > 0) groupedRounds.push(semis);
        }
        
        // Final (solo si existe)
        if (hasFinal) {
            const final = roundOrder.slice(14,15).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
            if (final.length > 0) groupedRounds.push(final);
        }
        
        reply.send(groupedRounds);
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Comenzar torneo: rellenar con bots si faltan jugadores
fastify.post('/tournaments/:id/start', async (request: any, reply: any) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
        // Obtener torneo y participantes
        const tournament = await db.get('SELECT * FROM tournaments WHERE id = ?', id);
        if (!tournament) {
            reply.code(404).send({ message: 'Tournament not found' });
            return;
        }
        if (tournament.status !== 'pending') {
            reply.code(400).send({ message: 'Solo se puede comenzar un torneo pendiente.' });
            return;
        }
        let participants = await db.all('SELECT * FROM tournament_participants WHERE tournament_id = ?', id);
        const numPlayers = tournament.players;
        const botsEnabled = tournament.bots;
        const botsDifficulty = tournament.bots_difficulty || 'medium';
        let toAdd = numPlayers - participants.length;
        // Añadir bots si faltan jugadores
        if (toAdd > 0 && botsEnabled) {
            for (let i = 1; i <= toAdd; i++) {
                await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                    sql: 'INSERT INTO tournament_participants (tournament_id, is_bot, bot_name) VALUES (?, 1, ?)',
                    params: [id, `${botsDifficulty.charAt(0).toUpperCase() + botsDifficulty.slice(1)} Bot ${i}`]
                }));
            }
            // Esperar a que los bots se inserten en la base de datos
            await new Promise(res => setTimeout(res, 300));
        }
        // Obtener participantes con username (para humanos) o bot_name (para bots)
        participants = await db.all(`
        SELECT 
            tp.*,
            u.username
        FROM tournament_participants tp
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE tp.tournament_id = ?
        `, id);

        // 👇 DEFINIR UNA SOLA VEZ, FUERA DEL BUCLE
        const getPlayerName = (p: any) => {
            if (p.is_bot) {
                return p.bot_name || 'Bot';
            } else {
                return p.username || 'Jugador';
            }
        };

        // Mezclar aleatoriamente los participantes
        const shuffled = participants.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // Crear emparejamientos (partidos)
        const gamesToCreate = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                gamesToCreate.push([shuffled[i], shuffled[i + 1]]);
            }
        }
        // playersCount: número de jugadores en esta ronda (shuffled.length)
        const playersCount = shuffled.length;
        let roundPrefix: string;
        if (playersCount === 16) roundPrefix = '1/8';
        else if (playersCount === 8) roundPrefix = '1/4';
        else if (playersCount === 4) roundPrefix = '1/2';
        else if (playersCount === 2) roundPrefix = 'Final';
        else roundPrefix = 'Round'; // fallback para casos no estándar

        // Función utilitaria para obtener el label del match
        const getMatchLabel = (matchIndex: number) => {
            if (roundPrefix === 'Final') return 'Final';
            return `${roundPrefix}(${matchIndex + 1})`;
        };
        // Crear games, participants y scores
        for (let idx = 0; idx < gamesToCreate.length; idx++) {
            const [p1, p2] = gamesToCreate[idx];

            const matchLabel = getMatchLabel(idx);

            // 1) Crear game (encolado)
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: 'INSERT INTO games (tournament_id, match, status) VALUES (?, ?, ?)',
                params: [id, matchLabel, 'pending']
            }));

            // 2) Encolar participants usando subquery para obtener game_id una vez que el worker ejecute el INSERT anterior
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: `INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
                      VALUES (
                        (SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1),
                        ?, ?, 0, ?
                      )`,
                params: [id, matchLabel, p1.is_bot ? null : p1.user_id, p1.is_bot ? 1 : 0, p1.bot_name || p1.team_name || (p1.user_id ? 'Team A' : 'Team A')]
            }));
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: `INSERT INTO participants (game_id, user_id, is_bot, is_winner, team_name)
                      VALUES (
                        (SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1),
                        ?, ?, 0, ?
                      )`,
                params: [id, matchLabel, p2.is_bot ? null : p2.user_id, p2.is_bot ? 1 : 0, p2.bot_name || p2.team_name || (p2.user_id ? 'Team B' : 'Team B')]
            }));

            // 3) Encolar scores (punto inicial 0) usando la misma subquery
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: `INSERT INTO scores (game_id, team_name, point_number)
                      VALUES ((SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1), ?, 0)`,
                params: [id, matchLabel, p1.bot_name || p1.team_name || (p1.user_id ? 'Team A' : 'Team A')]
            }));
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: `INSERT INTO scores (game_id, team_name, point_number)
                      VALUES ((SELECT id FROM games WHERE tournament_id = ? AND match = ? LIMIT 1), ?, 0)`,
                params: [id, matchLabel, p2.bot_name || p2.team_name || (p2.user_id ? 'Team B' : 'Team B')]
            }));

            // 4) Si corresponde, crear partida en game-service y encolar el UPDATE para external_game_id
            if (!p1.is_bot || !p2.is_bot) {
                let gameMode: 'pvp' | 'pve' = 'pvp';
                let aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

                if (p1.is_bot || p2.is_bot) {
                    gameMode = 'pve';
                    aiDifficulty = tournament.bots_difficulty === 'easy' ? 'easy' :
                                   tournament.bots_difficulty === 'hard' ? 'hard' : 'medium';
                }

                const humanPlayer = p1.is_bot ? p2 : p1;
                const playerName = humanPlayer.username || humanPlayer.bot_name || 'Jugador';

                try {
                    const gameRes = await fetch('http://game-service:8000/api/games', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre: `Torneo ${id} - ${getPlayerName(p1)} vs ${getPlayerName(p2)}`,
                            gameMode,
                            maxPlayers: 2,
                            playerName,
                            aiDifficulty,
                            tournamentId: id  // Pass tournament ID to game-service
                        })
                    });

                    if (gameRes.ok) {
                        const gameData = await gameRes.json();
                        // Encolar UPDATE usando tournament_id + match (no usar gameRow.id que depende de lecturas sincrónicas)
                        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                            sql: 'UPDATE games SET external_game_id = ? WHERE tournament_id = ? AND match = ?',
                            params: [gameData.id, id, matchLabel]
                        }));
                    } else {
                        fastify.log.warn(`Failed to create game in game-service for match ${getPlayerName(p1)} vs ${getPlayerName(p2)}`);
                    }
                } catch (err) {
                    fastify.log.error({ err }, 'Error calling game-service');
                }
            }
        }
        // Cambiar estado a "started"
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'UPDATE tournaments SET status = ? WHERE id = ?',
            params: ['started', id]
        }));

        // Esperar a que los games y participants estén en la base de datos
        await new Promise(res => setTimeout(res, 700));

        // Resolver automáticamente los partidos bot vs bot y guardar resultado
        await resolveBotVsBotGamesWithScores(db, id);

        reply.send({ message: 'Tournament started', bots_added: toAdd > 0 ? toAdd : 0 });
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Resuelve automáticamente los partidos bot vs bot de un torneo y ENCOLA las escrituras (sin tocar SQLite aquí)
async function resolveBotVsBotGamesWithScores(db: any, tournamentId: number) {
  const pendingGames = await db.all(
    'SELECT id FROM games WHERE tournament_id = ? AND status = ?',
    tournamentId,
    'pending'
  );

  const isBotVal = (v: any) => Number(v) === 1 || v === true;

  for (const game of pendingGames) {
    const participants: Array<{ id: number; is_bot: any; team_name: string }> = await db.all(
      'SELECT id, is_bot, team_name FROM participants WHERE game_id = ? ORDER BY id ASC',
      game.id
    );
    if (participants.length !== 2) continue;

    const p0bot = isBotVal(participants[0].is_bot);
    const p1bot = isBotVal(participants[1].is_bot);
    if (!p0bot || !p1bot) continue;

    const winnerIdx = Math.floor(Math.random() * 2);
    const loserIdx = winnerIdx === 0 ? 1 : 0;
    const loserScore = Math.floor(Math.random() * 5); // 0..4

    // Fecha-hora de inicio y fin (fin = inicio + 1 segundo)
    const start = new Date();
    const finish = new Date(start.getTime() + 1000); // +1s

    const startedAt = start.toISOString().slice(0, 19).replace('T', ' ');
    const finishedAt = finish.toISOString().slice(0, 19).replace('T', ' ');

    // 1) Ganador/perdedor
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE participants SET is_winner = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE game_id = ?',
      params: [participants[winnerIdx].id, game.id]
    }));

    // 2) Scores
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE scores SET point_number = 5 WHERE game_id = ? AND team_name = ?',
      params: [game.id, participants[winnerIdx].team_name]
    }));
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE scores SET point_number = ? WHERE game_id = ? AND team_name = ?',
      params: [loserScore, game.id, participants[loserIdx].team_name]
    }));

    // 3) Game terminado (+1s)
    await redisClient.rPush('sqlite_write_queue', JSON.stringify({
      sql: 'UPDATE games SET status = ?, started_at = COALESCE(started_at, ?), finished_at = ? WHERE id = ?',
      params: ['finished', startedAt, finishedAt, game.id]
    }));
  }
}

// Obtener participantes inscritos en un torneo
fastify.get('/tournaments/:id/players', async (request: any, reply: any) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
        // 1. Obtener los ids de los partidos del torneo
        const games = await db.all('SELECT id FROM games WHERE tournament_id = ?', id);
    const gameIds = games.map((g: any) => g.id);
        if (gameIds.length === 0) {
            reply.send([]);
            await db.close();
            return;
        }
        // 2. Obtener los participantes de esos partidos
        const placeholders = gameIds.map(() => '?').join(',');
        const participants = await db.all(`
            SELECT p.id, p.user_id, p.is_bot, p.is_winner, u.username, u.email
            FROM participants p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.game_id IN (${placeholders})
        `, ...gameIds);
        reply.send(participants);
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});
// List all tournaments
fastify.get('/tournaments', async (request: any, reply: any) => {
    const db = await openDb();
    try {
        const { status } = request.query;
        let query = `SELECT t.*, u.username as creator_username FROM tournaments t LEFT JOIN users u ON t.created_by = u.id`;
        let params: any[] = [];
        if (status) {
            query += ' WHERE t.status = ?';
            params.push(status);
        }
        const tournaments = await db.all(query, ...params);
        return tournaments;
    } finally {
        await db.close();
    }
});

// Create a new tournament
fastify.post('/tournaments', async (request: any, reply: any) => {
    const { name, created_by, status, players, bots, bots_difficulty } = request.body as any;
    if (!name) {
        reply.code(400).send({ message: 'Missing tournament name' });
        return;
    }
    const db = await openDb();
    try {
        // Verificar nombre único
        const existing = await db.get('SELECT id FROM tournaments WHERE name = ?', name);
        if (existing) {
            reply.code(409).send({ message: 'Tournament name already exists' });
            return;
        }
        // Verificar que el usuario no tenga otro torneo pending
        const pending = await db.get('SELECT id FROM tournaments WHERE created_by = ? AND status = ?', created_by, 'pending');
        if (pending) {
            reply.code(409).send({ message: 'You already have a pending tournament' });
            return;
        }
        // Insertar torneo
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'INSERT INTO tournaments (name, created_by, status, players, bots, bots_difficulty) VALUES (?, ?, ?, ?, ?, ?)',
            params: [name, created_by || null, status || 'pending', players || 8, bots ? 1 : 0, bots_difficulty || "-"]
        }));
        // Esperar a que se cree el torneo y obtener el id por nombre, status y creador (reintentar si no existe)
        const tournamentStatus = status || 'pending';
        let dbTournament = null;
        for (let i = 0; i < 10; i++) {
            dbTournament = await db.get('SELECT id FROM tournaments WHERE name = ? AND status = ? AND created_by = ?', name, tournamentStatus, created_by);
            if (dbTournament && dbTournament.id) break;
            await new Promise(res => setTimeout(res, 100));
        }
        if (dbTournament && dbTournament.id) {
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: 'INSERT INTO tournament_participants (tournament_id, user_id, is_bot) VALUES (?, ?, 0)',
                params: [dbTournament.id, created_by]
            }));
        }
        reply.code(201).send({ message: 'Tournament created' });
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Join a tournament (simple version)
fastify.post('/tournaments/:id/join', async (request: any, reply: any) => {
    const { id } = request.params as any;
    const { user_id } = request.body as any;
    if (!user_id) {
        reply.code(400).send({ message: 'Missing user_id' });
        return;
    }
    const db = await openDb();
    try {
        // Verificar que el torneo existe y está pendiente
        const tournament = await db.get('SELECT * FROM tournaments WHERE id = ?', id);
        if (!tournament || tournament.status !== 'pending') {
            reply.code(400).send({ message: 'Solo se pueden inscribir en torneos pendientes.' });
            return;
        }
        // Verificar que el usuario no está ya inscrito
        const already = await db.get('SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', id, user_id);
        if (already) {
            reply.code(409).send({ message: 'Ya inscrito en el torneo.' });
            return;
        }
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'INSERT INTO tournament_participants (tournament_id, user_id, is_bot) VALUES (?, ?, 0)',
            params: [id, user_id]
        }));
        reply.send({ message: 'Inscripción correcta' });
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Endpoint para borrar torneo pendiente y sus participantes
fastify.delete('/tournaments/:id', async (request: any, reply: any) => {
    const { id } = request.params as any;
    const db = await openDb();
    try {
        // Verificar que el torneo está pendiente
        const tournament = await db.get('SELECT * FROM tournaments WHERE id = ?', id);
        if (!tournament || tournament.status !== 'pending') {
            reply.code(400).send({ message: 'Solo se pueden borrar torneos pendientes.' });
            return;
        }
        // Eliminar participantes inscritos en el torneo
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'DELETE FROM tournament_participants WHERE tournament_id = ?',
            params: [id]
        }));
        // Eliminar el torneo
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'DELETE FROM tournaments WHERE id = ?',
            params: [id]
        }));
        reply.send({ message: 'Torneo y participantes eliminados.' });
    } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

fastify.post('/game/stats', async (request: any, reply: any) => {
    const {
        external_game_id,
        game_id,                 // opcional
        player1_name,
        player2_name,
        score1,
        score2,
        winner_name,             // opcional: team_name o username
        winner_id,               // opcional: user id
        game_mode,
        duration,
        start_time,
        end_time
    } = request.body as any;

    if ((score1 === undefined) || (score2 === undefined) || !(external_game_id || game_id)) {
        reply.code(400).send({ message: 'Missing required fields (external_game_id|game_id and scores)' });
        return;
    }

    const db = await openDb();
    try {
        // 1) localizar game de torneo
        const gameRow = external_game_id
            ? await db.get('SELECT id FROM games WHERE external_game_id = ?', external_game_id)
            : await db.get('SELECT id FROM games WHERE id = ?', game_id);

        if (!gameRow || !gameRow.id) {
            reply.code(404).send({ message: 'Game not found for provided external_game_id/game_id' });
            return;
        }
        const gameId = gameRow.id;

        // 2) obtener participantes para ese game
        const participants: Array<{ id: number; user_id: number | null; team_name: string | null; is_bot: any }> =
            await db.all('SELECT id, user_id, team_name, is_bot FROM participants WHERE game_id = ? ORDER BY id ASC', gameId);

        // resolver team_name mapping
        let teamA: string | null = participants[0]?.team_name ?? null;
        let teamB: string | null = participants[1]?.team_name ?? null;

        // Si game-service envía nombres de jugadores en lugar de team_name, intentar mapear
        if (!teamA && player1_name) teamA = player1_name;
        if (!teamB && player2_name) teamB = player2_name;

        // 3) calcular ganador por winner_name / winner_id / score
        let winnerIdx: number | null = null;
        if (typeof winner_name === 'string') {
            if (teamA && winner_name === teamA) winnerIdx = 0;
            else if (teamB && winner_name === teamB) winnerIdx = 1;
            else {
                // intentar comparar con username de participants si existe user_id
                const pUsers = await db.all('SELECT id, user_id FROM participants WHERE game_id = ? ORDER BY id ASC', gameId);
                for (let i = 0; i < pUsers.length; i++) {
                    if (pUsers[i].user_id && String(pUsers[i].user_id) === String(winner_name)) { winnerIdx = i; break; }
                }
            }
        }
        if (winnerIdx === null && typeof winner_id !== 'undefined') {
            // buscar índice por user id
            const idx = participants.findIndex(p => p.user_id && String(p.user_id) === String(winner_id));
            if (idx >= 0) winnerIdx = idx;
        }
        if (winnerIdx === null) {
            // fallback por scores
            if (score1 > score2) winnerIdx = 0;
            else if (score2 > score1) winnerIdx = 1;
        }

        // 4) encolar actualizaciones en Redis (no tocar SQLite aquí)
        // actualizar participants is_winner
        if (participants.length === 2) {
            const winnerTeamName = winnerIdx === 0 ? teamA : (winnerIdx === 1 ? teamB : null);
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: 'UPDATE participants SET is_winner = CASE WHEN team_name = ? THEN 1 ELSE 0 END WHERE game_id = ?',
                params: [winnerTeamName, gameId]
            }));
        }

        // actualizar scores (asumimos que filas scores ya existen)
        if (teamA !== null) {
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: 'UPDATE scores SET point_number = ? WHERE game_id = ? AND team_name = ?',
                params: [score1, gameId, teamA]
            }));
        }
        if (teamB !== null) {
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: 'UPDATE scores SET point_number = ? WHERE game_id = ? AND team_name = ?',
                params: [score2, gameId, teamB]
            }));
        }

        // actualizar game (status y timestamps)
        const startedAt = start_time || new Date().toISOString().slice(0,19).replace('T',' ');
        const finishedAt = end_time || new Date().toISOString().slice(0,19).replace('T',' ');
        await redisClient.rPush('sqlite_write_queue', JSON.stringify({
            sql: 'UPDATE games SET status = ?, started_at = COALESCE(started_at, ?), finished_at = ? WHERE id = ?',
            params: ['finished', startedAt, finishedAt, gameId]
        }));

        // opcional: actualizar external_game_id si venía en la petición
        if (external_game_id) {
            await redisClient.rPush('sqlite_write_queue', JSON.stringify({
                sql: 'UPDATE games SET external_game_id = ? WHERE id = ?',
                params: [external_game_id, gameId]
            }));
        }

        reply.code(200).send({ message: 'Game stats queued for persistence' });
    } catch (error: any) {
        fastify.log.error('Error saving game stats:', error);
        reply.code(500).send({ message: 'Internal Server Error' });
    } finally {
        await db.close();
    }
});

// Endpoint para obtener estadísticas del juego
fastify.get('/game/stats/:userId', async (request: any, reply: any) => {
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
