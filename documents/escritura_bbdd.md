# 🛡️ Acceso a la Base de Datos (SQLite + Redis)

## 📖 Lectura

La lectura de la base de datos se hace como hasta ahora, directamente con `SELECT` o usando `sqlite` o `sqlite3`.

---

## ❌ Escritura directa prohibida

🚫 **NO se debe hacer `INSERT`, `UPDATE`, `DELETE` directamente desde los microservicios.**

En su lugar, se debe usar la cola Redis `sqlite_write_queue`.

---

## ✅ Ejemplo básico de escritura

```ts
await redis.rPush('sqlite_write_queue', JSON.stringify({
   sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
   params: [username, email, hash]
}));
```

---

## 🧪 Ejemplo completo de escritura

```ts
import redis from './redis-client'; 

await redis.rPush('sqlite_write_queue', JSON.stringify({
   sql: 'UPDATE games SET score1 = ? WHERE id = ?',
   params: [newScore, gameId]
}));
```

---

## 🔌 redis-client.ts

Este cliente debe estar presente en tu microservicio para poder escribir correctamente en la cola:

```ts
import { createClient } from 'redis';

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://default@redis:6379'
});

redis.on('error', err => console.error('Redis error:', err));
redis.connect();

export default redis;
```
