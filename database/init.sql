-- Inicialización de la base de datos SQLite para el proyecto Transcendance
-- Tabla para usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Tabla para partidas/juegos
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_id INTEGER,
    game_duration INTEGER, -- duración en segundos
    status VARCHAR(20) DEFAULT 'pending', -- pending, playing, finished, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
);

-- Tabla para estadísticas de usuarios
CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla para sesiones de usuario (opcional, para manejo de sesiones)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Datos de ejemplo (opcional, para testing)
INSERT OR IGNORE INTO users (username, email, password_hash) VALUES 
('admin', 'admin@transcendance.com', '$2b$10$example.hash.for.admin.user'),
('player1', 'player1@example.com', '$2b$10$example.hash.for.player1'),
('player2', 'player2@example.com', '$2b$10$example.hash.for.player2');

-- Inicializar estadísticas para usuarios de ejemplo
INSERT OR IGNORE INTO user_stats (user_id) 
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM user_stats);

