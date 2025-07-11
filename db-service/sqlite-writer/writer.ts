import Redis from 'ioredis';
import sqlite3 from 'sqlite3';

// Conexión Redis
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

// Conexión SQLite
const db = new sqlite3.Database('/app/data/app.db', (err) => {
  if (err) {
    console.error('❌ Error abriendo SQLite:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite');
});

// Procesar mensajes de Redis
const queueName = 'sqlite_write_queue';

async function listenForWrites() {
  console.log(`📥 Escuchando en la cola Redis: ${queueName}...`);

  while (true) {
    try {
      const result = await redis.blpop(queueName, 0); // [key, value]
      if (!result) continue; // seguridad
      const payload = JSON.parse(result[1]);

      
      console.log('📄 Recibido:', payload);

      db.run(payload.sql, payload.params || [], function (err) {
        if (err) {
          console.error('❌ Error al ejecutar SQL:', err.message);
        } else {
          console.log(`✅ SQL ejecutado. Filas afectadas: ${this.changes}`);
        }
      });

    } catch (err) {
      console.error('⚠️ Error en bucle principal:', err);
    }
  }
}

listenForWrites();
