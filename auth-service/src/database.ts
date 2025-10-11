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
