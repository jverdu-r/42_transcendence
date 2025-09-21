#!/bin/bash

# Script temporal para inicializar la base de datos sin Vault
DB_FILE="/Users/diegorubio/data/transcendence/sqlite/app.db"

echo "🔧 Inicializando base de datos SQLite..."

# Crear las tablas y insertar usuarios
sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE IF NOT EXISTS users ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username TEXT UNIQUE NOT NULL, 
    email TEXT UNIQUE NOT NULL, 
    password_hash TEXT, 
    google_id TEXT UNIQUE, 
    intra_id TEXT UNIQUE, 
    is_active BOOLEAN DEFAULT 1, 
    is_admin BOOLEAN DEFAULT 0, 
    last_login DATETIME, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles ( 
    user_id INTEGER PRIMARY KEY, 
    avatar_url TEXT, 
    language TEXT DEFAULT 'es', 
    notifications TEXT DEFAULT 'true', 
    doubleFactor BOOLEAN DEFAULT 'false', 
    doubleFactorSecret TEXT DEFAULT NULL, 
    difficulty TEXT DEFAULT 'normal', 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO users (id, username, email, password_hash, is_active, is_admin, created_at) VALUES 
    (1, 'Manu', 'ardeiro@outlook.com', '$2b$12$U.2UHoDtA3/oeQHQIrznVuBokjoVRTfdv2zM7Qv7E3H0AldZ1Qhbe', 1, 1, datetime('now', '-1 days')),
    (2, 'Ardeiro', 'ardeiro@gmail.com', '$2b$12$/1r9td3OkeutXq16OoALGuUeEO/nCCX4AwLvFJ2ZYZNWEuzkMyzEG', 1, 1, datetime('now', '-2 days')),
    (3, 'HAL7000', 'manuel.ardeiro@gmail.com', '$2b$12$RagfU1ULf9zvoZBRqcQ5XOb.EgZybLX2mfr9W3gaKYiWiTUzi5sC6', 1, 1, datetime('now', '-3 days')),
    (4, 'Verdu', 'jorge.verdu.ruiz@gmail.com', '$2b$12$fmkXJsqahw1S9bM8fQ6G3uhnDCfrLZlUwvKlKmr5SASA7AbX6kQZq', 1, 1, datetime('now', '-4 days')),
    (5, 'David', 'david.aparicio247@hotmail.com', '$2b$12$iASlBV76WELxwwjOUmWeM.FjqHuDhkWQEEbTBBNRZb4B6/tEfyCmC', 1, 1, datetime('now', '-5 days')),
    (6, 'ManuFern', 'manufern@student.42madrid.com', '$2b$12$1Mqudh5FrajQHKxtBOG26O/dL47xnZrbbQ8HjcipegON1NQdMFXou', 1, 1, datetime('now', '-6 days')),
    (7, 'Diego', 'diegorubiomorato@gmail.com', '$2b$12$SC.8HYivrjOrLQQscZz7SuBNY4vodoHRh.cWXQ0htB/vBBJxblJPa', 1, 1, datetime('now', '-7 days'));

INSERT OR IGNORE INTO user_profiles (user_id, avatar_url, language, notifications, doubleFactor, difficulty) VALUES 
    (1, NULL, 'es', 'true', 'false', 'normal'),
    (2, NULL, 'gl', 'true', 'false', 'normal'),
    (3, NULL, 'en', 'true', 'false', 'normal'),
    (4, NULL, 'es', 'true', 'false', 'normal'),
    (5, NULL, 'en', 'true', 'false', 'normal'),
    (6, NULL, 'es', 'true', 'false', 'normal'),
    (7, NULL, 'en', 'true', 'false', 'normal');

EOF

echo "✅ Base de datos inicializada"
echo "📊 Usuarios en la base de datos:"
sqlite3 "$DB_FILE" "SELECT id, username, email FROM users;"
