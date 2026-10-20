import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar que la carpeta 'data/' exista
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ruta del archivo real de base de datos local (.db)
export const dbFilePath = path.join(dataDir, 'autocare_garage.db');

// Permite inyectar :memory: en tests mediante la variable de entorno DB_PATH
const resolvedDbPath = process.env.DB_PATH || dbFilePath;

const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(resolvedDbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos SQLite:', err.message);
  } else {
    console.log(`🗄️ Base de datos conectada: ${resolvedDbPath}`);
  }
});

// Helper de promesas para consultas SQL
export function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function queryRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Inicialización de Tablas en el archivo local
export async function initDatabase() {
  await queryRun(`
    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interval_km INTEGER NOT NULL,
      interval_months INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL
    );
  `);

  // Migración: añadir interval_months si la tabla ya existía sin ella
  try {
    await queryRun(`ALTER TABLE service_types ADD COLUMN interval_months INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {
    // La columna ya existe, continuar normalmente
  }

  await queryRun(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      license_plate TEXT UNIQUE NOT NULL,
      current_mileage INTEGER NOT NULL,
      fuel_type TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      itv_expiration_date TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Intentar migrar la columna si la base de datos ya existía sin ella
  try {
    await queryRun(`ALTER TABLE vehicles ADD COLUMN itv_expiration_date TEXT;`);
  } catch (e) {
    // La columna ya existe, continuar normalmente
  }

  await queryRun(`
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      service_type_id TEXT NOT NULL,
      service_date TEXT NOT NULL,
      mileage_at_service INTEGER NOT NULL,
      cost_eur REAL NOT NULL,
      workshop_name TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (service_type_id) REFERENCES service_types(id)
    );
  `);

  // Tipos de mantenimiento actualizados (se sincronizan si hay cambios)
  // [id, name, interval_km, interval_months, category]
  const currentTypes = [
    ['OIL_CHANGE',     'Cambio de Aceite & Filtro',    15000, 12, 'MOTOR'],
    ['CABIN_FILTER',   'Filtro de Habitáculo (Polen)', 15000, 12, 'MOTOR'],
    ['AIR_FILTER',     'Filtro de Aire del Motor',     20000, 24, 'MOTOR'],
    ['FUEL_FILTER',    'Filtro de Combustible',        40000, 24, 'MOTOR'],
    ['BRAKES',         'Pastillas / Discos de Freno',  25000,  0, 'SEGURIDAD'],
    ['ITV_INSPECTION', 'Inspección Técnica (ITV)',         0,  0, 'DOCUMENTACION'],
    ['OTHER',          'Otros Servicios',                  0,  0, 'GENERAL']
  ];

  for (const [id, name, interval_km, interval_months, category] of currentTypes) {
    await queryRun(
      `INSERT INTO service_types (id, name, interval_km, interval_months, category)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         interval_km=excluded.interval_km,
         interval_months=excluded.interval_months,
         category=excluded.category`,
      [id, name, interval_km, interval_months, category]
    );
  }

  // Eliminar tipos que ya no existen en la lista oficial
  const activeIds = currentTypes.map(t => `'${t[0]}'`).join(',');
  await queryRun(`DELETE FROM service_types WHERE id NOT IN (${activeIds})`);
}
