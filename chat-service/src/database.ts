import Database from 'better-sqlite3';
import path from 'path';

// Ruta a la base de datos compartida
const DB_PATH = '/data/sqlite/app.db';

export interface ChatMessage {
    id?: number;
    sender_id: number;
    receiver_id?: number | null;  // NULL para mensajes globales
    message: string;
    sent_at?: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
}

class ChatDatabase {
    private db: any = null;

    async connect(): Promise<void> {
        try {
            this.db = new Database(DB_PATH);

            // Verificar que la tabla existe
            this.createTables();
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error);
            throw error;
        }
    }

    private createTables(): void {
        // Crear tabla de mensajes si no existe
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NULL,
                message TEXT NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async saveMessage(senderId: number, message: string): Promise<number> {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO chat_messages (sender_id, message)
                VALUES (?, ?)
            `);
            
            const result = stmt.run(senderId, message);
            const messageId = result.lastInsertRowid as number;
            
            return messageId;
        } catch (error) {
            console.error('❌ Error guardando mensaje en SQLite:', error);
            throw error;
        }
    }

    async getRecentMessages(limit: number = 50): Promise<any[]> {
        try {
            const stmt = this.db.prepare(`
                SELECT id, sender_id, message, sent_at
                FROM chat_messages
                ORDER BY sent_at DESC
                LIMIT ?
            `);
            
            const rows = stmt.all(limit) as any[];
            
            // Convertir el resultado de SQLite al formato esperado por el frontend
            const recentMessages = rows.reverse().map(row => ({
                id: row.id,
                userId: row.sender_id,
                username: `Usuario${row.sender_id}`,
                content: row.message,
                timestamp: row.sent_at
            }));

            return recentMessages;
        } catch (error) {
            console.error('❌ Error obteniendo mensajes de SQLite:', error);
            return [];
        }
    }

    async getUserById(userId: number): Promise<User | null> {
        try {
            // Mock de usuario
            return {
                id: userId,
                username: `Usuario${userId}`,
                email: `usuario${userId}@test.com`
            };
        } catch (error) {
            console.error('❌ Error obteniendo usuario:', error);
            return null;
        }
    }

    async getAllUsers(): Promise<User[]> {
        try {
            // Mock de usuarios
            return [
                { id: 1, username: 'Usuario1', email: 'user1@test.com' },
                { id: 2, username: 'Usuario2', email: 'user2@test.com' },
            ];
        } catch (error) {
            console.error('❌ Error obteniendo usuarios:', error);
            return [];
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            await this.db.close();
        }
    }
}

export const chatDatabase = new ChatDatabase();
