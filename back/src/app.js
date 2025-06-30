// src/app.js - VERSIÓN CON AUTENTICACIÓN SQLITE

const fastify = require('fastify')({
    logger: true
});
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// JWT Secret (en producción debería venir de variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_larga_y_segura';

// Inicializar base de datos SQLite
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/game.db');
console.log('🔍 Database path:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error conectando a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        // Crear tablas si no existen
        initializeDatabase();
    }
});

// Función para inicializar la base de datos
function initializeDatabase() {
    const createTables = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player1_id INTEGER NOT NULL,
            player2_id INTEGER NOT NULL,
            winner_id INTEGER,
            player1_score INTEGER DEFAULT 0,
            player2_score INTEGER DEFAULT 0,
            game_mode TEXT DEFAULT 'classic',
            duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player1_id) REFERENCES users (id),
            FOREIGN KEY (player2_id) REFERENCES users (id),
            FOREIGN KEY (winner_id) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS user_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            games_played INTEGER DEFAULT 0,
            games_won INTEGER DEFAULT 0,
            games_lost INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 0,
            highest_score INTEGER DEFAULT 0,
            win_streak INTEGER DEFAULT 0,
            best_win_streak INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions (session_token);
        CREATE INDEX IF NOT EXISTS idx_games_players ON games (player1_id, player2_id);
        CREATE INDEX IF NOT EXISTS idx_stats_user ON user_stats (user_id);
    `;
    
    db.exec(createTables, (err) => {
        if (err) {
            console.error('Error creando tablas:', err.message);
        } else {
            console.log('✅ Tablas de base de datos verificadas/creadas');
        }
    });
}

// Middleware para autenticación JWT
async function authenticate(request, reply) {
    try {
        const authorization = request.headers.authorization;
        if (!authorization || !authorization.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Token de autorización requerido' });
        }
        
        const token = authorization.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verificar que el usuario existe
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, email FROM users WHERE id = ?', [decoded.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return reply.code(401).send({ error: 'Usuario no válido' });
        }
        
        request.user = user;
    } catch (error) {
        return reply.code(401).send({ error: 'Token no válido' });
    }
}


// Custom metrics
const websocketConnections = new client.Gauge({
    name: 'websocket_connections_total',
    help: 'Total number of active WebSocket connections'
});

const activeGamesGauge = new client.Gauge({
    name: 'active_games_total',
    help: 'Total number of active games'
});

const playersWaitingGauge = new client.Gauge({
    name: 'players_waiting_total',
    help: 'Total number of players waiting for a match'
});

const matchmakingCounter = new client.Counter({
    name: 'matchmaking_attempts_total',
    help: 'Total number of matchmaking attempts'
});

const gameStartCounter = new client.Counter({
    name: 'games_started_total',
    help: 'Total number of games started'
});

const gameEndCounter = new client.Counter({
    name: 'games_ended_total',
    help: 'Total number of games ended'
});

// Register custom metrics
register.registerMetric(websocketConnections);
register.registerMetric(activeGamesGauge);
register.registerMetric(playersWaitingGauge);
register.registerMetric(matchmakingCounter);
register.registerMetric(gameStartCounter);
register.registerMetric(gameEndCounter);

// CORS Configuration
fastify.register(require('@fastify/cors'), {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

// WebSocket Configuration
fastify.register(require('@fastify/websocket'));

// Matchmaking Logic
let waitingPlayerSocket = null;
const activeGames = [];
const finishedGames = new Set(); // Para evitar enviar opponent_disconnected después de game_end

function clearWaitingPlayer(reason = 'timeout') {
    if (waitingPlayerSocket) {
        if (waitingPlayerSocket.connection && waitingPlayerSocket.connection.socket) {
            waitingPlayerSocket.connection.socket.send(JSON.stringify({
                type: 'waiting_timeout',
                message: reason === 'timeout'
                    ? 'No se encontró oponente a tiempo. Intenta de nuevo.'
                    : `Saliste de la cola de espera por ${reason}.`
            }));
            waitingPlayerSocket.connection.socket.close();
        }
    }
    waitingPlayerSocket = null;
}

// *** CORRECCIÓN CRÍTICA AQUÍ ***
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        const tempConnectionId = `ConexionWS_${Math.random().toString(36).substring(7)}`;
        fastify.log.info(`Nueva conexión WebSocket: ${tempConnectionId}`);
        
        // Update metrics
        websocketConnections.inc();
        
        // Enviar mensaje inicial usando connection.socket.send
        try {
            connection.socket.send(JSON.stringify({ type: 'status', message: 'Servidor WebSocket conectado' }));
            fastify.log.info(`Mensaje inicial enviado a ${tempConnectionId}`);
        } catch (error) {
            fastify.log.error(`Error enviando mensaje inicial: ${error.message}`);
        }

        let playerName = null;

        connection.socket.on('message', message => {
            fastify.log.info(`Mensaje recibido de ${playerName || tempConnectionId}: ${message.toString()}`);
            
            try {
                const data = JSON.parse(message.toString());

                if (data.type === 'join-game') {
                    // Validación del nombre
                    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
                        connection.socket.send(JSON.stringify({
                            type: 'error',
                            message: 'El nombre de usuario es obligatorio y debe ser válido.'
                        }));
                        return;
                    }
                    
                    playerName = data.name.trim();
                    fastify.log.info(`Jugador ${playerName} se unió al matchmaking`);

                    // Prevenir duplicados
                    if (waitingPlayerSocket && waitingPlayerSocket.id === playerName) {
                        connection.socket.send(JSON.stringify({
                            type: 'error',
                            message: 'Ya estás esperando un oponente con ese nombre.'
                        }));
                        return;
                    }

                    if (waitingPlayerSocket === null) {
                        // Primer jugador en la cola
                        waitingPlayerSocket = { id: playerName, connection: connection };
                        fastify.log.info(`${playerName} está esperando un oponente.`);
                        
                        // Update metrics
                        matchmakingCounter.inc();
                        playersWaitingGauge.set(1);

                        connection.socket.send(JSON.stringify({
                            type: 'waiting',
                            message: `Buscando oponente para ${playerName}...`
                        }));
                    } else {
                        // Emparejar jugadores
                        const player1 = waitingPlayerSocket;
                        const player2 = { id: playerName, connection: connection };

                        fastify.log.info(`Emparejando: ${player1.id} vs ${player2.id}`);

                        // Agregar a juegos activos
                        activeGames.push({ player1, player2 });
                        
                        // Update metrics
                        gameStartCounter.inc();
                        activeGamesGauge.set(activeGames.length);
                        playersWaitingGauge.set(0);

                        // Notificar a ambos jugadores
                        player1.connection.socket.send(JSON.stringify({
                            type: 'opponentFound',
                            opponent: player2.id,
                            message: `¡Oponente encontrado! Jugando contra ${player2.id}`,
                            gameMode: data.gameMode || 'classic',
                            isHost: true // Player1 es el host
                        }));

                        player2.connection.socket.send(JSON.stringify({
                            type: 'opponentFound',
                            opponent: player1.id,
                            message: `¡Oponente encontrado! Jugando contra ${player1.id}`,
                            gameMode: data.gameMode || 'classic',
                            isHost: false // Player2 no es el host
                        }));

                        // Limpiar cola de espera SIN desconectar al jugador
                        waitingPlayerSocket = null;
                    }
                }
                // Manejo de mensajes de juego
                else if (['game_sync', 'game_start', 'game_end', 'player_input'].includes(data.type)) {
                    const game = activeGames.find(g => (g.player1.connection === connection || g.player2.connection === connection));
                    if (game) {
                        const opponentConnection = (game.player1.connection === connection) ? game.player2.connection : game.player1.connection;
                        
                        // Reenviar mensaje al oponente
                        if (opponentConnection && opponentConnection.socket) {
                            opponentConnection.socket.send(message.toString());
                        }
                        
                        // Si es game_end, marcar el juego como terminado y limpiar de activeGames
                        if (data.type === 'game_end') {
                            const gameIdx = activeGames.findIndex(g => g === game);
                            if (gameIdx !== -1) {
                                // Marcar como terminado para evitar mensajes de desconexión
                                const gameId = `${game.player1.id}_vs_${game.player2.id}`;
                                finishedGames.add(gameId);
                                
                                fastify.log.info(`Juego terminado: ${game.player1.id} vs ${game.player2.id}, ganador: ${data.winner}`);
                                
                                // Remover de juegos activos
                                activeGames.splice(gameIdx, 1);
                                
                                // Update metrics
                                gameEndCounter.inc();
                                activeGamesGauge.set(activeGames.length);
                                
                                // Limpiar la marca después de un tiempo para evitar acumulación
                                setTimeout(() => {
                                    finishedGames.delete(gameId);
                                }, 30000); // 30 segundos
                            }
                        }
                    } else {
                        fastify.log.warn(`Mensaje de juego sin juego activo de ${playerName || tempConnectionId}`);
                        connection.socket.send(JSON.stringify({
                            type: 'error',
                            message: 'No estás en un juego activo'
                        }));
                    }
                } else {
                    // Mensaje desconocido
                    fastify.log.warn(`Mensaje desconocido de ${playerName || tempConnectionId}: ${data.type}`);
                    connection.socket.send(JSON.stringify({
                        type: 'error',
                        message: 'Tipo de mensaje desconocido'
                    }));
                }

            } catch (e) {
                fastify.log.error(`Error procesando mensaje de ${playerName || tempConnectionId}: ${e.message}`);
                connection.socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Error procesando mensaje'
                }));
            }
        });

        connection.socket.on('close', () => {
            const disconnectedId = playerName || tempConnectionId;
            fastify.log.info(`WebSocket ${disconnectedId} desconectado`);
            
            // Update metrics
            websocketConnections.dec();

            // Limpiar jugador en espera
            if (waitingPlayerSocket && waitingPlayerSocket.connection === connection) {
                fastify.log.info(`${waitingPlayerSocket.id} abandonó la cola de espera`);
                playersWaitingGauge.set(0);
                waitingPlayerSocket = null;
            }

            // Manejar desconexión en juego activo
            const gameIdx = activeGames.findIndex(g => g.player1.connection === connection || g.player2.connection === connection);
            if (gameIdx !== -1) {
                const game = activeGames[gameIdx];
                const opponentConnection = (game.player1.connection === connection) ? game.player2.connection : game.player1.connection;
                const opponentId = (game.player1.connection === connection) ? game.player2.id : game.player1.id;
                const gameId = `${game.player1.id}_vs_${game.player2.id}`;

                fastify.log.info(`${disconnectedId} desconectado de partida con ${opponentId}`);
                
                // Solo enviar opponent_disconnected si el juego no terminó normalmente
                if (!finishedGames.has(gameId) && opponentConnection && opponentConnection.socket) {
                    opponentConnection.socket.send(JSON.stringify({
                        type: 'opponent_disconnected',
                        message: 'Tu oponente se ha desconectado'
                    }));
                }
                
                activeGames.splice(gameIdx, 1);
                
                // Update metrics
                if (!finishedGames.has(gameId)) {
                    gameEndCounter.inc();
                }
                activeGamesGauge.set(activeGames.length);
            }
        });

        connection.socket.on('error', error => {
            const errorId = playerName || tempConnectionId;
            fastify.log.error(`Error WebSocket ${errorId}: ${error.message}`);

            // Limpiar estado en caso de error
            if (waitingPlayerSocket && waitingPlayerSocket.connection === connection) {
                clearWaitingPlayer('error');
            }

            const gameIdx = activeGames.findIndex(g => g.player1.connection === connection || g.player2.connection === connection);
            if (gameIdx !== -1) {
                const game = activeGames[gameIdx];
                const opponentConnection = (game.player1.connection === connection) ? game.player2.connection : game.player1.connection;
                
                if (opponentConnection && opponentConnection.socket) {
                    opponentConnection.socket.send(JSON.stringify({
                        type: 'opponent_disconnected',
                        message: 'Tu oponente se desconectó por error'
                    }));
                }
                activeGames.splice(gameIdx, 1);
            }
        });
    });
});


// Health check endpoint
fastify.get('/health', async (request, reply) => {
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        websocketConnections: websocketConnections.get(),
        activeGames: activeGamesGauge.get(),
        playersWaiting: playersWaitingGauge.get()
    };
});

// Simple GET version for health checks
fastify.get('/greet', async (request, reply) => {
    return {
        message: '¡Hola! Servidor funcionando correctamente.'
    };
});

// =========================
// RUTAS DE AUTENTICACIÓN
// =========================

// Registro de usuario
fastify.post('/api/register', async (request, reply) => {
    try {
        const { username, password, email } = request.body;
        
        // Validaciones
        if (!username || !password) {
            return reply.code(400).send({ error: 'Username y password son obligatorios' });
        }
        
        if (username.length < 3 || username.length > 20) {
            return reply.code(400).send({ error: 'El username debe tener entre 3 y 20 caracteres' });
        }
        
        if (password.length < 6) {
            return reply.code(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        // Verificar si el usuario ya existe
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            return reply.code(409).send({ error: 'Username o email ya existen' });
        }
        
        // Hash de la contraseña
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Crear usuario
        const userId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
                [username, passwordHash, email || null],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Crear estadísticas iniciales para el usuario
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO user_stats (user_id) VALUES (?)',
                [userId],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Generar JWT token
        const token = jwt.sign(
            { userId, username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        return reply.code(201).send({
            message: 'Usuario registrado exitosamente',
            user: { id: userId, username, email },
            token
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Login de usuario
fastify.post('/api/login', async (request, reply) => {
    try {
        const { username, password } = request.body;
        
        if (!username || !password) {
            return reply.code(400).send({ error: 'Username y password son obligatorios' });
        }
        
        // Buscar usuario
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id, username, password_hash, email FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!user) {
            return reply.code(401).send({ error: 'Credenciales inválidas' });
        }
        
        // Verificar contraseña
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            return reply.code(401).send({ error: 'Credenciales inválidas' });
        }
        
        // Generar JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        return reply.code(200).send({
            message: 'Login exitoso',
            user: { id: user.id, username: user.username, email: user.email },
            token
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Verificar token (para validar autenticación en frontend)
fastify.get('/api/verify', { preHandler: authenticate }, async (request, reply) => {
    return reply.code(200).send({
        valid: true,
        user: request.user
    });
});

// Obtener perfil del usuario autenticado
fastify.get('/api/profile', { preHandler: authenticate }, async (request, reply) => {
    try {
        const userStats = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM user_stats WHERE user_id = ?',
                [request.user.id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        return reply.code(200).send({
            user: request.user,
            stats: userStats || {
                games_played: 0,
                games_won: 0,
                games_lost: 0,
                total_score: 0,
                highest_score: 0,
                win_streak: 0,
                best_win_streak: 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Guardar resultado de juego
fastify.post('/api/game-result', { preHandler: authenticate }, async (request, reply) => {
    try {
        const { opponent, score, opponentScore, gameMode, duration } = request.body;
        const userId = request.user.id;
        
        // Para el modo single-player, el oponente es el mismo usuario
        const opponentId = userId; // Ya que el matchmaking ahora es contra uno mismo
        
        const isWin = score > opponentScore;
        
        // Guardar el juego
        const gameId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO games (player1_id, player2_id, winner_id, player1_score, player2_score, game_mode, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, opponentId, isWin ? userId : null, score, opponentScore, gameMode || 'classic', duration || 0],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Actualizar estadísticas del usuario
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE user_stats SET 
                    games_played = games_played + 1,
                    games_won = games_won + ?,
                    games_lost = games_lost + ?,
                    total_score = total_score + ?,
                    highest_score = MAX(highest_score, ?),
                    win_streak = CASE WHEN ? = 1 THEN win_streak + 1 ELSE 0 END,
                    best_win_streak = MAX(best_win_streak, CASE WHEN ? = 1 THEN win_streak + 1 ELSE win_streak END),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [isWin ? 1 : 0, isWin ? 0 : 1, score, score, isWin ? 1 : 0, isWin ? 1 : 0, userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        return reply.code(200).send({
            message: 'Resultado de juego guardado',
            gameId,
            result: isWin ? 'win' : 'loss'
        });
        
    } catch (error) {
        console.error('Error guardando resultado de juego:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Obtener historial de juegos del usuario
fastify.get('/api/game-history', { preHandler: authenticate }, async (request, reply) => {
    try {
        const games = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    g.*,
                    u1.username as player1_name,
                    u2.username as player2_name,
                    w.username as winner_name
                FROM games g
                LEFT JOIN users u1 ON g.player1_id = u1.id
                LEFT JOIN users u2 ON g.player2_id = u2.id
                LEFT JOIN users w ON g.winner_id = w.id
                WHERE g.player1_id = ? OR g.player2_id = ?
                ORDER BY g.created_at DESC
                LIMIT 50
            `, [request.user.id, request.user.id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        return reply.code(200).send({ games });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Ruta HTTP de ejemplo
fastify.post('/greet', async (request, reply) => {
    const { username } = request.body;
    if (username && typeof username === 'string' && username.trim()) {
        return reply.code(200).send({
            message: `¡Hola, ${username}! Servidor funcionando correctamente.`
        });
    } else {
        return reply.code(400).send({
            error: 'Nombre de usuario requerido'
        });
    }
});

// Iniciar servidor
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        fastify.log.info('🚀 Servidor WebSocket funcionando en puerto 3000');
        fastify.log.info('📡 WebSocket disponible en: ws://localhost:3000/ws');
        fastify.log.info('🌐 HTTP API disponible en: http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

if (require.main === module) {
    start();
}

module.exports = start;