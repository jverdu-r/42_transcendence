// Script para poblar la base de datos con datos de prueba
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Conectar a la base de datos
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database/transcendance.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error conectando a SQLite:', err.message);
        return;
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Datos de prueba
const testUsers = [
    { username: 'jugador1', email: 'jugador1@test.com', password: 'password123' },
    { username: 'jugador2', email: 'jugador2@test.com', password: 'password123' },
    { username: 'jugador3', email: 'jugador3@test.com', password: 'password123' },
    { username: 'campeón', email: 'campeon@test.com', password: 'password123' },
    { username: 'novato', email: 'novato@test.com', password: 'password123' }
];

async function createTestData() {
    console.log('🔄 Creando datos de prueba...');
    
    try {
        // Crear usuarios de prueba
        for (const user of testUsers) {
            const passwordHash = await bcrypt.hash(user.password, 10);
            
            const userId = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO users (username, password_hash, email) VALUES (?, ?, ?)',
                    [user.username, passwordHash, user.email],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            
            if (userId) {
                // Crear estadísticas para cada usuario
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)',
                        [userId],
                        function(err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                console.log(`✅ Usuario creado: ${user.username} (ID: ${userId})`);
            }
        }
        
        // Poblar con estadísticas de ejemplo
        const statsUpdates = [
            { username: 'campeón', games_played: 50, games_won: 40, total_score: 2500 },
            { username: 'jugador1', games_played: 30, games_won: 20, total_score: 1800 },
            { username: 'jugador2', games_played: 25, games_won: 15, total_score: 1200 },
            { username: 'jugador3', games_played: 20, games_won: 8, total_score: 800 },
            { username: 'novato', games_played: 10, games_won: 2, total_score: 200 }
        ];
        
        for (const stat of statsUpdates) {
            await new Promise((resolve, reject) => {
                db.run(`
                    UPDATE user_stats 
                    SET games_played = ?, 
                        games_won = ?, 
                        games_lost = ?, 
                        total_score = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = (SELECT id FROM users WHERE username = ?)
                `, [
                    stat.games_played,
                    stat.games_won,
                    stat.games_played - stat.games_won,
                    stat.total_score,
                    stat.username
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log(`✅ Estadísticas actualizadas para: ${stat.username}`);
        }
        
        console.log('🎉 Datos de prueba creados exitosamente!');
        console.log('📊 Ahora puedes probar el ranking en tu aplicación.');
        
    } catch (error) {
        console.error('❌ Error creando datos de prueba:', error);
    } finally {
        db.close();
    }
}

createTestData();

