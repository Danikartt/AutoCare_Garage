import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MaintenanceService } from './services/maintenanceService.js';
import { initDatabase, dbFilePath } from './data/db.js';
import { getActivityLogs, logActivity } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoints Async Wrappers
app.get('/api/v1/service-types', async (req, res) => {
  try {
    const types = await MaintenanceService.getServiceTypes();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/summary', async (req, res) => {
  try {
    const summary = await MaintenanceService.getGarageSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/vehicles', async (req, res) => {
  try {
    const vehicles = await MaintenanceService.getAllVehicles();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/vehicles', async (req, res) => {
  try {
    const vehicle = await MaintenanceService.createVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.get('/api/v1/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await MaintenanceService.getVehicleById(req.params.id);
    res.json(vehicle);
  } catch (err) {
    res.status(err.statusCode || 404).json({ error: err.message });
  }
});

app.patch('/api/v1/vehicles/:id/mileage', async (req, res) => {
  try {
    const updated = await MaintenanceService.updateVehicleMileage(req.params.id, req.body.currentMileage);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.patch('/api/v1/vehicles/:id/itv', async (req, res) => {
  try {
    const updated = await MaintenanceService.updateVehicleItvDate(req.params.id, req.body.itvExpirationDate);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.get('/api/v1/logs', async (req, res) => {
  try {
    const logs = await MaintenanceService.getAllServiceLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/vehicles/:id/services', async (req, res) => {
  try {
    const services = await MaintenanceService.getVehicleServiceLogs(req.params.id);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/vehicles/:id/services', async (req, res) => {
  try {
    const log = await MaintenanceService.addServiceLog(req.params.id, req.body);
    res.status(201).json(log);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.get('/api/v1/vehicles/:id/alerts', async (req, res) => {
  try {
    const alerts = await MaintenanceService.getVehicleAlerts(req.params.id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/logs/:logId', async (req, res) => {
  try {
    const result = await MaintenanceService.updateServiceLog(req.params.logId, req.body);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.delete('/api/v1/logs/:logId', async (req, res) => {
  try {
    const result = await MaintenanceService.deleteServiceLog(req.params.logId);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.delete('/api/v1/vehicles/:id', async (req, res) => {
  try {
    const result = await MaintenanceService.deleteVehicle(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.delete('/api/v1/reset', async (req, res) => {
  // Requiere frase de confirmación explícita para evitar borrados accidentales
  if (req.body?.confirmPhrase !== 'BORRAR_TODO') {
    return res.status(400).json({
      error: 'Frase de confirmación requerida. Envía { "confirmPhrase": "BORRAR_TODO" } en el body.'
    });
  }
  try {
    const result = await MaintenanceService.resetDatabase();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/activity-logs', (req, res) => {
  try {
    const logs = getActivityLogs(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicializar la base de datos real en archivo local antes de iniciar el servidor
await initDatabase();

const server = app.listen(PORT, () => {
  console.log(`🚗 AutoCare Garage Servidor iniciado con éxito!`);
  console.log(`🗄️ Base de datos guardada permanentemente en: ${dbFilePath}`);
  console.log(`👉 Aplicación disponible en: http://localhost:${PORT}`);
  logActivity('INICIO_APP', `Servidor iniciado con éxito en http://localhost:${PORT}`);
});

let isShuttingDown = false;
const handleShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logActivity('FIN_APP', `Servidor detenido (${signal})`);
  server.close(() => {
    process.exit(0);
  });
  // Si el servidor HTTP no se cierra inmediatamente, forzar cierre limpio
  setTimeout(() => process.exit(0), 500);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGHUP', () => handleShutdown('SIGHUP'));
