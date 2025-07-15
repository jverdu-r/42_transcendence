import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite'; // Importar Database de sqlite
import path from 'path';

// Asegúrate de que el directorio 'data' exista en la raíz del proyecto para la persistencia.
// Docker montará un volumen aquí.
const DB_PATH = path.join(__dirname, '../data/app.db');

export async function openDb(): Promise<Database> { // Especificar tipo de retorno
    return open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
}

export async function initializeDb() {
    const db = await openDb();
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER,
                player2_id INTEGER,
                score1 INTEGER DEFAULT 0,
                score2 INTEGER DEFAULT 0,
                status TEXT NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                winner_id INTEGER,
                winner_name TEXT,
                game_mode TEXT DEFAULT 'local',
                duration INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                game_id INTEGER,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Base de datos inicializada y tablas creadas (si no existían).');
    } finally {
        await db.close();
    }
}
