import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const logFilePath = path.join(dataDir, 'activity.log');

/**
 * Registra una acción de auditoría con fecha y hora local e ISO.
 * @param {string} action - Nombre o categoría de la acción (ej: 'CREAR_VEHICULO')
 * @param {string} message - Descripción detallada del cambio
 */
export function logActivity(action, message) {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const logLine = `[${dateStr}] [${action}] ${message}\n`;

  try {
    fs.appendFileSync(logFilePath, logLine, 'utf-8');
  } catch (err) {
    console.error('❌ Error escribiendo en activity.log:', err.message);
  }
}

/**
 * Obtiene las líneas más recientes del archivo de log local.
 * @param {number} limit - Número máximo de líneas a retornar
 */
export function getActivityLogs(limit = 100) {
  if (!fs.existsSync(logFilePath)) {
    return [];
  }
  const content = fs.readFileSync(logFilePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  return lines.slice(-limit).reverse();
}
