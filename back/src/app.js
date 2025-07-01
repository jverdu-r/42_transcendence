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
        
        CREATE TABLE IF NOT EXISTS user_stats_by_mode (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_mode TEXT NOT NULL,
            games_played INTEGER DEFAULT 0,
            games_won INTEGER DEFAULT 0,
            games_lost INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 0,
            highest_score INTEGER DEFAULT 0,
            win_streak INTEGER DEFAULT 0,
            best_win_streak INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, game_mode)
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
            // Ejecutar migraciones para agregar columnas faltantes
            runMigrations();
        }
    });
}

// Función para ejecutar migraciones de base de datos
function runMigrations() {
    console.log('🔄 Ejecutando migraciones de base de datos...');
    
    // Migración 1: Agregar columnas faltantes a la tabla games
    db.all("PRAGMA table_info(games)", (err, gamesColumns) => {
        if (err) {
            console.error('Error verificando estructura de tabla games:', err.message);
            return;
        }
        
        const hasGameModeColumn = gamesColumns.some(col => col.name === 'game_mode');
        const hasDurationColumn = gamesColumns.some(col => col.name === 'duration');
        
        if (!hasGameModeColumn) {
            console.log('📝 Agregando columna game_mode a la tabla games...');
            db.run("ALTER TABLE games ADD COLUMN game_mode TEXT DEFAULT 'classic'", (err) => {
                if (err) {
                    console.error('Error agregando columna game_mode:', err.message);
                } else {
                    console.log('✅ Columna game_mode agregada exitosamente');
                }
            });
        }
        
        if (!hasDurationColumn) {
            console.log('📝 Agregando columna duration a la tabla games...');
            db.run("ALTER TABLE games ADD COLUMN duration INTEGER DEFAULT 0", (err) => {
                if (err) {
                    console.error('Error agregando columna duration:', err.message);
                } else {
                    console.log('✅ Columna duration agregada exitosamente');
                }
            });
        }
    });
    
    // Migración 2: Agregar columnas faltantes a la tabla user_stats
    db.all("PRAGMA table_info(user_stats)", (err, statsColumns) => {
        if (err) {
            console.error('Error verificando estructura de tabla user_stats:', err.message);
            return;
        }
        
        const requiredColumns = [
            { name: 'highest_score', type: 'INTEGER DEFAULT 0' },
            { name: 'win_streak', type: 'INTEGER DEFAULT 0' },
            { name: 'best_win_streak', type: 'INTEGER DEFAULT 0' }
        ];
        
        requiredColumns.forEach(requiredCol => {
            const hasColumn = statsColumns.some(col => col.name === requiredCol.name);
            if (!hasColumn) {
                console.log(`📝 Agregando columna ${requiredCol.name} a la tabla user_stats...`);
                db.run(`ALTER TABLE user_stats ADD COLUMN ${requiredCol.name} ${requiredCol.type}`, (err) => {
                    if (err) {
                        console.error(`Error agregando columna ${requiredCol.name}:`, err.message);
                    } else {
                        console.log(`✅ Columna ${requiredCol.name} agregada exitosamente`);
                    }
                });
            }
        });
    });
    
    console.log('✅ Migraciones completadas');
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
const waitingPlayersQueue = []; // Queue of players waiting for matches

// Enhanced user-based matchmaking function
function matchPlayersByUserPreference(newPlayer) {
    if (waitingPlayersQueue.length === 0) {
        // No players waiting, add to queue
        waitingPlayersQueue.push(newPlayer);
        console.log(`🎮 Jugador ${newPlayer.id} agregado a la cola de espera`);
        return null;
    }

    // Find best match based on user preferences
    let bestMatch = null;
    let bestMatchIndex = -1;
    let bestScore = -1;
    
    for (let i = 0; i < waitingPlayersQueue.length; i++) {
        const waitingPlayer = waitingPlayersQueue[i];
        let matchScore = 0;
        
        // Primary criteria: same game mode (mandatory)
        if (waitingPlayer.gameMode !== newPlayer.gameMode) {
            continue; // Skip if game modes don't match
        }
        matchScore += 100; // Base score for matching game mode
        
        // Secondary criteria: user preferences
        if (newPlayer.userPreferences && waitingPlayer.userPreferences) {
            // Match by skill level if available
            if (newPlayer.userPreferences.skill_level === waitingPlayer.userPreferences.skill_level) {
                matchScore += 50;
            }
            
            // Prefer authenticated users if both are authenticated
            if (newPlayer.userPreferences.authenticated && waitingPlayer.userPreferences.authenticated) {
                matchScore += 30;
            }
            
            // Consider waiting time (prefer players who have been waiting longer)
            const waitTime = Date.now() - waitingPlayer.joinTime;
            if (waitTime > 10000) { // More than 10 seconds
                matchScore += Math.min(20, waitTime / 1000); // Up to 20 bonus points
            }
        }
        
        if (matchScore > bestScore) {
            bestMatch = waitingPlayer;
            bestMatchIndex = i;
            bestScore = matchScore;
        }
    }
    
    if (bestMatch) {
        // Remove matched player from queue
        waitingPlayersQueue.splice(bestMatchIndex, 1);
        
        console.log(`🤝 Emparejando ${bestMatch.id} con ${newPlayer.id} (puntuación de compatibilidad: ${bestScore})`);
        
        // Create game
        const game = {
            player1: bestMatch,
            player2: newPlayer
        };
        
        activeGames.push(game);
        
        // Notify both players with proper usernames
        bestMatch.connection.socket.send(JSON.stringify({
            type: 'opponentFound',
            opponent: newPlayer.id, // Este es el nombre de usuario real ahora
            message: `¡Oponente encontrado! Jugando contra ${newPlayer.id}`,
            gameMode: newPlayer.gameMode,
            isHost: true
        }));
        
        newPlayer.connection.socket.send(JSON.stringify({
            type: 'opponentFound',
            opponent: bestMatch.id, // Este es el nombre de usuario real ahora
            message: `¡Oponente encontrado! Jugando contra ${bestMatch.id}`,
            gameMode: newPlayer.gameMode,
            isHost: false
        }));
        
        return game;
    } else {
        // No suitable match found, add to queue
        waitingPlayersQueue.push(newPlayer);
        console.log(`🎮 Jugador ${newPlayer.id} agregado a la cola de espera (no se encontró emparejamiento adecuado)`);
        return null;
    }
}

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
    waitingPlayerSocket = null; // Clear current waiting player
}

// WebSocket Handler
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        const tempConnectionId = `ConexionWS_${Math.random().toString(36).substring(7)}`;
        fastify.log.info(`Nueva conexión WebSocket: ${tempConnectionId}`);
        
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

                    // Use new user-based matchmaking system
                    const newPlayer = { 
                        id: playerName, 
                        connection: connection,
                        gameMode: data.gameMode || 'classic',
                        joinTime: Date.now(),
                        userPreferences: data.userPreferences || {}
                    };
                    
                    const match = matchPlayersByUserPreference(newPlayer);
                    
                    if (!match) {
                        // Player added to queue, send waiting message
                        connection.socket.send(JSON.stringify({
                            type: 'waiting',
                            message: `Buscando oponente para ${playerName}...`
                        }));
                    }
                }
                // Manejo de mensajes de juego
                else if (['game_sync', 'game_start', 'game_end', 'player_input', 'individual_game_result'].includes(data.type)) {
                    const game = activeGames.find(g => (g.player1.connection === connection || g.player2.connection === connection));
                    if (game) {
                        const isPlayer1 = (game.player1.connection === connection);
                        const opponentConnection = isPlayer1 ? game.player2.connection : game.player1.connection;
                        
                        // Para game_sync, enviar los datos originales sin modificar
                        if (data.type === 'game_sync') {
                            if (opponentConnection && opponentConnection.socket) {
                                // Enviar datos originales - cada cliente maneja su propia perspectiva
                                opponentConnection.socket.send(JSON.stringify(data));
                            }
                        } else {
                            // Para otros tipos de mensaje, reenviar sin modificar
                            if (opponentConnection && opponentConnection.socket) {
                                opponentConnection.socket.send(message.toString());
                            }
                        }
                        
                        // Si es game_end, marcar el juego como terminado y guardar resultados
                        if (data.type === 'game_end') {
                            const gameIdx = activeGames.findIndex(g => g === game);
                            if (gameIdx !== -1) {
                                // Marcar como terminado para evitar mensajes de desconexión
                                const gameId = `${game.player1.id}_vs_${game.player2.id}`;
                                finishedGames.add(gameId);
                                
                                fastify.log.info(`Juego terminado: ${game.player1.id} vs ${game.player2.id}, ganador: ${data.winner}`);
                                
                                // Guardar automáticamente el resultado del juego online
                                saveOnlineGameResult({
                                    player1_name: data.player1_name || game.player1.id,
                                    player2_name: data.player2_name || game.player2.id,
                                    player1_score: data.score1 || 0,
                                    player2_score: data.score2 || 0,
                                    winner_name: data.winner,
                                    gameMode: data.gameMode || game.player1.gameMode || 'classic',
                                    duration: data.duration || 0
                                }).catch(error => {
                                    fastify.log.error('Error guardando resultado de juego online:', error);
                                });
                                
                                // Remover de juegos activos
                                activeGames.splice(gameIdx, 1);
                                
                                // Limpiar la marca después de un tiempo para evitar acumulación
                                setTimeout(() => {
                                    finishedGames.delete(gameId);
                                }, 30000); // 30 segundos
                            }
                        }
                        
                        // Si es individual_game_result, guardar el resultado de este jugador específico
                        if (data.type === 'individual_game_result') {
                            const gameIdx = activeGames.findIndex(g => g === game);
                            if (gameIdx !== -1) {
                                const gameId = `${game.player1.id}_vs_${game.player2.id}`;
                                
                                fastify.log.info(`Resultado individual recibido de ${data.player_name}: ${data.did_i_win ? 'ganó' : 'perdió'} contra ${data.opponent_name}`);
                                
                                // Guardar solo el resultado de este jugador específico
                                saveIndividualPlayerResult({
                                    player_name: data.player_name,
                                    opponent_name: data.opponent_name,
                                    my_score: data.my_score,
                                    opponent_score: data.opponent_score,
                                    did_i_win: data.did_i_win,
                                    gameMode: data.gameMode || 'classic',
                                    duration: data.duration || 0,
                                    is_host: data.is_host
                                }).catch(error => {
                                    fastify.log.error(`Error guardando resultado individual para ${data.player_name}:`, error);
                                });
                                
                                // Marcar el juego como terminado si aún no se ha hecho
                                if (!finishedGames.has(gameId)) {
                                    finishedGames.add(gameId);
                                    
                                    // Remover de juegos activos solo si ambos jugadores han enviado resultados
                                    // Por simplicidad, removemos inmediatamente
                                    activeGames.splice(gameIdx, 1);
                                    
                                    // Limpiar la marca después de un tiempo
                                    setTimeout(() => {
                                        finishedGames.delete(gameId);
                                    }, 30000);
                                }
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

            // Limpiar jugador en espera
            if (waitingPlayerSocket && waitingPlayerSocket.connection === connection) {
                fastify.log.info(`${waitingPlayerSocket.id} abandonó la cola de espera`);
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
        activeGames: activeGames.length,
        playersWaiting: waitingPlayerSocket ? 1 : 0
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
        
        // Adaptar nombres de campos para el frontend
        const defaultStats = {
            games_played: 0,
            games_won: 0,
            games_lost: 0,
            total_score: 0,
            highest_score: 0,
            win_streak: 0,
            best_win_streak: 0
        };
        
        const stats = userStats || defaultStats;
        
        // Calcular win_rate
        const winRate = stats.games_played > 0 ? 
            Math.round((stats.games_won / stats.games_played) * 100) : 0;
        
        // Para global_ranking, podemos calcularlo basado en total_score
        const globalRanking = await new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) + 1 as ranking FROM user_stats WHERE total_score > ?',
                [stats.total_score],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.ranking : 1);
                }
            );
        });
        
        return reply.code(200).send({
            id: request.user.id,
            username: request.user.username,
            email: request.user.email,
            created_at: request.user.created_at || new Date().toISOString(),
            stats: {
                // Nombres que espera el frontend
                matches_played: stats.games_played,
                wins: stats.games_won,
                losses: stats.games_lost,
                win_rate: winRate,
                total_score: stats.total_score,
                global_ranking: globalRanking
            }
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Guardar resultado de juego (single-player)
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
        await updateUserStats(userId, isWin, score);
        
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

// Nueva función para actualizar estadísticas de usuario
async function updateUserStats(userId, isWin, score) {
    return new Promise((resolve, reject) => {
        // Primero verificar si el usuario tiene estadísticas
        db.get('SELECT * FROM user_stats WHERE user_id = ?', [userId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!row) {
                // Crear estadísticas iniciales si no existen
                db.run(
                    'INSERT INTO user_stats (user_id, games_played, games_won, games_lost, total_score, highest_score, win_streak, best_win_streak) VALUES (?, 1, ?, ?, ?, ?, ?, ?)',
                    [userId, isWin ? 1 : 0, isWin ? 0 : 1, score, score, isWin ? 1 : 0, isWin ? 1 : 0],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            } else {
                // Actualizar estadísticas existentes
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
            }
        });
    });
}

// Función auxiliar para guardar resultados de juegos online (para uso interno)
async function saveOnlineGameResult(gameData) {
    try {
        const { 
            player1_name, 
            player2_name, 
            player1_score, 
            player2_score, 
            winner_name, 
            gameMode, 
            duration 
        } = gameData;
        
        // Buscar IDs de ambos jugadores por username
        const player1 = await new Promise((resolve, reject) => {
            db.get('SELECT id, username FROM users WHERE username = ?', [player1_name], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        const player2 = await new Promise((resolve, reject) => {
            db.get('SELECT id, username FROM users WHERE username = ?', [player2_name], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!player1 || !player2) {
            console.warn(`No se encontraron uno o ambos jugadores: ${player1_name}, ${player2_name}`);
            return null;
        }
        
        const winnerId = winner_name === player1_name ? player1.id : 
                        winner_name === player2_name ? player2.id : null;
        
        // Guardar el juego en la base de datos
        const gameId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO games (player1_id, player2_id, winner_id, player1_score, player2_score, game_mode, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [player1.id, player2.id, winnerId, player1_score, player2_score, gameMode || 'classic', duration || 0],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Actualizar estadísticas de ambos jugadores
        const player1Won = winnerId === player1.id;
        const player2Won = winnerId === player2.id;
        
        await updateUserStats(player1.id, player1Won, player1_score);
        await updateUserStats(player2.id, player2Won, player2_score);
        
        console.log(`✅ Online game result saved automatically: ${player1_name} (${player1_score}) vs ${player2_name} (${player2_score}), winner: ${winner_name}`);
        
        return {
            gameId,
            player1_result: player1Won ? 'win' : 'loss',
            player2_result: player2Won ? 'win' : 'loss'
        };
        
    } catch (error) {
        console.error('Error guardando resultado de juego online automáticamente:', error);
        throw error;
    }
}

// Función para guardar el resultado individual de un jugador
async function saveIndividualPlayerResult(gameData) {
    try {
        const { 
            player_name, 
            opponent_name, 
            my_score, 
            opponent_score, 
            did_i_win, 
            gameMode, 
            duration,
            is_host 
        } = gameData;
        
        console.log(`💾 Guardando resultado individual para ${player_name}: ${did_i_win ? 'GANÓ' : 'PERDIÓ'} contra ${opponent_name}`);
        
        // Buscar IDs de ambos jugadores por username
        const player = await new Promise((resolve, reject) => {
            db.get('SELECT id, username FROM users WHERE username = ?', [player_name], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        const opponent = await new Promise((resolve, reject) => {
            db.get('SELECT id, username FROM users WHERE username = ?', [opponent_name], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!player) {
            console.warn(`No se encontró el jugador: ${player_name}`);
            return null;
        }
        
        if (!opponent) {
            console.warn(`No se encontró el oponente: ${opponent_name}`);
            return null;
        }
        
        // Determinar quién es player1 y player2 basado en is_host
        const winnerId = did_i_win ? player.id : opponent.id;
        let player1_id, player2_id, player1_score, player2_score;
        
        if (is_host) {
            // Este jugador es el host (player1)
            player1_id = player.id;
            player2_id = opponent.id;
            player1_score = my_score;
            player2_score = opponent_score;
        } else {
            // Este jugador es el invitado (player2)
            player1_id = opponent.id;
            player2_id = player.id;
            player1_score = opponent_score;
            player2_score = my_score;
        }
        
        // Verificar si el juego ya existe (para evitar duplicados) - Verificación más estricta
        const existingGame = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM games WHERE player1_id = ? AND player2_id = ? AND player1_score = ? AND player2_score = ? AND created_at > datetime("now", "-5 minutes")',
                [player1_id, player2_id, player1_score, player2_score],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (existingGame) {
            console.log(`🚫 Juego duplicado detectado (ID: ${existingGame.id}), no se guardará ni actualizarán estadísticas`);
            return { gameId: existingGame.id, result: did_i_win ? 'win' : 'loss' };
        }
        
        // Guardar el juego en la base de datos
        const gameId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO games (player1_id, player2_id, winner_id, player1_score, player2_score, game_mode, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [player1_id, player2_id, winnerId, player1_score, player2_score, gameMode || 'classic', duration || 0],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Actualizar estadísticas SOLO del jugador actual
        await updateUserStats(player.id, did_i_win, my_score);
        
        console.log(`✅ Resultado individual guardado: ${player_name} ${did_i_win ? 'ganó' : 'perdió'} contra ${opponent_name} (GameID: ${gameId})`);
        
        return {
            gameId,
            result: did_i_win ? 'win' : 'loss'
        };
        
    } catch (error) {
        console.error('Error guardando resultado individual:', error);
        throw error;
    }
}

// Nuevo endpoint para resultados de juegos online (ambos jugadores)
fastify.post('/api/online-game-result', async (request, reply) => {
    try {
        const result = await saveOnlineGameResult(request.body);
        
        if (!result) {
            return reply.code(400).send({ error: 'Uno o ambos jugadores no encontrados' });
        }
        
        return reply.code(200).send({
            message: 'Resultado de juego online guardado',
            ...result
        });
        
    } catch (error) {
        console.error('Error guardando resultado de juego online:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Endpoint para recibir resultados individuales de jugadores online
fastify.post('/api/individual-game-result', async (request, reply) => {
    try {
        const result = await saveIndividualPlayerResult(request.body);
        
        if (!result) {
            return reply.code(400).send({ error: 'Jugador u oponente no encontrado' });
        }
        
        return reply.code(200).send({
            message: 'Resultado individual guardado exitosamente',
            ...result
        });
        
    } catch (error) {
        console.error('Error guardando resultado individual:', error);
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
                    u1.username as player1_username,
                    u2.username as player2_username,
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
        
        // Transform games to match expected format
        const transformedGames = games.map(game => ({
            id: game.id,
            player1_id: game.player1_id,
            player2_id: game.player2_id,
            player1_username: game.player1_username,
            player2_username: game.player2_username,
            player1_score: game.player1_score,
            player2_score: game.player2_score,
            winner_id: game.winner_id,
            played_at: game.created_at,
            points_change: game.player1_score // Simplified points calculation
        }));
        
        return reply.code(200).send({ games: transformedGames });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Obtener ranking global
fastify.get('/api/rankings', { preHandler: authenticate }, async (request, reply) => {
    try {
        // Obtener todos los usuarios con sus estadísticas ordenados por puntuación total
        const rankings = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.created_at,
                    COALESCE(s.games_played, 0) as matches_played,
                    COALESCE(s.games_won, 0) as matches_won,
                    COALESCE(s.games_lost, 0) as matches_lost,
                    COALESCE(s.total_score, 0) as points,
                    CASE 
                        WHEN COALESCE(s.games_played, 0) > 0 
                        THEN ROUND((CAST(s.games_won AS FLOAT) / s.games_played) * 100, 2)
                        ELSE 0.0
                    END as win_rate
                FROM users u
                LEFT JOIN user_stats s ON u.id = s.user_id
                ORDER BY COALESCE(s.total_score, 0) DESC, COALESCE(s.games_won, 0) DESC
                LIMIT 100
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        // Añadir ranking position a cada jugador
        const rankingsWithPosition = rankings.map((player, index) => ({
            ...player,
            global_ranking: index + 1
        }));
        
        // Encontrar la posición del usuario actual
        const currentUserRank = rankingsWithPosition.find(p => p.user_id === request.user.id)?.global_ranking || null;
        
        return reply.code(200).send({
            rankings: rankingsWithPosition,
            total_players: rankings.length,
            current_user_rank: currentUserRank
        });
    } catch (error) {
        console.error('Error obteniendo ranking:', error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Obtener modos de juego disponibles
fastify.get('/api/game-modes', { preHandler: authenticate }, async (request, reply) => {
    try {
        // Por ahora solo tenemos el modo clásico, pero podemos expandir esto
        const modes = [
            { mode: 'all', description: 'Todos los modos' },
            { mode: 'classic', description: 'Pong Clásico' },
            { mode: '1v1', description: '1 vs 1' }
        ];
        
        return reply.code(200).send({ modes });
    } catch (error) {
        console.error('Error obteniendo modos de juego:', error);
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

